// backend/src/core/serviceInterface.js
// Interfaz base para todos los servicios del sistema
// Todos los servicios deben implementar estos métodos públicos

import { logger } from './logger.js';
import { eventBus } from './eventBus.js';

/**
 * BaseService - Clase base para todos los servicios
 * Todos los servicios deben extender esta clase
 * 
 * 🔒 PRINCIPIO: Solo métodos públicos. Ningún servicio debe acceder
 * a métodos privados de otro servicio (prefijo _).
 */
export class BaseService {
  constructor(config = {}) {
    this.name = config.name || this.constructor.name || 'Service';
    this.status = 'initializing';
    this.initialized = false;
    this.config = config;
    this.startTime = new Date();
    this.metrics = {
      calls: 0,
      errors: 0,
      totalDuration: 0,
    };
  }

  /**
   * Inicializa el servicio
   * Debe ser sobreescrito por cada servicio
   * @returns {Promise<boolean>}
   */
  async initialize() {
    this.status = 'online';
    this.initialized = true;
    logger.info(`[${this.name}] Inicializado`);
    return true;
  }

  /**
   * Obtiene el estado del servicio
   * @returns {Object}
   */
  getStatus() {
    return {
      name: this.name,
      status: this.status,
      initialized: this.initialized,
      uptime: Date.now() - this.startTime.getTime(),
      metrics: this.getMetrics(),
    };
  }

  /**
   * Obtiene métricas del servicio
   * @returns {Object}
   */
  getMetrics() {
    return {
      ...this.metrics,
      calls: this.metrics.calls || 0,
      errors: this.metrics.errors || 0,
      avgDuration: this.metrics.calls > 0 
        ? Math.round(this.metrics.totalDuration / this.metrics.calls) 
        : 0,
    };
  }

  /**
   * Apaga el servicio
   * Debe ser sobreescrito si se necesita cleanup
   * @returns {Promise<boolean>}
   */
  async shutdown() {
    this.status = 'offline';
    this.initialized = false;
    logger.info(`[${this.name}] Apagado`);
    return true;
  }

  /**
   * Wrapper para ejecutar métodos con medición de tiempo y logging
   * @param {string} methodName - Nombre del método
   * @param {Function} fn - Función a ejecutar
   * @param {Object} context - Contexto para logging
   * @returns {Promise<*>}
   * @protected
   */
  async _measure(methodName, fn, context = {}) {
    const start = Date.now();
    this.metrics.calls = (this.metrics.calls || 0) + 1;

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.metrics.totalDuration = (this.metrics.totalDuration || 0) + duration;
      
      logger.debug(`[${this.name}] ${methodName} completado`, {
        duration,
        ...context,
      });
      
      return result;
    } catch (error) {
      this.metrics.errors = (this.metrics.errors || 0) + 1;
      
      logger.error(`[${this.name}] ${methodName} falló`, {
        error: error.message,
        ...context,
      });
      
      throw error;
    }
  }

  /**
   * Emite un evento
   * @param {string} event - Nombre del evento
   * @param {*} payload - Datos del evento
   * @protected
   */
  _emit(event, payload) {
    eventBus.emit(`${this.name.toLowerCase()}:${event}`, payload);
  }
}

export default BaseService;