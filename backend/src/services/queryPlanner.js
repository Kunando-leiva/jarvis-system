// backend/src/services/queryPlanner.js
// 🧠 QUERY PLANNER - VERSIÓN SIN HARDCODE

import { logger } from '../core/logger.js';
import { BaseService } from '../core/serviceInterface.js';
import { createSuccessResponse, createErrorResponse, createMethodSuccessResponse } from '../resolvers/responseContract.js';

export class QueryPlanner extends BaseService {
  constructor({
    knowledgeService,
    knowledgeQueryService,
    dependencyResolver,
    methodResolver,
    impactResolver,
    contractService
  }) {
    super();
    this.name = 'QueryPlanner';
    this.knowledgeService = knowledgeService;
    this.knowledgeQuery = knowledgeQueryService;
    this.dependencyResolver = dependencyResolver;
    this.methodResolver = methodResolver;
    this.impactResolver = impactResolver;
    this.contractService = contractService;
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
    this.status = 'online';
    logger.info('[QueryPlanner] Inicializado');
    return true;
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Procesa una consulta compleja
   */
  async processQuery(query) {
    const normalized = query.toLowerCase().trim();
    
    logger.debug('[QueryPlanner] Procesando consulta', { query: normalized });

    const intent = this._classifyIntent(normalized);
    const entities = this._extractEntities(normalized);
    const result = await this._dispatch(intent, entities);
    const response = this._formatResponse(intent, result, entities);

    return {
      query,
      intent: intent.type,
      entities,
      response,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        resolverUsed: intent.resolver
      }
    };
  }

  // ─── 1. CLASIFICACIÓN DE INTENCIÓN ─────────────────────────

  _classifyIntent(text) {
  const intentPatterns = [
    // ⭐ MÁS ESPECÍFICOS PRIMERO (prioridad alta)
    {
  type: 'isolated_components',
  resolver: 'dependencyResolver',
  patterns: [
    'componentes aislados',
    'componentes sin dependencias',
    'componentes no utilizados',
    'componentes que no dependen',
    'componentes que no son usados',
    'aislados',
    'sin dependencias',
    'no depende de nadie',
    'sin dependientes',
    'componentes aislados del sistema',
    'no tienen dependencias',
    'no son utilizados por otros',
    'no son usados por otros',
    'sin dependencias de otros',
    'no depende de otros',
    'componentes sin dependientes',
    'componentes no usados',
    'componentes que no usan otros'
  ],
  score: 0
},
    {
      type: 'component_count',
      resolver: 'knowledgeQuery',
      patterns: [
        'cuántos servicios',
        'cuántos agentes',
        'cuántos componentes',
        'cuántos',
        'número de',
        'total de'
      ],
      score: 0
    },
    // ⭐ MÉTODOS
    {
      type: 'component_methods',
      resolver: 'knowledgeQuery',
      patterns: ['qué métodos tiene', 'qué funciones tiene', 'qué expone', 'qué api tiene'],
      score: 0
    },
    // ⭐ INFORMACIÓN DE COMPONENTES
    {
      type: 'component_info',
      resolver: 'knowledgeQuery',
      patterns: ['qué es', 'describe', 'información de', 'detalles de', 'qué hace', 'qué hace el componente'],
      score: 0
    },
    // ⭐ DEPENDIENTES
    {
      type: 'dependents',
      resolver: 'dependencyResolver',
      patterns: ['quién usa', 'quién utiliza', 'usado por', 'dependientes de', 'quién depende de'],
      score: 0
    },
    // ⭐ DEPENDENCIAS
    {
      type: 'dependencies',
      resolver: 'dependencyResolver',
      patterns: ['de qué depende', 'dependencias de', 'qué necesita', 'qué imports tiene'],
      score: 0
    },
    // ⭐ BÚSQUEDA DE MÉTODOS
    {
      type: 'method_search',
      resolver: 'methodResolver',
      patterns: ['buscar método', 'encontrar método', 'método que', 'función que', 'buscar función'],
      score: 0
    },
    // ⭐ IMPACTO
    {
      type: 'impact',
      resolver: 'impactResolver',
      patterns: ['impacto de', 'qué pasaría si', 'cambiar', 'modificar', 'eliminar', 'refactorizar'],
      score: 0
    },
    // ⭐ COMPARACIÓN
    {
      type: 'comparison',
      resolver: 'impactResolver',
      patterns: ['comparar', 'diferencia entre', 'vs', 'versus'],
      score: 0
    },
    // ⭐ ARQUITECTURA
    {
      type: 'architecture',
      resolver: 'knowledgeQuery',
      patterns: ['arquitectura', 'estructura', 'visión general', 'resumen', 'panorama', 'estado del sistema'],
      score: 0
    },
    // ⭐ LISTA DE COMPONENTES (menos específico, va después)
    {
      type: 'list_components',
      resolver: 'knowledgeQuery',
      patterns: ['lista de', 'todos los', 'componentes', 'servicios', 'agentes'],
      score: 0
    }
  ];

  let best = { type: 'general', resolver: 'knowledgeQuery', score: 0 };

  for (const intent of intentPatterns) {
    let score = 0;
    for (const pattern of intent.patterns) {
      if (text.includes(pattern)) {
        score += 1;
      }
    }
    if (score > best.score) {
      best = { type: intent.type, resolver: intent.resolver, score };
    }
  }

  // Si no se encontró intención, intentar extraer nombre de componente
  if (best.score === 0) {
    const componentName = this._findComponentName(text);
    if (componentName) {
      if (text.includes('método') || text.includes('función') || text.includes('expone')) {
        return { type: 'component_methods', resolver: 'knowledgeQuery', score: 1 };
      }
      return { type: 'component_info', resolver: 'knowledgeQuery', score: 1 };
    }
  }

  return best;
}

