// backend/src/services/contextService.js
// 🧠 CONTEXT SERVICE - Orquestador de contexto
// 🔒 RESPONSABILIDAD ÚNICA: Recibir consulta, recuperar datos, devolver contexto enriquecido
// 🔒 NO decide qué recuperar (eso es Retrieval Policy)
// 🔒 NO genera planes (eso es Reasoning Service)

import { BaseService } from '../core/serviceInterface.js';
import { logger } from '../core/logger.js';
import { eventBus } from '../core/eventBus.js';
import memoryService from './memoryService.js';
import longTermMemoryService from './longTermMemoryService.js';
import knowledgeService from '../knowledge/index.js';
import retrievalPolicy from './retrievalPolicy.js';

export class ContextService extends BaseService {
  constructor(config = {}) {
    super(config);
    this.name = 'ContextService';
    this.memoryService = config.memoryService || memoryService;
    this.longTermMemory = config.longTermMemory || longTermMemoryService;
    this.knowledge = config.knowledge || knowledgeService;
    this.retrievalPolicy = config.retrievalPolicy || retrievalPolicy;
    this.initialized = false;
    
    // Métricas específicas
    this.metrics = {
      ...this.metrics,
      contextBuilds: 0,
      totalBuildTime: 0,
      avgBuildTime: 0,
      sourcesUsed: {},
      sourceErrors: {},
    };
  }

