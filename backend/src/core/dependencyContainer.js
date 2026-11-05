// backend/src/core/dependencyContainer.js
// Contenedor de dependencias - Gestión centralizada del ciclo de vida de servicios

import { logger } from './logger.js';
import { eventBus } from './eventBus.js';
import { toolRegistry } from './toolRegistry.js';
import { taskManager } from './taskManager.js';

/**
 * Dependency Container - Inyección de dependencias y gestión de servicios
 * 
 * Uso:
 *   const container = new DependencyContainer();
 *   container.register('memoryService', MemoryService);
 *   container.register('longTermMemoryService', LongTermMemoryService);
 *   await container.initializeAll();
 *   const memory = container.get('memoryService');
 */
export class DependencyContainer {
  constructor() {
    this.services = new Map();
    this.instances = new Map();
    this.initialized = false;
    this.initializationOrder = [];
  }

  /**
   * Registra un servicio (clase o factory)
   * @param {string} name - Nombre del servicio
   * @param {Function|Object} definition - Clase o factory que crea el servicio
   * @param {Object} [options] - Opciones
   * @param {Array} [options.dependencies] - Nombres de servicios dependientes
   * @param {boolean} [options.singleton] - Si es singleton (por defecto true)
   * @param {number} [options.priority] - Prioridad de inicialización (menor = antes)
   */
  register(name, definition, options = {}) {
    if (this.services.has(name)) {
      logger.warn(`[DependencyContainer] Sobrescribiendo servicio: ${name}`);
    }

    const serviceDef = {
      name,
      definition,
      dependencies: options.dependencies || [],
      singleton: options.singleton !== false,
      priority: options.priority || 100,
      instance: null,
      initialized: false,
    };

    this.services.set(name, serviceDef);
    logger.debug(`[DependencyContainer] Servicio registrado: ${name}`, {
      dependencies: serviceDef.dependencies,
      priority: serviceDef.priority,
    });

    return this;
  }

  /**
   * Obtiene una instancia de un servicio
   * @param {string} name - Nombre del servicio
   * @returns {*} Instancia del servicio
   */
  get(name) {
    if (!this.services.has(name)) {
      throw new Error(`Servicio no registrado: ${name}`);
    }

    const def = this.services.get(name);

    // Si es singleton y ya tiene instancia, devolverla
    if (def.singleton && def.instance !== null) {
      return def.instance;
    }

    // Si no está inicializado, inicializar ahora
    if (!def.initialized) {
      this._initializeService(name);
    }

    return def.instance;
  }

  /**
   * Inicializa todos los servicios registrados
   * @param {Object} [options] - Opciones
   * @param {boolean} [options.force] - Forzar reinicialización
   * @returns {Promise<void>}
   */
  async initializeAll(options = {}) {
    if (this.initialized && !options.force) {
      logger.info('[DependencyContainer] Ya inicializado, omitiendo...');
      return;
    }

    logger.info('[DependencyContainer] Inicializando todos los servicios...');

    // Ordenar por prioridad
    const sorted = Array.from(this.services.entries())
      .sort((a, b) => a[1].priority - b[1].priority);

    for (const [name, def] of sorted) {
      // Verificar dependencias primero
      for (const depName of def.dependencies) {
        if (!this.services.has(depName)) {
          logger.warn(`[DependencyContainer] Dependencia no encontrada: ${depName} para ${name}`);
        }
      }

      try {
        await this._initializeService(name);
        logger.debug(`[DependencyContainer] Servicio inicializado: ${name}`);
      } catch (error) {
        logger.error(`[DependencyContainer] Error inicializando servicio: ${name}`, {
          error: error.message,
          stack: error.stack,
        });
        throw error;
      }
    }

    this.initialized = true;
    logger.info(`[DependencyContainer] Todos los servicios inicializados (${this.services.size})`);
  }

  /**
   * Inicializa un servicio específico
   * @param {string} name - Nombre del servicio
   * @returns {Promise<*>} Instancia del servicio
   * @private
   */
  async _initializeService(name) {
    const def = this.services.get(name);
    if (!def) {
      throw new Error(`Servicio no registrado: ${name}`);
    }

    if (def.initialized) {
      return def.instance;
    }

    // Si tiene dependencias, asegurarse de que estén inicializadas
    for (const depName of def.dependencies) {
      if (this.services.has(depName)) {
        await this._initializeService(depName);
      }
    }

    let instance;

    try {
      if (typeof def.definition === 'function') {
        // Si es una clase, instanciar
        if (def.definition.prototype && typeof def.definition.prototype.initialize === 'function') {
          // Es una clase con método initialize
          const deps = {};
          for (const depName of def.dependencies) {
            deps[depName] = this.get(depName);
          }
          instance = new def.definition(deps);
          if (typeof instance.initialize === 'function') {
            await instance.initialize();
          }
        } else {
          // Es una factory function
          const deps = {};
          for (const depName of def.dependencies) {
            deps[depName] = this.get(depName);
          }
          instance = await def.definition(deps);
        }
      } else {
        // Es un objeto directamente
        instance = def.definition;
        if (typeof instance.initialize === 'function') {
          await instance.initialize();
        }
      }
    } catch (error) {
      logger.error(`[DependencyContainer] Error creando instancia de ${name}`, {
        error: error.message,
      });
      throw error;
    }

    def.instance = instance;
    def.initialized = true;
    this.instances.set(name, instance);

    return instance;
  }

  /**
   * Cierra un servicio (shutdown)
   * @param {string} name - Nombre del servicio
   * @returns {Promise<void>}
   */
  async shutdown(name) {
    const def = this.services.get(name);
    if (!def || !def.initialized) return;

    const instance = def.instance;
    if (instance && typeof instance.shutdown === 'function') {
      try {
        await instance.shutdown();
        logger.debug(`[DependencyContainer] Servicio apagado: ${name}`);
      } catch (error) {
        logger.error(`[DependencyContainer] Error apagando servicio: ${name}`, {
          error: error.message,
        });
      }
    }

    def.initialized = false;
    def.instance = null;
    this.instances.delete(name);
  }

  /**
   * Apaga todos los servicios (orden inverso)
   * @returns {Promise<void>}
   */
  async shutdownAll() {
    logger.info('[DependencyContainer] Apagando todos los servicios...');

    const sorted = Array.from(this.services.entries())
      .sort((a, b) => b[1].priority - a[1].priority);

    for (const [name] of sorted) {
      await this.shutdown(name);
    }

    this.initialized = false;
    logger.info('[DependencyContainer] Todos los servicios apagados');
  }

  /**
   * Obtiene el estado del contenedor
   */
  getStatus() {
    const services = Array.from(this.services.values()).map(def => ({
      name: def.name,
      initialized: def.initialized,
      singleton: def.singleton,
      dependencies: def.dependencies,
      priority: def.priority,
    }));

    return {
      status: this.initialized ? 'online' : 'initializing',
      totalServices: this.services.size,
      initializedServices: this.instances.size,
      services,
    };
  }

  /**
   * Obtiene las métricas del contenedor
   */
  getMetrics() {
    return {
      totalServices: this.services.size,
      initializedServices: this.instances.size,
      services: Array.from(this.services.keys()),
    };
  }
}

// Instancia global (para usar como singleton si se prefiere)
export const container = new DependencyContainer();

// Registrar servicios core por defecto
container.register('eventBus', eventBus, { priority: 0 });
container.register('toolRegistry', toolRegistry, { priority: 0 });
container.register('taskManager', taskManager, { priority: 0 });

export default container;