  // ─── 2. EXTRACCIÓN DE ENTIDADES ────────────────────────────

  _extractEntities(text) {
    const entities = {
      components: [],
      methods: [],
      params: []
    };

    const allComponents = this.knowledgeService.getAllComponents();
    const componentNames = allComponents.map(c => c.name);
    
    const textLower = text.toLowerCase();
    for (const name of componentNames) {
      if (textLower.includes(name.toLowerCase())) {
        if (!entities.components.includes(name)) {
          entities.components.push(name);
        }
      }
    }

    if (entities.components.length === 0) {
      const words = text.split(/\s+/);
      for (const word of words) {
        const clean = word.replace(/[^a-zA-Z_$]/g, '');
        if (clean.length > 3) {
          const cleanLower = clean.toLowerCase();
          for (const name of componentNames) {
            if (name.toLowerCase().includes(cleanLower) || 
                cleanLower.includes(name.toLowerCase())) {
              if (!entities.components.includes(name)) {
                entities.components.push(name);
              }
            }
          }
        }
      }
    }

    const methodPatterns = [
      /(?:método|función|method)\s+([a-zA-Z_$][\w$]*)/i,
      /([a-zA-Z_$][\w$]*)\s*(?:\(\)|\()/i
    ];
    
    for (const pattern of methodPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const methodName = match[1];
        if (!componentNames.includes(methodName)) {
          entities.methods.push(methodName);
        }
      }
    }

    if (entities.methods.length === 0 && text.includes('método')) {
      const words = text.split(/\s+/);
      for (const word of words) {
        if (word.startsWith('get') || word.startsWith('set') || 
            word.startsWith('create') || word.startsWith('save') ||
            word.startsWith('find') || word.startsWith('update') ||
            word.startsWith('delete')) {
          const clean = word.replace(/[^a-zA-Z_$]/g, '');
          if (clean.length > 2 && !componentNames.includes(clean)) {
            entities.methods.push(clean);
          }
        }
      }
    }

    const paramMatch = text.match(/parámetro\s+([a-zA-Z_$][\w$]*)/i);
    if (paramMatch) {
      entities.params.push(paramMatch[1]);
    }

    return entities;
  }

  // ─── 3. DESPACHO AL RESOLVER ───────────────────────────────

  async _dispatch(intent, entities) {
    try {
      let result;
      
      switch (intent.type) {
        case 'component_methods':
          result = await this._handleComponentMethods(entities);
          break;
        case 'component_info':
          result = await this._handleComponentInfo(entities);
          break;
        case 'dependents':
          result = await this._handleDependents(entities);
          break;
        case 'dependencies':
          result = await this._handleDependencies(entities);
          break;
        case 'method_search':
          result = await this._handleMethodSearch(entities);
          break;
        case 'impact':
          result = await this._handleImpact(entities);
          break;
        case 'comparison':
          result = await this._handleComparison(entities);
          break;
        case 'architecture':
          result = await this._handleArchitecture();
          break;
        case 'list_components':
          result = await this._handleListComponents();
          break;
        case 'component_count':
          result = await this._handleComponentCount(entities);
          break;
        case 'isolated_components':
          result = await this._handleIsolatedComponents();
          break;
        default:
          result = this._handleGeneral(entities);
      }
      
      return result;
    } catch (error) {
      return createErrorResponse(
        entities.components?.[0] || null,
        error.message,
        { resolver: 'queryPlanner', intent: intent.type }
      );
    }
  }

