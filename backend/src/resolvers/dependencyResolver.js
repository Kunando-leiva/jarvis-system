// backend/src/resolvers/dependencyResolver.js
// 🔗 DEPENDENCY RESOLVER - Análisis de dependencias entre componentes
// 🔒 RESPONSABILIDAD: Gestionar el grafo de dependencias

import { createSuccessResponse, createErrorResponse } from './responseContract.js';
import { logger } from '../core/logger.js';

export class DependencyResolver {
  /**
   * ⭐ CORREGIDO: Recibe KnowledgeService, no PublicContractService
   * @param {KnowledgeService} knowledgeService - Fuente única de verdad
   */
  constructor(knowledgeService) {
    this.knowledge = knowledgeService;
    this.cache = new Map();
    this._graph = null;
    this._graphInitialized = false;
    this._dependentsMap = null;
    this._dependenciesMap = null;
  }

  /**
   * Inicializa el grafo de dependencias
   */
  initialize() {
    try {
      this._buildGraph();
      this._graphInitialized = true;
      logger.info('[DependencyResolver] Inicializado correctamente');
      return true;
    } catch (error) {
      logger.error('[DependencyResolver] Error al inicializar:', error);
      return false;
    }
  }

  /**
   * Construye el grafo de dependencias desde KnowledgeService
   */
  _buildGraph() {
    const components = this.knowledge.getAllComponents();
    
    this._dependenciesMap = new Map();
    this._dependentsMap = new Map();
    
    for (const component of components) {
      const name = component.name;
      const deps = component.dependencies || [];
      
      this._dependenciesMap.set(name, deps);
      
      for (const dep of deps) {
        if (!this._dependentsMap.has(dep)) {
          this._dependentsMap.set(dep, []);
        }
        if (!this._dependentsMap.get(dep).includes(name)) {
          this._dependentsMap.get(dep).push(name);
        }
      }
    }
    
    for (const component of components) {
      if (!this._dependentsMap.has(component.name)) {
        this._dependentsMap.set(component.name, []);
      }
    }
    
    this._graph = {
      dependencies: this._dependenciesMap,
      dependents: this._dependentsMap
    };
    
    logger.debug('[DependencyResolver] Grafo construido', {
      components: components.length,
      dependencies: this._dependenciesMap.size,
      dependents: this._dependentsMap.size
    });
  }

