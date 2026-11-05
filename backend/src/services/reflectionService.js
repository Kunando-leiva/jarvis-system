// backend/src/services/reflectionService.js
// 🔍 SERVICIO DE REFLEXIÓN - Observador y Registrador
// Solo observa, no modifica el comportamiento del sistema

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../core/logger.js';
import { eventBus } from '../core/eventBus.js';
import { BaseService } from '../core/serviceInterface.js';
// ⭐ CORREGIDO: importación por defecto
import aiProvider from '../core/aiProvider.js';
import longTermMemoryService from './longTermMemoryService.js';

export class ReflectionService extends BaseService {
  constructor(config = {}) {
    super(config);
    this.name = 'ReflectionService';
    this.longTermMemory = config.longTermMemory || longTermMemoryService;
    this.aiProvider = config.aiProvider || aiProvider;
    this.reflections = [];
    this.maxReflections = 1000;
    this.autoReflect = config.autoReflect !== false;
    this.initialized = false;
  }

  async initialize() {
    try {
      this.status = 'initializing';
      
      if (!this.longTermMemory.initialized) {
        await this.longTermMemory.initialize();
      }
      
      this.initialized = true;
      this.status = 'online';
      
      if (this.autoReflect) {
        eventBus.on('execution:completed', this._onExecutionCompleted.bind(this));
        eventBus.on('execution:failed', this._onExecutionFailed.bind(this));
        eventBus.on('response_sent', this._onResponseSent.bind(this));
      }
      
      logger.info('[ReflectionService] Inicializado', {
        autoReflect: this.autoReflect,
      });
      
      return true;
    } catch (error) {
      this.status = 'error';
      logger.error('[ReflectionService] Error inicializando', {
        error: error.message,
      });
      return false;
    }
  }

  async reflect(data) {
  const {
    sessionId,
    query,
    response,
    context = {},
    plan = null,
    results = [],
    traceId = global.traceId || uuidv4(),
  } = data;
  
  // ⭐ Asegurar que sessionId existe para todo el método
  const sid = sessionId || 'unknown';
  
  if (!sid || !query) {
    return { error: 'Faltan datos para reflexión' };
  }
  
  return this._measure('reflect', async () => {
    logger.debug('[ReflectionService] Reflexionando', {
      sessionId: sid,
      traceId,
      queryLength: query?.length || 0,
      responseLength: response?.length || 0,
    });
    
    const quality = await this._evaluateQuality(query, response, context);
    const improvements = await this._identifyImprovements(query, response, quality);
    
    const reflection = {
      id: `ref_${Date.now()}_${uuidv4().slice(0, 6)}`,
      sessionId: sid,
      timestamp: new Date().toISOString(),
      traceId,
      query: query.substring(0, 500),
      response: response ? response.substring(0, 500) : null,
      quality: quality.score,
      qualityDetails: quality.details,
      improvements: improvements,
      planId: plan?.id || null,
      planIntent: plan?.intent || null,
      resultsCount: results.length,
      resultsSuccess: results.filter(r => r.success).length,
      metadata: {
        responseLength: response?.length || 0,
        queryLength: query?.length || 0,
        contextKeys: Object.keys(context || {}),
        hasPlan: !!plan,
      },
    };
    
    this.reflections.push(reflection);
    if (this.reflections.length > this.maxReflections) {
      this.reflections.shift();
    }
    
    if (quality.score > 0.6) {
      await this.longTermMemory.saveEpisodicEvent(
        sid,
        'reflection_positive',
        `Respuesta de calidad ${quality.score.toFixed(2)}: ${query.substring(0, 50)}...`,
        { reflectionId: reflection.id, score: quality.score }
      );
    } else if (quality.score < 0.4) {
      await this.longTermMemory.saveEpisodicEvent(
        sid,
        'reflection_negative',
        `Respuesta de calidad baja (${quality.score.toFixed(2)}): ${query.substring(0, 50)}...`,
        { reflectionId: reflection.id, score: quality.score, improvements: improvements.slice(0, 3) }
      );
    }
    
    eventBus.emit('reflection:completed', {
      sessionId: sid,
      traceId,
      reflectionId: reflection.id,
      quality: quality.score,
      improvementsCount: improvements.length,
    });
    
    logger.debug('[ReflectionService] Reflexión completada', {
      sessionId: sid,
      traceId,
      quality: quality.score,
      improvements: improvements.length,
    });
    
    return reflection;
  }, { sessionId: sid });  // ⭐ Pasar sid al contexto de medida
}