  // ─── HANDLERS ESPECÍFICOS ──────────────────────────────────

  async _handleComponentMethods(entities) {
    const component = entities.components[0];
    if (!component) {
      return createErrorResponse(null, 'No se especificó un componente');
    }

    const contract = this.contractService?.getContract(component) || 
                     this.knowledgeQuery?.getContract(component);
    
    if (!contract || !contract.exists) {
      return createErrorResponse(component, `No se encontró el componente "${component}"`);
    }

    const methods = contract.publicMethods || [];
    
    return createSuccessResponse(
      component,
      {
        methods: methods,
        methodCount: methods.length,
        defined: methods.filter(m => !m.inherited),
        inherited: methods.filter(m => m.inherited)
      },
      { resolver: 'queryPlanner', operation: 'component_methods' }
    );
  }

  async _handleComponentInfo(entities) {
    const component = entities.components[0];
    if (!component) {
      return createErrorResponse(null, 'No se especificó un componente');
    }

    const contract = this.contractService?.getContract(component) || 
                     this.knowledgeQuery?.getContract(component);
                     
    if (!contract || !contract.exists) {
      return createErrorResponse(component, `No se encontró el componente "${component}"`);
    }

    const methods = contract.publicMethods || [];
    const depsResult = this.dependencyResolver.findDependencies(component);
    const dependentsResult = this.dependencyResolver.findDependents(component);

    return createSuccessResponse(
      component,
      {
        type: contract.type,
        file: contract.file,
        methods: methods,
        methodCount: methods.length,
        dependencies: depsResult.success ? depsResult.data.dependencies : { internal: [], external: [], node: [] },
        dependents: dependentsResult.success ? dependentsResult.data.dependents : [],
        dependentsCount: dependentsResult.success ? dependentsResult.data.count : 0,
        validation: contract.validation
      },
      { resolver: 'queryPlanner', operation: 'component_info' }
    );
  }

  async _handleDependents(entities) {
    const component = entities.components[0];
    if (!component) {
      return createErrorResponse(null, 'No se especificó un componente');
    }

    const result = this.dependencyResolver.findDependents(component);
    
    if (!result.success) {
      return result;
    }

    return createSuccessResponse(
      component,
      {
        dependents: result.data.dependents || [],
        count: result.data.count || 0,
        summary: result.data.summary || ''
      },
      { resolver: 'queryPlanner', operation: 'dependents' }
    );
  }

  async _handleDependencies(entities) {
    const component = entities.components[0];
    if (!component) {
      return createErrorResponse(null, 'No se especificó un componente');
    }

    const result = this.dependencyResolver.findDependencies(component);
    
    if (!result.success) {
      return result;
    }

    return createSuccessResponse(
      component,
      {
        dependencies: result.data.dependencies || { internal: [], external: [], node: [] },
        summary: result.data.summary || ''
      },
      { resolver: 'queryPlanner', operation: 'dependencies' }
    );
  }

  async _handleMethodSearch(entities) {
    const methodName = entities.methods[0];
    if (!methodName) {
      return createErrorResponse(null, 'No se especificó un método');
    }

    const result = this.methodResolver.findByName(methodName);
    
    if (!result.success) {
      return result;
    }

    return createMethodSuccessResponse(
      methodName,
      {
        components: result.data.components || [],
        count: result.data.count || 0,
        summary: result.data.summary || ''
      },
      { resolver: 'queryPlanner', operation: 'method_search' }
    );
  }

  async _handleImpact(entities) {
    const component = entities.components[0];
    const method = entities.methods[0];

    if (component) {
      const result = this.impactResolver.analyzeComponentImpact(component, { deep: true });
      
      if (!result.success) {
        return result;
      }

      return createSuccessResponse(
        component,
        {
          impact: result.data.impact || null
        },
        { resolver: 'queryPlanner', operation: 'impact_component' }
      );
    }

    if (method) {
      const result = this.impactResolver.analyzeMethodImpact(method);
      
      if (!result.success) {
        return result;
      }

      return createMethodSuccessResponse(
        method,
        {
          impact: result.data.impact || null
        },
        { resolver: 'queryPlanner', operation: 'impact_method' }
      );
    }

    return createErrorResponse(null, 'No se especificó un componente o método para analizar impacto');
  }

