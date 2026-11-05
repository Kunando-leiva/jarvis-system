// backend/src/core/aiProvider.js
// Abstracción de IA con políticas comunes (reintentos, timeouts, cuotas, métricas)

import { v4 as uuidv4 } from 'uuid';
import { logger, createTraceContext } from './logger.js';
import { callGroq, callGemini, callOpenRouter, FALLBACK_TEXT } from '../config/ai.js';

// Configuración de modelos por tarea
const MODEL_TASK_MAP = {
  reasoning: {
    primary: process.env.REASONING_MODEL || 'groq',
    fallbacks: ['gemini', 'openrouter'],
    timeout: 30000,
    maxRetries: 3,
  },
  execution: {
    primary: process.env.EXECUTION_MODEL || 'gemini',
    fallbacks: ['groq', 'openrouter'],
    timeout: 60000,
    maxRetries: 3,
  },
  reflection: {
    primary: process.env.REFLECTION_MODEL || 'groq',
    fallbacks: ['openrouter'],
    timeout: 20000,
    maxRetries: 2,
  },
};

// Mapa de funciones de proveedores
const PROVIDER_FUNCTIONS = {
  groq: callGroq,
  gemini: callGemini,
  openrouter: callOpenRouter,
};

// Métricas de uso
const metrics = {
  totalCalls: 0,
  successfulCalls: 0,
  failedCalls: 0,
  byModel: {},
  byTask: {},
};

/**
 * Clase AI Provider - Abstracción de modelos de IA
 */
export class AIProvider {
  constructor(config = {}) {
    this.config = config;
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.taskConfig = config.taskConfig || MODEL_TASK_MAP;
    
    // 🔥 SOPORTE PARA PRUEBAS: permitir inyección de proveedores mock
    this._providerFunctions = config.providerFunctions || null;
    this._providers = config.providers || null;
  }

  /**
   * Genera una respuesta usando el modelo adecuado para la tarea
   * @param {Object} params
   * @param {string} params.prompt - Prompt del usuario
   * @param {string} [params.systemPrompt] - System prompt
   * @param {string} [params.task] - Tipo de tarea ('reasoning', 'execution', 'reflection')
   * @param {number} [params.temperature] - Temperatura (0-1)
   * @param {number} [params.timeout] - Timeout en ms (sobreescribe el de la tarea)
   * @param {number} [params.maxRetries] - Máximo de reintentos
   * @param {Object} [params.metadata] - Metadatos adicionales
   * @returns {Promise<{ text: string, provider: string, model: string, traceId: string }>}
   */
  async generate(params) {
    const {
      prompt,
      systemPrompt = '',
      task = 'execution',
      temperature = 0.7,
      timeout,
      maxRetries,
      metadata = {},
    } = params;

    const traceId = global.traceId || uuidv4();
    const startTime = Date.now();
    const taskConfig = this.taskConfig[task] || this.taskConfig.execution;

    const effectiveTimeout = timeout || taskConfig.timeout || this.timeout;
    const effectiveMaxRetries = maxRetries || taskConfig.maxRetries || this.maxRetries;

    // Actualizar métricas
    metrics.totalCalls++;
    if (!metrics.byTask[task]) metrics.byTask[task] = { attempts: 0, successes: 0, failures: 0 };
    metrics.byTask[task].attempts++;

    logger.debug(`[AIProvider] Generando respuesta`, {
      traceId,
      task,
      promptLength: prompt?.length || 0,
      timeout: effectiveTimeout,
      maxRetries: effectiveMaxRetries,
      temperature,
    });

    // 🔥 CONSTRUIR LISTA DE PROVEEDORES
    // Si hay proveedores inyectados (para pruebas), usarlos
    let providers = [];
    
    if (this._providers) {
      // Si se inyectaron proveedores específicos
      providers = Array.isArray(this._providers) ? this._providers : [this._providers];
    } else {
      // Usar la configuración normal
      providers = [taskConfig.primary, ...(taskConfig.fallbacks || [])];
    }

    let lastError = null;

    for (let attempt = 0; attempt < effectiveMaxRetries; attempt++) {
      for (const providerName of providers) {
        try {
          // 🔥 OBTENER LA FUNCIÓN DEL PROVEEDOR
          let providerFn = null;
          
          // 1. Si hay funciones inyectadas (para pruebas), usarlas
          if (this._providerFunctions && this._providerFunctions[providerName]) {
            providerFn = this._providerFunctions[providerName];
          }
          // 2. Si hay funciones inyectadas genéricas (para pruebas)
          else if (this._providerFunctions && typeof this._providerFunctions === 'function') {
            providerFn = this._providerFunctions;
          }
          // 3. Usar las funciones reales
          else {
            providerFn = PROVIDER_FUNCTIONS[providerName];
          }
          
          if (!providerFn) {
            logger.warn(`[AIProvider] Proveedor no disponible: ${providerName}`, { traceId });
            continue;
          }

          logger.debug(`[AIProvider] Intentando con ${providerName} (intento ${attempt + 1})`, { traceId });

          // Llamar al proveedor con timeout
          const result = await this._callWithTimeout(
            () => providerFn(prompt, systemPrompt),
            effectiveTimeout,
            traceId
          );

          // Actualizar métricas
          metrics.successfulCalls++;
          metrics.byTask[task].successes++;
          if (!metrics.byModel[providerName]) metrics.byModel[providerName] = 0;
          metrics.byModel[providerName]++;

          const duration = Date.now() - startTime;
          logger.info(`[AIProvider] Respuesta generada con ${providerName}`, {
            traceId,
            task,
            provider: providerName,
            duration,
            responseLength: result?.length || 0,
          });

          return {
            text: result,
            provider: providerName,
            model: providerName,
            traceId,
          };

        } catch (error) {
          const duration = Date.now() - startTime;
          logger.warn(`[AIProvider] Error con ${providerName} (intento ${attempt + 1})`, {
            traceId,
            task,
            provider: providerName,
            duration,
            error: error.message,
          });
          lastError = error;
          // Continúa al siguiente proveedor
        }
      }
    }

    // Todos los proveedores fallaron
    metrics.failedCalls++;
    metrics.byTask[task].failures++;

    logger.error(`[AIProvider] Todos los proveedores fallaron para la tarea ${task}`, {
      traceId,
      task,
      error: lastError?.message,
    });

    return {
      text: FALLBACK_TEXT,
      provider: 'local',
      model: 'fallback',
      traceId,
    };
  }

  /**
   * Llama a una función con timeout
   * @private
   */
  async _callWithTimeout(fn, timeout, traceId) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout después de ${timeout}ms`));
      }, timeout);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Obtiene métricas del provider
   */
  getMetrics() {
    return { ...metrics };
  }

  /**
   * Obtiene el estado del provider
   */
  getStatus() {
    return {
      status: 'online',
      providers: Object.keys(PROVIDER_FUNCTIONS),
      metrics: this.getMetrics(),
    };
  }

  /**
   * 🔥 MÉTODO PARA PRUEBAS: Inyectar proveedores mock
   */
  injectProviders(providers) {
    this._providers = providers;
    return this;
  }

  /**
   * 🔥 MÉTODO PARA PRUEBAS: Inyectar funciones de proveedores
   */
  injectProviderFunctions(functions) {
    this._providerFunctions = functions;
    return this;
  }
}

// Instancia por defecto
export const aiProvider = new AIProvider();

export default aiProvider;