  /**
   * Asegura que el grafo esté construido
   */
  _ensureGraph() {
    if (!this._graphInitialized || this._graph === null) {
      this._buildGraph();
      this._graphInitialized = true;
    }
    return this._graph;
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Encuentra dependientes (quién usa a X)
   */
  findDependents(componentName) {
    try {
      this._ensureGraph();
      
      const cacheKey = `dependents_${componentName}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        // ✅ Verificar que el caché no sea undefined
        if (cached && cached.success !== undefined) {
          return cached;
        }
        // Si el caché está corrupto, eliminarlo y recalcular
        this.cache.delete(cacheKey);
      }

      logger.debug(`[DependencyResolver] Buscando dependientes de "${componentName}"`);

      const components = this.knowledge.getAllComponents();
      const exists = components.some(c => c.name === componentName);
      
      if (!exists) {
        const errorResult = createErrorResponse(
          componentName,
          `No se encontró el componente "${componentName}"`,
          { resolver: 'dependencyResolver', operation: 'findDependents' }
        );
        this.cache.set(cacheKey, errorResult);
        return errorResult;
      }

      const dependents = this._dependentsMap.get(componentName) || [];
      
      const result = {
        dependents: [...dependents],
        count: dependents.length,
        summary: dependents.length === 0
          ? `Ningún componente depende de "${componentName}"`
          : `"${componentName}" es usado por ${dependents.length} componente(s)`
      };

      const response = createSuccessResponse(
        componentName,
        result,
        { resolver: 'dependencyResolver', operation: 'findDependents' }
      );
      
      this.cache.set(cacheKey, response);
      return response;
    } catch (error) {
      const errorResult = createErrorResponse(
        componentName,
        error.message,
        { resolver: 'dependencyResolver', operation: 'findDependents' }
      );
      this.cache.set(`dependents_${componentName}`, errorResult);
      return errorResult;
    }
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Encuentra dependencias (de qué depende X)
   */
  findDependencies(componentName) {
    try {
      this._ensureGraph();
      
      const cacheKey = `dependencies_${componentName}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (cached && cached.success !== undefined) {
          return cached;
        }
        this.cache.delete(cacheKey);
      }

      logger.debug(`[DependencyResolver] Buscando dependencias de "${componentName}"`);

      const components = this.knowledge.getAllComponents();
      const exists = components.some(c => c.name === componentName);
      
      if (!exists) {
        const errorResult = createErrorResponse(
          componentName,
          `No se encontró el componente "${componentName}"`,
          { resolver: 'dependencyResolver', operation: 'findDependencies' }
        );
        this.cache.set(cacheKey, errorResult);
        return errorResult;
      }

      const deps = this._dependenciesMap.get(componentName) || [];
      
      const internal = [];
      const external = [];
      const node = [];

      for (const dep of deps) {
        const isInternal = components.some(c => c.name === dep);
        if (isInternal) {
          internal.push(dep);
        } else if (dep.startsWith('node:') || ['fs', 'path', 'os', 'http', 'https', 'crypto', 'stream', 'events', 'util'].includes(dep)) {
          node.push(dep);
        } else {
          external.push(dep);
        }
      }

      const result = {
        dependencies: {
          internal,
          external,
          node
        },
        total: deps.length,
        summary: deps.length === 0
          ? `"${componentName}" no tiene dependencias`
          : `"${componentName}" tiene ${deps.length} dependencias (${internal.length} internas, ${external.length} externas, ${node.length} Node.js)`
      };

      const response = createSuccessResponse(
        componentName,
        result,
        { resolver: 'dependencyResolver', operation: 'findDependencies' }
      );
      
      this.cache.set(cacheKey, response);
      return response;
    } catch (error) {
      const errorResult = createErrorResponse(
        componentName,
        error.message,
        { resolver: 'dependencyResolver', operation: 'findDependencies' }
      );
      this.cache.set(`dependencies_${componentName}`, errorResult);
      return errorResult;
    }
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Encuentra dependencias circulares
   */
  findCircularDependencies() {
    try {
      this._ensureGraph();
      
      const cacheKey = 'circular_dependencies';
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (cached && cached.success !== undefined) {
          return cached;
        }
        this.cache.delete(cacheKey);
      }

      logger.debug('[DependencyResolver] Buscando dependencias circulares');

      const visited = new Set();
      const recursionStack = new Set();
      const cycles = [];

      const components = this.knowledge.getAllComponents();
      const componentNames = components.map(c => c.name);

      const dfs = (node, path) => {
        if (recursionStack.has(node)) {
          const cycleStart = path.indexOf(node);
          const cycle = path.slice(cycleStart);
          cycles.push(cycle);
          return;
        }

        if (visited.has(node)) return;

        visited.add(node);
        recursionStack.add(node);

        const deps = this._dependenciesMap.get(node) || [];
        for (const dep of deps) {
          if (componentNames.includes(dep)) {
            dfs(dep, [...path, dep]);
          }
        }

        recursionStack.delete(node);
      };

      for (const name of componentNames) {
        if (!visited.has(name)) {
          dfs(name, [name]);
        }
      }

      const result = {
        hasCycles: cycles.length > 0,
        cycles: cycles,
        count: cycles.length
      };

      const response = createSuccessResponse(
        null,
        result,
        { resolver: 'dependencyResolver', operation: 'findCircularDependencies' }
      );
      
      this.cache.set(cacheKey, response);
      return response;
    } catch (error) {
      return createErrorResponse(
        null,
        error.message,
        { resolver: 'dependencyResolver', operation: 'findCircularDependencies' }
      );
    }
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Encuentra componentes aislados (sin dependencias)
   */
  findIsolatedComponents() {
    try {
      this._ensureGraph();
      
      const cacheKey = 'isolated_components';
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (cached && cached.success !== undefined) {
          return cached;
        }
        this.cache.delete(cacheKey);
      }

      logger.debug('[DependencyResolver] Buscando componentes aislados');

      const components = this.knowledge.getAllComponents();
      const isolated = [];

      for (const component of components) {
        const name = component.name;
        const deps = this._dependenciesMap.get(name) || [];
        const dependents = this._dependentsMap.get(name) || [];
        
        if (deps.length === 0 && dependents.length === 0) {
          isolated.push(name);
        }
      }

      const result = {
        isolated: isolated,
        count: isolated.length,
        summary: isolated.length === 0
          ? 'No hay componentes aislados'
          : `${isolated.length} componente(s) aislado(s): ${isolated.join(', ')}`
      };

      const response = createSuccessResponse(
        null,
        result,
        { resolver: 'dependencyResolver', operation: 'findIsolatedComponents' }
      );
      
      this.cache.set(cacheKey, response);
      return response;
    } catch (error) {
      return createErrorResponse(
        null,
        error.message,
        { resolver: 'dependencyResolver', operation: 'findIsolatedComponents' }
      );
    }
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Obtiene el grafo completo de dependencias
   */
  getDependencyGraph() {
    this._ensureGraph();
    return this._graph;
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Limpia la caché
   */
  clearCache() {
    this.cache.clear();
    this._graph = null;
    this._graphInitialized = false;
    this._dependenciesMap = null;
    this._dependentsMap = null;
    logger.info('[DependencyResolver] Caché limpiada');
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Obtiene el estado del resolver
   */
  getStatus() {
    return {
      name: 'DependencyResolver',
      initialized: this._graphInitialized,
      cacheSize: this.cache.size,
      components: this.knowledge.getAllComponents().length
    };
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Apaga el resolver
   */
  async shutdown() {
    this.clearCache();
    logger.info('[DependencyResolver] Apagado correctamente');
    return true;
  }
}