  async _handleComparison(entities) {
    const [compA, compB] = entities.components;
    if (!compA || !compB) {
      return createErrorResponse(null, 'Se necesitan dos componentes para comparar');
    }

    const result = this.impactResolver.compareImpact(compA, compB);
    
    if (!result.success) {
      return result;
    }

    return createSuccessResponse(
      compA,
      {
        comparison: result.data.comparison || null,
        moreCritical: result.data.moreCritical || null,
        summary: result.data.summary || ''
      },
      { resolver: 'queryPlanner', operation: 'comparison' }
    );
  }

  async _handleArchitecture() {
    try {
      const contracts = this.contractService?.getAllContracts?.() || {};
      const components = this.knowledgeService?.getAllComponents?.() || [];
      
      let totalMethods = 0;
      let totalComponents = 0;

      for (const [name, contract] of Object.entries(contracts)) {
        if (contract && contract.exists) {
          totalComponents++;
          totalMethods += (contract.publicMethods || []).length;
        }
      }

      if (totalComponents === 0 && components.length > 0) {
        totalComponents = components.length;
        for (const comp of components) {
          totalMethods += (comp.methods || []).length;
        }
      }

      const cyclesResult = this.dependencyResolver?.findCircularDependencies?.() || { success: false };
      const isolatedResult = this.dependencyResolver?.findIsolatedComponents?.() || { success: false };

      return createSuccessResponse(
        null,
        {
          totalComponents,
          totalMethods,
          cycles: cyclesResult.success ? cyclesResult.data.count : 0,
          isolated: isolatedResult.success ? isolatedResult.data.count : 0,
          hasCycles: cyclesResult.success ? cyclesResult.data.hasCycles : false
        },
        { resolver: 'queryPlanner', operation: 'architecture' }
      );
    } catch (error) {
      logger.error('[QueryPlanner] Error en _handleArchitecture:', error);
      return createErrorResponse(
        null,
        error.message,
        { resolver: 'queryPlanner', operation: 'architecture' }
      );
    }
  }

  async _handleListComponents() {
    try {
      const contracts = this.contractService?.getAllContracts?.() || {};
      const components = this.knowledgeService?.getAllComponents?.() || [];
      
      const componentList = [];

      let hasContracts = false;
      for (const [name, contract] of Object.entries(contracts)) {
        if (contract && contract.exists) {
          hasContracts = true;
          componentList.push({
            name,
            type: contract.type || 'unknown',
            methods: (contract.publicMethods || []).length
          });
        }
      }

      if (!hasContracts && components.length > 0) {
        for (const comp of components) {
          componentList.push({
            name: comp.name,
            type: comp.type || 'unknown',
            methods: (comp.methods || []).length
          });
        }
      }

      componentList.sort((a, b) => a.name.localeCompare(b.name));

      const services = componentList.filter(c => c.type === 'service' || c.type === 'Service');
      const agents = componentList.filter(c => c.type === 'agent' || c.type === 'Agent');
      const cores = componentList.filter(c => c.type === 'core' || c.type === 'Core');
      const resolvers = componentList.filter(c => c.type === 'resolver' || c.type === 'Resolver');
      const knowledge = componentList.filter(c => c.type === 'knowledge' || c.type === 'Knowledge');

      return createSuccessResponse(
        null,
        {
          components: componentList,
          total: componentList.length,
          services: services.length,
          agents: agents.length,
          cores: cores.length,
          resolvers: resolvers.length,
          knowledge: knowledge.length,
          summary: `El sistema tiene ${componentList.length} componentes (${services.length} servicios, ${agents.length} agentes, ${cores.length} core, ${resolvers.length} resolvers, ${knowledge.length} knowledge)`
        },
        { resolver: 'queryPlanner', operation: 'list_components' }
      );
    } catch (error) {
      logger.error('[QueryPlanner] Error en _handleListComponents:', error);
      return createErrorResponse(
        null,
        error.message,
        { resolver: 'queryPlanner', operation: 'list_components' }
      );
    }
  }

