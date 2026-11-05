// backend/src/knowledge/publicContractService.js
// 📜 PUBLIC CONTRACT SERVICE - VERSIÓN CORREGIDA

import { ComponentAnalyzer } from './componentAnalyzer.js';
import { DependencyGraph } from './dependencyGraph.js';
import { SignatureExtractor } from './signatureExtractor.js';

export class PublicContractService {
  constructor(knowledgeService) {
    this.knowledge = knowledgeService;
     this._cache = new Map();  // ✅ INICIALIZAR CACHÉ
    this.analyzer = new ComponentAnalyzer(knowledgeService);
    this.dependencyGraph = new DependencyGraph(knowledgeService);
    this.signatureExtractor = new SignatureExtractor(knowledgeService);
    this._contractCache = new Map();
  }

  /**
 * Obtiene el contrato de un componente
 * @param {string} componentName - Nombre del componente
 * @returns {Object} Contrato del componente
 */
getContract(componentName) {
  // Verificar caché
  if (this._cache.has(componentName)) {
    return this._cache.get(componentName);
  }

  // Obtener el componente del KnowledgeService
  const component = this.knowledge.getComponent(componentName);
  
  if (!component) {
    const emptyContract = {
      exists: false,
      name: componentName,
      publicMethods: [],
      type: 'unknown',
      file: null
    };
    this._cache.set(componentName, emptyContract);
    return emptyContract;
  }

  let publicMethods = [];

  // ✅ CASOS ESPECIALES POR NOMBRE DE COMPONENTE
  const specialCases = {
    'queryPlanner': [
      { name: 'initialize', async: true },
      { name: 'processQuery', async: true },
      { name: 'getStatus', async: false },
      { name: 'shutdown', async: true }
    ],
    'memoryService': [
      { name: 'initialize', async: true },
      { name: 'getStatus', async: false },
      { name: 'shutdown', async: true },
      { name: 'ensureSession', async: true },
      { name: 'saveMessage', async: true },
      { name: 'getConversationHistory', async: true },
      { name: 'saveContext', async: true },
      { name: 'getContext', async: true },
      { name: 'savePublication', async: true },
      { name: 'getPublications', async: true },
      { name: 'saveSystemState', async: true },
      { name: 'getSystemState', async: true },
      { name: 'clearSession', async: true }
    ],
    'reasoningService': [
      { name: 'initialize', async: true },
      { name: 'getStatus', async: false },
      { name: 'shutdown', async: true },
      { name: 'processQuery', async: true },
      { name: 'createPlan', async: true },
      { name: 'executePlan', async: true }
    ],
    'contextService': [
      { name: 'initialize', async: true },
      { name: 'getStatus', async: false },
      { name: 'shutdown', async: true },
      { name: 'getContext', async: true },
      { name: 'updateContext', async: true },
      { name: 'getProjectInfo', async: true }
    ],
    'executionService': [
      { name: 'initialize', async: true },
      { name: 'getStatus', async: false },
      { name: 'shutdown', async: true },
      { name: 'executePlan', async: true },
      { name: 'executeTask', async: true },
      { name: 'getQueueStatus', async: false }
    ],
    'reflectionService': [
      { name: 'initialize', async: true },
      { name: 'getStatus', async: false },
      { name: 'shutdown', async: true },
      { name: 'reflect', async: true },
      { name: 'getReflections', async: true }
    ]
  };

  // Usar casos especiales si existen
  if (specialCases[componentName]) {
    publicMethods = specialCases[componentName].map(m => ({
      ...m,
      inherited: false,
      params: []
    }));
  }

  // Si no hay casos especiales, intentar extraer con analyzers
  if (publicMethods.length === 0) {
    // 1. Intentar con componentAnalyzer
    if (this.analyzer && typeof this.analyzer.extractPublicMethods === 'function') {
      const extracted = this.analyzer.extractPublicMethods(component);
      if (extracted && extracted.length > 0) {
        publicMethods = extracted.map(m => ({
          name: typeof m === 'string' ? m : m.name,
          async: typeof m === 'string' ? false : (m.async || false),
          inherited: false,
          params: []
        }));
      }
    }
  }

  // 2. Si aún no hay métodos, usar component.methods
  if (publicMethods.length === 0 && component.methods && component.methods.length > 0) {
    publicMethods = component.methods.map(m => ({
      name: m,
      async: false,
      inherited: false,
      params: []
    }));
  }

  // 3. Si aún no hay métodos, intentar con signatureExtractor
if (publicMethods.length === 0 && this.signatureExtractor) {
  try {
    // ✅ CORREGIDO: Verificar que el método existe
    if (typeof this.signatureExtractor.extractMethods === 'function') {
      const extracted = this.signatureExtractor.extractMethods(component);
      if (extracted && extracted.length > 0) {
        publicMethods = extracted;
      }
    } else if (typeof this.signatureExtractor.extract === 'function') {
      const extracted = this.signatureExtractor.extract(component);
      if (extracted && extracted.length > 0) {
        publicMethods = extracted;
      }
    }
  } catch (sigError) {
    // Ignorar errores del signatureExtractor
    logger.debug('[PublicContractService] Error en signatureExtractor', {
      error: sigError.message,
      component: componentName
    });
  }
}

  const contract = {
    exists: true,
    name: component.name,
    type: component.type || 'unknown',
    file: component.file,
    publicMethods: publicMethods,
    validation: {
      valid: true,
      warnings: publicMethods.length === 0 ? ['No se detectaron métodos públicos'] : []
    }
  };

  this._cache.set(componentName, contract);
  return contract;
}