  async initialize() {
    try {
      this.status = 'initializing';
      
      const services = [
        this.memoryService,
        this.longTermMemory,
        this.knowledge,
      ];
      
      for (const service of services) {
        if (!service.initialized) {
          await service.initialize();
        }
      }
      
      this.initialized = true;
      this.status = 'online';
      
      logger.info('[ContextService] Inicializado');
      return true;
    } catch (error) {
      this.status = 'error';
      logger.error('[ContextService] Error inicializando', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Obtiene contexto enriquecido
   * @param {Object} params - Parámetros
   * @param {string} params.sessionId - ID de sesión
   * @param {string} params.query - Consulta del usuario
   * @param {Object} [params.options] - Opciones adicionales
   * @returns {Promise<Object>} Contexto enriquecido
   */
  async getContext({ sessionId, query, options = {} }) {
    const startTime = Date.now();
    const traceId = global.traceId || 'no-trace';
    
    if (!sessionId) {
      throw new Error('sessionId es requerido');
    }
    if (!query) {
      throw new Error('query es requerido');
    }

    // 1. Obtener plan de recuperación
    const plan = this.retrievalPolicy.getPlan(query, options);
    
    logger.debug('[ContextService] Construyendo contexto', {
      sessionId,
      queryLength: query?.length || 0,
      taskType: plan.taskType,
      layers: plan.layers,
      traceId,
    });

    // 2. Definir tareas de recuperación
    const recoveryTasks = this._buildRecoveryTasks(sessionId, query, plan);
    const taskNames = Object.keys(recoveryTasks);

    // 3. Ejecutar todas las tareas en paralelo con tolerancia a fallos
    const results = await Promise.allSettled(
      Object.values(recoveryTasks)
    );

    // 4. Procesar resultados
    const data = {};
    const sourceErrors = [];
    const sourcesUsed = [];

    for (let i = 0; i < taskNames.length; i++) {
      const name = taskNames[i];
      const result = results[i];
      
      if (result.status === 'fulfilled') {
        data[name] = result.value;
        sourcesUsed.push(name);
        if (result.value && Array.isArray(result.value)) {
          this.metrics.sourcesUsed[name] = (this.metrics.sourcesUsed[name] || 0) + result.value.length;
        } else if (result.value && typeof result.value === 'object') {
          this.metrics.sourcesUsed[name] = (this.metrics.sourcesUsed[name] || 0) + 1;
        }
      } else {
        data[name] = this._getDefaultForSource(name);
        sourceErrors.push({ source: name, error: result.reason?.message });
        this.metrics.sourceErrors[name] = (this.metrics.sourceErrors[name] || 0) + 1;
        logger.warn('[ContextService] Error en fuente', {
          source: name,
          error: result.reason?.message,
          sessionId,
        });
      }
    }

    // 5. Construir contexto enriquecido
    const context = {
      session: {
        id: sessionId,
        context: data.session || {},
      },
      history: data.history || [],
      memory: {
        episodic: data.episodic || [],
        semantic: data.semantic || [],
        procedural: data.procedural || [], // 🔥 Siempre presente
      },
      system: {
        project: data.project || null,
        state: data.systemState || { mode: 'JARVIS' },
      },
      query: {
        text: query,
        timestamp: new Date().toISOString(),
      },
      metadata: {
        traceId,
        retrievalPlan: plan,
        builtAt: new Date().toISOString(),
        buildTimeMs: 0, // Se actualizará después
        sourcesUsed,
        sourceErrors,
        layersRecovered: Object.keys(data).filter(k => data[k] !== null && data[k] !== undefined),
      },
    };

    // 6. Calcular métricas
    const buildTime = Date.now() - startTime;
    context.metadata.buildTimeMs = buildTime;
    
    this.metrics.contextBuilds++;
    this.metrics.totalBuildTime += buildTime;
    this.metrics.avgBuildTime = this.metrics.totalBuildTime / this.metrics.contextBuilds;

    // 7. Emitir evento
    this._emit('context_retrieved', {
      sessionId,
      traceId,
      taskType: plan.taskType,
      buildTime,
      sourcesUsed: sourcesUsed.length,
      sourceErrors: sourceErrors.length,
      historyCount: context.history.length,
      episodicCount: context.memory.episodic.length,
      semanticCount: context.memory.semantic.length,
      proceduralCount: context.memory.procedural.length,
    });

    logger.debug('[ContextService] Contexto construido', {
      sessionId,
      traceId,
      buildTime,
      taskType: plan.taskType,
      sourcesUsed: sourcesUsed.length,
      sourceErrors: sourceErrors.length,
      historyCount: context.history.length,
    });

    return context;
  }

  // ─── CONSTRUCCIÓN DE TAREAS ─────────────────────────────────

  _buildRecoveryTasks(sessionId, query, plan) {
    const tasks = {};

    // Siempre recuperar sesión
    tasks.session = this._getSessionContext(sessionId);
    
    // Historial
    if (plan.layers.includes('history')) {
      tasks.history = this._getHistory(sessionId, plan.maxHistory || 10);
    }
    
    // Episódica
    if (plan.layers.includes('episodic')) {
      tasks.episodic = this._getEpisodicEvents(sessionId, plan.maxEpisodic || 5);
    }
    
    // Semántica
    if (plan.layers.includes('semantic')) {
      tasks.semantic = this._getSemanticFacts(
        sessionId,
        query,
        plan.maxSemantic || 10,
        plan.semanticPrefix || []
      );
    }
    
    // Procedimental (siempre presente, aunque esté vacío)
    if (plan.layers.includes('procedural')) {
      tasks.procedural = this._getProceduralFacts(
        sessionId,
        query,
        plan.maxProcedural || 5
      );
    } else {
      // 🔥 Siempre incluir procedural aunque no esté en el plan
      tasks.procedural = Promise.resolve([]);
    }
    
    // Información del proyecto
    if (plan.includeProjectInfo !== false) {
      tasks.project = this._getProjectInfo();
    }
    
    // Estado del sistema
    if (plan.includeSystemState !== false) {
      tasks.systemState = this._getSystemState();
    }

    return tasks;
  }

  // ─── VALORES POR DEFECTO PARA FUENTES FALLIDAS ──────────────

  _getDefaultForSource(source) {
    const defaults = {
      session: {},
      history: [],
      episodic: [],
      semantic: [],
      procedural: [],
      project: null,
      systemState: { mode: 'JARVIS' },
    };
    return defaults[source] !== undefined ? defaults[source] : null;
  }

  // ─── MÉTODOS DE RECUPERACIÓN ─────────────────────────────────

  async _getSessionContext(sessionId) {
    try {
      return await this.memoryService.getContext(sessionId) || {};
    } catch (error) {
      logger.warn('[ContextService] Error en session', { sessionId, error: error.message });
      return {};
    }
  }

  async _getHistory(sessionId, limit) {
    try {
      return await this.memoryService.getConversationHistory(sessionId, limit || 10);
    } catch (error) {
      logger.warn('[ContextService] Error en history', { sessionId, error: error.message });
      return [];
    }
  }

  async _getEpisodicEvents(sessionId, limit) {
    try {
      return await this.longTermMemory.getRecentEpisodicEvents(sessionId, limit || 5);
    } catch (error) {
      logger.warn('[ContextService] Error en episodic', { sessionId, error: error.message });
      return [];
    }
  }

      async _getSemanticFacts(sessionId, query, limit, prefix = []) {
    try {
      // 🔥 PRIMERO: buscar hechos específicos por keywords de la consulta
      const keywords = [];
      
      if (prefix && prefix.length > 0) {
        keywords.push(...prefix);
      }
      
      if (query && query.length > 3) {
        const queryWords = query
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(' ')
          .filter(w => w.length > 3)
          .slice(0, 3);
        keywords.push(...queryWords);
      }

      // Buscar por keywords
      if (keywords.length > 0) {
        const results = [];
        const perKeyword = Math.max(1, Math.ceil((limit || 10) / keywords.length));
        
        for (const keyword of keywords) {
          const facts = await this.longTermMemory.searchSemanticFacts(
            sessionId,
            keyword,
            perKeyword
          );
          results.push(...facts);
        }
        
        const unique = results.filter((fact, index, self) => 
          index === self.findIndex(f => f.key === fact.key)
        );
        
        if (unique.length > 0) {
          return unique.slice(0, limit || 10);
        }
      }

      // 🔥 SEGUNDO: si no hay resultados, buscar hechos generales
      const generalPrefixes = ['user_', 'preference_', 'interest_', 'favorite_'];
      const results = [];
      
      for (const pref of generalPrefixes) {
        const facts = await this.longTermMemory.searchSemanticFacts(
          sessionId,
          pref,
          Math.ceil((limit || 10) / generalPrefixes.length)
        );
        results.push(...facts);
      }
      
      const unique = results.filter((fact, index, self) => 
        index === self.findIndex(f => f.key === fact.key)
      );
      
      return unique.slice(0, limit || 10);
    } catch (error) {
      logger.warn('[ContextService] Error en semantic', { sessionId, error: error.message });
      return [];
    }
  }

  async _getProceduralFacts(sessionId, query, limit) {
    try {
      if (!query || query.length < 3) {
        return [];
      }

      const keywords = query
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(' ')
        .filter(w => w.length > 3)
        .slice(0, 3);

      if (keywords.length === 0) {
        return [];
      }

      const results = [];
      const perKeyword = Math.max(1, Math.ceil((limit || 5) / keywords.length));
      
      for (const keyword of keywords) {
        const facts = await this.longTermMemory.searchProceduralFacts(
          sessionId,
          keyword,
          perKeyword
        );
        results.push(...facts);
      }
      
      const unique = results.filter((fact, index, self) => 
        index === self.findIndex(f => f.key === fact.key)
      );
      
      return unique.slice(0, limit || 5);
    } catch (error) {
      logger.warn('[ContextService] Error en procedural', { sessionId, error: error.message });
      return [];
    }
  }

  async _getProjectInfo() {
    try {
      return this.knowledge.getProjectInfo();
    } catch (error) {
      logger.warn('[ContextService] Error en project', { error: error.message });
      return null;
    }
  }

  async _getSystemState() {
    try {
      return await this.memoryService.getSystemState();
    } catch (error) {
      logger.warn('[ContextService] Error en systemState', { error: error.message });
      return { mode: 'JARVIS' };
    }
  }

  // ─── MÉTRICAS Y ESTADO ──────────────────────────────────────

  getMetrics() {
    return {
      ...this.metrics,
      contextBuilds: this.metrics.contextBuilds || 0,
      avgBuildTime: this.metrics.avgBuildTime || 0,
      sourcesUsed: this.metrics.sourcesUsed || {},
      sourceErrors: this.metrics.sourceErrors || {},
      hasRetrievalPolicy: !!this.retrievalPolicy,
    };
  }

  getStatus() {
    return {
      name: this.name,
      status: this.status,
      initialized: this.initialized,
      hasRetrievalPolicy: !!this.retrievalPolicy,
      metrics: this.getMetrics(),
    };
  }

  async shutdown() {
    try {
      this.status = 'offline';
      this.initialized = false;
      logger.info('[ContextService] Apagado correctamente');
      return true;
    } catch (error) {
      logger.error('[ContextService] Error en shutdown', {
        error: error.message,
      });
      return false;
    }
  }
}

// Instancia por defecto
const contextService = new ContextService();

export default contextService;