  async _handleComponentCount(entities) {
    try {
      const contracts = this.contractService?.getAllContracts?.() || {};
      const components = this.knowledgeService?.getAllComponents?.() || [];
      
      let total = 0;
      let services = 0;
      let agents = 0;
      let cores = 0;
      let resolvers = 0;
      let knowledge = 0;

      let hasContracts = false;
      for (const [name, contract] of Object.entries(contracts)) {
        if (contract && contract.exists) {
          hasContracts = true;
          total++;
          const type = contract.type || '';
          if (type === 'service' || type === 'Service') services++;
          else if (type === 'agent' || type === 'Agent') agents++;
          else if (type === 'core' || type === 'Core') cores++;
          else if (type === 'resolver' || type === 'Resolver') resolvers++;
          else if (type === 'knowledge' || type === 'Knowledge') knowledge++;
        }
      }

      if (!hasContracts && components.length > 0) {
        total = components.length;
        for (const comp of components) {
          const type = comp.type || '';
          if (type === 'service' || type === 'Service') services++;
          else if (type === 'agent' || type === 'Agent') agents++;
          else if (type === 'core' || type === 'Core') cores++;
          else if (type === 'resolver' || type === 'Resolver') resolvers++;
          else if (type === 'knowledge' || type === 'Knowledge') knowledge++;
        }
      }

      return createSuccessResponse(
        null,
        {
          total,
          services,
          agents,
          cores,
          resolvers,
          knowledge,
          summary: `El sistema tiene ${total} componentes: ${services} servicios, ${agents} agentes, ${cores} core, ${resolvers} resolvers, ${knowledge} knowledge`
        },
        { resolver: 'queryPlanner', operation: 'component_count' }
      );
    } catch (error) {
      logger.error('[QueryPlanner] Error en _handleComponentCount:', error);
      return createErrorResponse(null, error.message);
    }
  }

  async _handleIsolatedComponents() {
    try {
      const result = this.dependencyResolver.findIsolatedComponents();
      
      if (!result.success) {
        return createErrorResponse(null, result.error || 'Error al obtener componentes aislados');
      }

      const isolated = result.data.isolated || [];
      const count = result.data.count || 0;

      return createSuccessResponse(
        null,
        {
          isolated,
          count,
          summary: count === 0
            ? 'No hay componentes aislados en el sistema'
            : `${count} componente(s) aislado(s): ${isolated.join(', ')}`
        },
        { resolver: 'queryPlanner', operation: 'isolated_components' }
      );
    } catch (error) {
      logger.error('[QueryPlanner] Error en _handleIsolatedComponents:', error);
      return createErrorResponse(null, error.message);
    }
  }

  _handleGeneral(entities) {
    return createSuccessResponse(
      null,
      {
        summary: 'No entendí tu consulta. Puedo ayudar con preguntas como:',
        suggestions: [
          '¿Qué métodos tiene contextService?',
          '¿Quién usa memoryService?',
          '¿De qué depende reasoningService?',
          '¿Cuál es el impacto de cambiar aiProvider?',
          'Lista de componentes del sistema',
          '¿Cuántos servicios hay?',
          '¿Qué componentes están aislados?'
        ]
      },
      { resolver: 'queryPlanner', operation: 'general' }
    );
  }

  // ─── 4. FORMATEO DE RESPUESTAS ─────────────────────────────

  _formatResponse(intent, result, entities) {
    if (!result.success) {
      return `❌ ${result.error || 'Error desconocido'}`;
    }

    switch (intent.type) {
      case 'component_methods':
        return this._formatMethods(result);
      case 'component_info':
        return this._formatComponentInfo(result);
      case 'dependents':
        return this._formatDependents(result);
      case 'dependencies':
        return this._formatDependencies(result);
      case 'method_search':
        return this._formatMethodSearch(result);
      case 'impact':
        return this._formatImpact(result);
      case 'comparison':
        return this._formatComparison(result);
      case 'architecture':
        return this._formatArchitecture(result);
      case 'list_components':
        return this._formatList(result);
      case 'component_count':
        return this._formatComponentCount(result);
      case 'isolated_components':
        return this._formatIsolatedComponents(result);
      default:
        return this._formatGeneral(result);
    }
  }