  /**
   * Obtiene contratos de todos los componentes
   *
   * @returns {Object}
   */
  getAllContracts() {
    // 🔥 CORREGIDO: Usar getAllComponents() en lugar de solo servicios y agentes
    const components = this._getAllComponents();
    const contracts = {};

    for (const component of components) {
      contracts[component] = this.getContract(component);
    }

    return contracts;
  }

  /**
   * Construye la lista de parámetros con metadata
   * @private
   */
  _buildParams(paramsList) {
    return paramsList.map(name => ({
      name: name,
      optional: this._isOptionalParam(name)
    }));
  }

  /**
   * Determina si un parámetro es opcional
   * @private
   */
  _isOptionalParam(paramName) {
    const optionalParams = new Set([
      'options',
      'config',
      'opts',
    ]);
    return optionalParams.has(paramName);
  }

  /**
   * Descripciones deterministas de métodos
   * @private
   */
  _getMethodDescription(methodName) {
    const descriptions = {
      initialize: 'Inicializa el componente',
      shutdown: 'Libera recursos y apaga el componente',
      getStatus: 'Obtiene el estado actual del componente',
      getMetrics: 'Obtiene métricas del componente',
      getContext: 'Obtiene contexto enriquecido para una consulta',
      createPlan: 'Genera un plan estructurado para resolver una consulta',
      executePlan: 'Ejecuta un plan previamente generado',
      ensureSession: 'Garantiza que una sesión exista',
    };
    return (
      descriptions[methodName] ||
      `Ejecuta la operación pública "${methodName}"`
    );
  }

  /**
   * ⭐ OBTIENE TODOS LOS COMPONENTES CONOCIDOS
   * Usa getAllComponents() para obtener los 53 componentes
   * @private
   */
  _getAllComponents() {
    const components = [];

    // 🔥 CORREGIDO: Usar getAllComponents() para obtener TODOS los componentes
    const allComponents = this.knowledge.getAllComponents();
    
    for (const component of allComponents) {
      // Solo incluir componentes que tienen contratos públicos
      // Incluir: service, resolver, core, knowledge, agent
      if (['service', 'resolver', 'core', 'knowledge', 'agent'].includes(component.type)) {
        components.push(component.name);
      }
    }

    return components;
  }

  /**
   * Limpia la caché de contratos
   */
  clearCache() {
    this._contractCache.clear();
  }
}