  async _evaluateQuality(query, response, context) {
    if (!response) {
      return {
        score: 0.3,
        details: {
          clarity: 0.3,
          relevance: 0.3,
          completeness: 0.3,
          helpfulness: 0.3,
        },
      };
    }
    
    try {
      if (!this.aiProvider || typeof this.aiProvider.generate !== 'function') {
        logger.warn('[ReflectionService] aiProvider no disponible, usando fallback');
        return {
          score: 0.5,
          details: {
            clarity: 0.5,
            relevance: 0.5,
            completeness: 0.5,
            helpfulness: 0.5,
          },
        };
      }

      const evaluation = await this.aiProvider.generate({
        prompt: `
Evalúa la calidad de esta respuesta a una consulta de usuario.

Consulta del usuario:
"${query}"

Respuesta generada:
"${response.substring(0, 1000)}"

Contexto adicional:
${JSON.stringify(context, null, 2)}

Evalúa en una escala de 0 a 1 los siguientes aspectos:
1. Claridad: ¿Es clara y fácil de entender?
2. Relevancia: ¿Responde directamente a la consulta?
3. Completitud: ¿Cubre todos los aspectos de la consulta?
4. Utilidad: ¿Es útil y accionable para el usuario?

Responde ÚNICAMENTE con un objeto JSON:
{
  "clarity": 0.0,
  "relevance": 0.0,
  "completeness": 0.0,
  "helpfulness": 0.0
}
`,
        task: 'reflection',
        temperature: 0.1,
      });
      
      const parsed = JSON.parse(evaluation.text || evaluation);
      const score = (parsed.clarity + parsed.relevance + parsed.completeness + parsed.helpfulness) / 4;
      
      return {
        score,
        details: parsed,
      };
    } catch (error) {
      logger.warn('[ReflectionService] Error evaluando calidad', {
        error: error.message,
      });
      
      return {
        score: 0.5,
        details: {
          clarity: 0.5,
          relevance: 0.5,
          completeness: 0.5,
          helpfulness: 0.5,
        },
      };
    }
  }

  async _identifyImprovements(query, response, quality) {
    const improvements = [];
    
    if (quality.score < 0.6) {
      try {
        if (this.aiProvider && typeof this.aiProvider.generate === 'function') {
          const suggestion = await this.aiProvider.generate({
            prompt: `
Analiza la siguiente interacción y sugiere mejoras concretas.

Consulta del usuario:
"${query}"

Respuesta generada:
"${response?.substring(0, 800) || 'Sin respuesta'}"

Calidad evaluada:
- Claridad: ${quality.details.clarity || 0}
- Relevancia: ${quality.details.relevance || 0}
- Completitud: ${quality.details.completeness || 0}
- Utilidad: ${quality.details.helpfulness || 0}

Sugiere 1-3 mejoras concretas y específicas.
Responde con un array de strings.
`,
            task: 'reflection',
            temperature: 0.3,
          });
          
          const parsed = JSON.parse(suggestion.text || suggestion);
          if (Array.isArray(parsed)) {
            improvements.push(...parsed);
          }
        }
      } catch (error) {
        improvements.push('Considera ser más específico en la respuesta.');
        improvements.push('Incluye ejemplos concretos cuando sea posible.');
      }
    }
    
    if (response && response.length < 20) {
      improvements.push('La respuesta podría ser más detallada.');
    }
    
    if (query.length > 50 && response && response.length < 100) {
      improvements.push('Para consultas largas, se espera una respuesta más completa.');
    }
    
    if (improvements.length === 0) {
      improvements.push('Ninguna mejora significativa identificada.');
    }
    
    return improvements.slice(0, 5);
  }

  getReflections(sessionId, limit = 10) {
    return this.reflections
      .filter(r => r.sessionId === sessionId)
      .slice(-limit)
      .reverse();
  }

  getRecentReflections(limit = 20) {
    return this.reflections.slice(-limit).reverse();
  }

  getReflectionStats() {
    const reflections = this.reflections;
    if (reflections.length === 0) {
      return { total: 0, avgQuality: 0, totalImprovements: 0 };
    }
    
    const avgQuality = reflections.reduce((sum, r) => sum + (r.quality || 0.5), 0) / reflections.length;
    const totalImprovements = reflections.reduce((sum, r) => sum + (r.improvements?.length || 0), 0);
    
    return {
      total: reflections.length,
      avgQuality,
      totalImprovements,
      highQuality: reflections.filter(r => (r.quality || 0) > 0.7).length,
      lowQuality: reflections.filter(r => (r.quality || 0) < 0.4).length,
    };
  }

  async _onExecutionCompleted(data) {
    const { sessionId, taskId, response, results, plan } = data;
    if (sessionId) {
      await this.reflect({
        sessionId,
        query: plan?.steps?.[0]?.params?.query || 'Consulta ejecutada',
        response: response || plan?.responseDraft || 'Completado',
        context: { taskId, results },
        plan,
        results,
        traceId: data.traceId,
      });
    }
  }

  async _onExecutionFailed(data) {
    const { sessionId, taskId, error, plan } = data;
    if (sessionId) {
      await this.reflect({
        sessionId,
        query: plan?.steps?.[0]?.params?.query || 'Consulta fallida',
        response: `Error: ${error}`,
        context: { taskId, error },
        plan,
        traceId: data.traceId,
      });
    }
  }

  async _onResponseSent(data) {
    const { sessionId, query, response, context } = data;
    if (sessionId && query) {
      await this.reflect({
        sessionId,
        query,
        response,
        context,
        traceId: data.traceId,
      });
    }
  }

  getMetrics() {
    const stats = this.getReflectionStats();
    return {
      ...this.metrics,
      totalReflections: this.reflections.length,
      avgQuality: stats.avgQuality,
      totalImprovements: stats.totalImprovements,
      autoReflect: this.autoReflect,
    };
  }

  getStatus() {
    return {
      name: this.name,
      status: this.status,
      initialized: this.initialized,
      autoReflect: this.autoReflect,
      reflections: this.reflections.length,
      metrics: this.getMetrics(),
    };
  }

  async shutdown() {
    try {
      this.status = 'offline';
      this.initialized = false;
      
      logger.info('[ReflectionService] Apagado correctamente');
      return true;
    } catch (error) {
      logger.error('[ReflectionService] Error en shutdown', {
        error: error.message,
      });
      return false;
    }
  }
}

// Instancia por defecto
const reflectionService = new ReflectionService();

export default reflectionService;