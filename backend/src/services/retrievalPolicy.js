// backend/src/services/retrievalPolicy.js
// 🎯 RETRIEVAL POLICY - Define qué y cómo recuperar según la tarea
// 🔒 INDEPENDIENTE - No depende de otros servicios

import { BaseService } from '../core/serviceInterface.js';
import { logger } from '../core/logger.js';

export class RetrievalPolicy extends BaseService {
  constructor(config = {}) {
    super(config);
    this.name = 'RetrievalPolicy';
    
    this.defaultPlans = {
      conversation: {
        layers: ['session', 'history', 'episodic', 'semantic'],
        maxHistory: 10,
        maxEpisodic: 5,
        maxSemantic: 8,
        includeProjectInfo: true,
        includeSystemState: true,
        priority: 'recent',
      },
      planning: {
        layers: ['session', 'history', 'episodic', 'semantic', 'procedural'],
        maxHistory: 15,
        maxEpisodic: 10,
        maxSemantic: 15,
        maxProcedural: 5,
        includeProjectInfo: true,
        includeSystemState: true,
        priority: 'relevant',
      },
      execution: {
        layers: ['session', 'history', 'semantic'],
        maxHistory: 5,
        maxEpisodic: 3,
        maxSemantic: 5,
        includeProjectInfo: false,
        includeSystemState: true,
        priority: 'relevant',
      },
      reflection: {
        layers: ['session', 'history', 'episodic', 'semantic', 'procedural'],
        maxHistory: 20,
        maxEpisodic: 15,
        maxSemantic: 20,
        maxProcedural: 10,
        includeProjectInfo: true,
        includeSystemState: true,
        priority: 'recent',
      },
      simple: {
        layers: ['session', 'history'],
        maxHistory: 3,
        maxEpisodic: 0,
        maxSemantic: 0,
        includeProjectInfo: false,
        includeSystemState: false,
        priority: 'recent',
      },
      account_analysis: {
        layers: ['session', 'history', 'semantic', 'procedural'],
        maxHistory: 10,
        maxEpisodic: 5,
        maxSemantic: 10,
        maxProcedural: 3,
        includeProjectInfo: true,
        includeSystemState: true,
        priority: 'relevant',
        semanticPrefix: ['instagram', 'account', 'metrics', 'engagement'],
      },
      content_publishing: {
        layers: ['session', 'history', 'semantic', 'procedural'],
        maxHistory: 8,
        maxEpisodic: 5,
        maxSemantic: 8,
        maxProcedural: 5,
        includeProjectInfo: true,
        includeSystemState: true,
        priority: 'relevant',
        semanticPrefix: ['publish', 'instagram', 'video', 'content', 'media'],
      },
    };

    this.taskDetection = {
      planning: {
        keywords: [
          'plan', 'estrategia', 'estrategico', 'objetivo', 'meta',
          'roadmap', 'calendario', 'planificar', 'planificación',
          'estrategias', 'objetivos', 'metas', 'planear', 'planifica'
        ],
        threshold: 0.15,
      },
      execution: {
        keywords: [
          'ejecutar', 'hacer', 'crear', 'generar', 'publicar',
          'subir', 'analizar', 'ejecución', 'publicación',
          'crea', 'genera', 'publica', 'analiza', 'ejecuta'
        ],
        threshold: 0.15,
      },
      reflection: {
        keywords: ['aprender', 'mejorar', 'reflexionar', 'evaluar', 'feedback'],
        threshold: 0.2,
      },
      account_analysis: {
        keywords: ['analizar', 'cuenta', 'instagram', 'métricas', 'engagement', 'seguidores'],
        threshold: 0.15,
      },
      content_publishing: {
        keywords: ['publicar', 'video', 'reel', 'instagram', 'subir', 'contenido', 'post'],
        threshold: 0.15,
      },
      simple: {
        keywords: ['hola', 'gracias', 'adios', 'chao', 'ok', 'vale'],
        threshold: 0.5,
      },
    };

    this.initialized = true;
    this.status = 'online';
    
    logger.info('[RetrievalPolicy] Inicializado', {
      plans: Object.keys(this.defaultPlans).length,
      taskTypes: Object.keys(this.taskDetection).length,
    });
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Obtiene el plan de recuperación para una consulta
   */
  getPlan(query, options = {}) {
    const traceId = global.traceId || 'no-trace';
    
    if (options.customPlan) {
      return { ...this.defaultPlans.conversation, ...options.customPlan };
    }

    let taskType = options.taskType || this._detectTaskType(query);
    
    if (!taskType || !this.defaultPlans[taskType]) {
      taskType = 'conversation';
    }

    const basePlan = this.defaultPlans[taskType] || this.defaultPlans.conversation;
    
    const plan = {
      taskType,
      layers: basePlan.layers || ['session', 'history'],
      maxHistory: basePlan.maxHistory || 10,
      maxEpisodic: basePlan.maxEpisodic || 5,
      maxSemantic: basePlan.maxSemantic || 8,
      maxProcedural: basePlan.maxProcedural || 3,
      includeProjectInfo: basePlan.includeProjectInfo !== false,
      includeSystemState: basePlan.includeSystemState !== false,
      priority: basePlan.priority || 'recent',
      semanticPrefix: basePlan.semanticPrefix || [],
      _source: taskType,
    };

    logger.debug('[RetrievalPolicy] Plan generado', {
      taskType,
      layers: plan.layers,
      maxHistory: plan.maxHistory,
      traceId,
    });

    return plan;
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Detecta el tipo de tarea de una consulta
   */
  detectTaskType(query) {
    return this._detectTaskType(query);
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Obtiene todos los tipos de tarea disponibles
   */
  getTaskTypes() {
    return Object.keys(this.defaultPlans);
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Registra un plan personalizado
   */
  registerPlan(name, plan) {
    if (this.defaultPlans[name]) {
      logger.warn('[RetrievalPolicy] Sobrescribiendo plan', { name });
    }
    this.defaultPlans[name] = plan;
    logger.info('[RetrievalPolicy] Plan registrado', { name });
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Registra detección de tarea personalizada
   */
  registerTaskDetection(name, config) {
    if (this.taskDetection[name]) {
      logger.warn('[RetrievalPolicy] Sobrescribiendo detección', { name });
    }
    this.taskDetection[name] = config;
    logger.info('[RetrievalPolicy] Detección registrada', { name });
  }

   // ─── MÉTODOS PRIVADOS ──────────────────────────────────────

  _detectTaskType(query) {
    if (!query || typeof query !== 'string') {
      return 'conversation';
    }

    const normalized = query.toLowerCase().trim();
    const words = normalized.split(/\s+/);

    // 🔧 NUEVO: Detección por peso de palabras clave
    const scores = {};
    let totalMatches = 0;
    
    // Inicializar scores
    for (const taskType of Object.keys(this.taskDetection)) {
      scores[taskType] = 0;
    }

    // Contar coincidencias por palabra
    for (const [taskType, config] of Object.entries(this.taskDetection)) {
      let matchCount = 0;
      
      for (const keyword of config.keywords) {
        if (normalized.includes(keyword)) {
          matchCount++;
          totalMatches++;
        }
      }
      
      // Puntuación: número de matches / longitud de la consulta (en palabras)
      // Esto da más peso a consultas cortas con keywords específicos
      const wordRatio = words.length > 0 ? matchCount / words.length : 0;
      const keywordRatio = config.keywords.length > 0 ? matchCount / config.keywords.length : 0;
      
      // Combinar ambos ratios con peso
      scores[taskType] = (wordRatio * 0.6) + (keywordRatio * 0.4);
    }

    // 🔧 NUEVO: Encontrar el mejor tipo con umbral más bajo
    let bestType = 'conversation';
    let bestScore = 0;
    
    for (const [taskType, score] of Object.entries(scores)) {
      const threshold = this.taskDetection[taskType]?.threshold || 0.15;
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestType = taskType;
      }
    }

    // 🔧 NUEVO: Si hay palabras clave específicas pero baja puntuación,
    // forzar detección por coincidencia exacta
    const exactMatches = {
      'plan': 'planning',
      'estrategia': 'planning',
      'planificar': 'planning',
      'ejecutar': 'execution',
      'publicar': 'execution',
      'analizar': 'account_analysis',
      'cuenta': 'account_analysis',
      'instagram': 'account_analysis',
    };

    for (const [word, taskType] of Object.entries(exactMatches)) {
      if (normalized.includes(word) && bestScore < 0.2) {
        bestType = taskType;
        bestScore = 0.3;
        break;
      }
    }

    // 🔧 NUEVO: Si la consulta es muy corta y no tiene keywords, usar simple
    if (words.length <= 2 && bestScore < 0.1) {
      const simpleKeywords = ['hola', 'gracias', 'adios', 'ok', 'si', 'no', 'vale'];
      if (simpleKeywords.some(k => normalized.includes(k))) {
        return 'simple';
      }
    }

    return bestType;
  }

  // ─── MÉTRICAS Y ESTADO ──────────────────────────────────────

  getMetrics() {
    return {
      ...this.metrics,
      totalPlans: Object.keys(this.defaultPlans).length,
      totalTaskTypes: Object.keys(this.taskDetection).length,
    };
  }

  getStatus() {
    return {
      name: this.name,
      status: this.status,
      initialized: this.initialized,
      plans: Object.keys(this.defaultPlans),
      metrics: this.getMetrics(),
    };
  }

  async shutdown() {
    try {
      this.status = 'offline';
      this.initialized = false;
      logger.info('[RetrievalPolicy] Apagado correctamente');
      return true;
    } catch (error) {
      logger.error('[RetrievalPolicy] Error en shutdown', {
        error: error.message,
      });
      return false;
    }
  }
}

// Instancia por defecto
const retrievalPolicy = new RetrievalPolicy();

export default retrievalPolicy;