  _formatMethods(result) {
    const methods = result.data.methods || [];
    const component = result.component;

    if (methods.length === 0) {
      return `📦 **${component}** no tiene métodos públicos definidos.`;
    }

    let text = `📦 **${component}** expone ${methods.length} métodos públicos:\n\n`;
    
    const defined = methods.filter(m => !m.inherited);
    const inherited = methods.filter(m => m.inherited);

    if (defined.length > 0) {
      text += `**Definidos (${defined.length}):**\n`;
      for (const m of defined) {
        const params = m.params?.map(p => p.name || p).join(', ') || '';
        text += `  ${m.async ? 'async ' : ''}${m.name}(${params})\n`;
      }
    }

    if (inherited.length > 0) {
      text += `\n**Heredados (${inherited.length}):**\n`;
      for (const m of inherited) {
        text += `  ${m.name}() (de BaseService)\n`;
      }
    }

    return text;
  }

  _formatComponentInfo(result) {
    const component = result.component;
    const data = result.data;
    
    let text = `📋 **${component}**\n`;
    text += `  Tipo: ${data.type || 'componente'}\n`;
    text += `  Métodos: ${data.methodCount || 0}\n`;
    text += `  Dependientes: ${data.dependentsCount || 0}\n\n`;

    if (data.dependents && data.dependents.length > 0) {
      text += `**Usado por:** ${data.dependents.join(', ')}\n`;
    }

    if (data.dependencies) {
      const internal = data.dependencies.internal || [];
      if (internal.length > 0) {
        text += `**Dependencias internas:** ${internal.join(', ')}\n`;
      }
    }

    return text;
  }

  _formatDependents(result) {
    const dependents = result.data.dependents || [];
    const component = result.component;

    if (dependents.length === 0) {
      return `✅ **${component}** no es usado por ningún componente.`;
    }

    let text = `🔗 **${component}** es usado por ${dependents.length} componente(s):\n\n`;
    for (const dep of dependents) {
      text += `  ${dep}\n`;
    }
    return text;
  }

  _formatDependencies(result) {
    const deps = result.data.dependencies || { internal: [], external: [], node: [] };
    const component = result.component;

    let text = `📦 **${component}** depende de:\n\n`;

    if (deps.internal?.length > 0) {
      text += `**Internas:**\n  ${deps.internal.join('\n  ')}\n\n`;
    }

    if (deps.external?.length > 0) {
      text += `**Externas:**\n  ${deps.external.join('\n  ')}\n\n`;
    }

    if (deps.node?.length > 0) {
      text += `**Node.js:**\n  ${deps.node.join('\n  ')}\n\n`;
    }

    if (!deps.internal?.length && !deps.external?.length && !deps.node?.length) {
      text += '  No tiene dependencias.\n';
    }

    return text;
  }

  _formatMethodSearch(result) {
    const components = result.data.components || [];
    const method = result.method;

    if (components.length === 0) {
      return `No se encontró el método "${method}" en ningún componente.`;
    }

    let text = `🔍 **Método "${method}"** encontrado en ${components.length} componente(s):\n\n`;
    for (const comp of components) {
      text += `  ${comp.name} (${comp.type})\n`;
    }
    return text;
  }

  _formatImpact(result) {
    const impact = result.data.impact;
    const component = result.component;

    if (!impact) {
      return `No se encontró información de impacto para "${component || result.method}".`;
    }

    let text = `💥 **Análisis de Impacto**\n\n`;
    text += `  Componente: ${impact.component || component}\n`;
    text += `  Dependientes directos: ${impact.directCount || 0}\n`;
    text += `  Dependientes indirectos: ${impact.indirectCount || 0}\n`;
    text += `  Criticidad: ${impact.criticality?.level || 'LOW'}\n`;
    text += `  ${impact.criticality?.message || ''}\n\n`;

    if (impact.recommendations?.length > 0) {
      text += `**Recomendaciones:**\n`;
      for (const rec of impact.recommendations) {
        const icon = rec.priority === 'critical' ? '⚠️' : 
                     rec.priority === 'high' ? '🔴' : '📌';
        text += `  ${icon} ${rec.message}\n`;
      }
    }

    return text;
  }

  _formatList(result) {
    const components = result.data.components || [];
    
    if (components.length === 0) {
      return `📋 **Componentes del Sistema**\n\n  No se encontraron componentes. Verifica que el sistema esté inicializado.`;
    }
    
    let text = `📋 **Componentes del Sistema**\n\n`;
    text += `  Total: ${components.length}\n`;
    text += `  Servicios: ${result.data.services || 0}\n`;
    text += `  Agentes: ${result.data.agents || 0}\n`;
    text += `  Core: ${result.data.cores || 0}\n`;
    text += `  Resolvers: ${result.data.resolvers || 0}\n`;
    text += `  Knowledge: ${result.data.knowledge || 0}\n\n`;

    const display = components.slice(0, 15);
    for (const comp of display) {
      text += `  ${comp.name} (${comp.type}, ${comp.methods || 0} métodos)\n`;
    }
    
    if (components.length > 15) {
      text += `\n  ... y ${components.length - 15} más\n`;
    }

    return text;
  }

  _formatArchitecture(result) {
    const data = result.data;
    let text = `🏗️ **Arquitectura del Sistema**\n\n`;
    text += `  Componentes totales: ${data.totalComponents || 0}\n`;
    text += `  Métodos totales: ${data.totalMethods || 0}\n`;
    text += `  Dependencias circulares: ${data.cycles || 0}\n`;
    text += `  Componentes aislados: ${data.isolated || 0}\n`;
    
    if (data.totalComponents === 0) {
      text += `\n⚠️ No se encontraron componentes. Verifica que KnowledgeService esté inicializado.\n`;
    }
    
    return text;
  }

  _formatComponentCount(result) {
    const data = result.data;
    let text = `📊 **Componentes del Sistema**\n\n`;
    text += `  Total: ${data.total}\n`;
    text += `  Servicios: ${data.services}\n`;
    text += `  Agentes: ${data.agents}\n`;
    text += `  Core: ${data.cores}\n`;
    text += `  Resolvers: ${data.resolvers}\n`;
    text += `  Knowledge: ${data.knowledge || 0}\n`;
    return text;
  }

  _formatIsolatedComponents(result) {
    const isolated = result.data.isolated || [];
    const count = result.data.count || 0;

    if (count === 0) {
      return `📊 **Componentes Aislados**\n\n  ✅ No hay componentes aislados en el sistema.`;
    }

    let text = `📊 **Componentes Aislados (${count})**\n\n`;
    text += `  Componentes sin dependencias ni dependientes:\n\n`;
    for (const comp of isolated) {
      text += `  • ${comp}\n`;
    }
    return text;
  }

  _formatGeneral(result) {
    const data = result.data;
    let text = `📊 **Información General**\n\n`;
    text += data.summary || 'No se encontró información.\n\n';
    
    if (data.suggestions) {
      text += `Puedo ayudar con preguntas como:\n`;
      for (const s of data.suggestions) {
        text += `  • ${s}\n`;
      }
    }
    
    return text;
  }

  _formatComparison(result) {
    const comp = result.data.comparison;
    if (!comp) return 'No se pudo realizar la comparación.';

    let text = `⚖️ **Comparación de Impacto**\n\n`;

    text += `**${comp.componentA?.name || 'Componente A'}**\n`;
    text += `  Dependientes directos: ${comp.componentA?.directDependents || 0}\n`;
    text += `  Dependientes indirectos: ${comp.componentA?.indirectDependents || 0}\n`;
    text += `  Métodos: ${comp.componentA?.methods || 0}\n\n`;

    text += `**${comp.componentB?.name || 'Componente B'}**\n`;
    text += `  Dependientes directos: ${comp.componentB?.directDependents || 0}\n`;
    text += `  Dependientes indirectos: ${comp.componentB?.indirectDependents || 0}\n`;
    text += `  Métodos: ${comp.componentB?.methods || 0}\n\n`;

    if (result.data.moreCritical) {
      text += `⚠️ Componente más crítico: **${result.data.moreCritical}**\n`;
    }

    return text;
  }

  // ─── UTILIDADES ──────────────────────────────────────────────

  _findComponentName(text) {
    const allComponents = this.knowledgeService.getAllComponents();
    const componentNames = allComponents.map(c => c.name);
    const textLower = text.toLowerCase();
    
    for (const name of componentNames) {
      if (textLower.includes(name.toLowerCase())) {
        return name;
      }
    }
    return null;
  }

  getStatus() {
    return {
      name: this.name,
      status: this.status,
      initialized: this.initialized
    };
  }

  async shutdown() {
    this.status = 'offline';
    this.initialized = false;
    logger.info('[QueryPlanner] Apagado correctamente');
    return true;
  }
}