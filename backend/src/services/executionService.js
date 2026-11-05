// backend/src/services/executionService.js
// ⚡ SERVICIO DE EJECUCIÓN - Ejecuta planes paso a paso
// Recibe un plan del ReasoningService y lo ejecuta

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../core/logger.js';
import { eventBus } from '../core/eventBus.js';
import { BaseService } from '../core/serviceInterface.js';
import { aiProvider } from '../core/aiProvider.js';
import { toolRegistry } from '../core/toolRegistry.js';
import { taskManager } from '../core/taskManager.js';
import memoryService from './memoryService.js';
import longTermMemoryService from './longTermMemoryService.js';

export class ExecutionService extends BaseService {
  constructor(config = {}) {
    super(config);
    this.name = 'ExecutionService';
    this.memoryService = config.memoryService || memoryService;
    this.longTermMemory = config.longTermMemory || longTermMemoryService;
    this.aiProvider = config.aiProvider || aiProvider;
    this.toolRegistry = config.toolRegistry || toolRegistry;
    this.taskManager = config.taskManager || taskManager;
    this.maxConcurrent = config.maxConcurrent || 3;
    this.timeout = config.timeout || 60000;
  }

  async initialize() {
    try {
      this.status = 'initializing';
      
      // Asegurar que los servicios dependientes estén inicializados
      if (!this.memoryService.initialized) {
        await this.memoryService.initialize();
      }
      
      if (!this.longTermMemory.initialized) {
        await this.longTermMemory.initialize();
      }
      
      this.initialized = true;
      this.status = 'online';
      
      logger.info('[ExecutionService] Inicializado', {
        maxConcurrent: this.maxConcurrent,
        timeout: this.timeout,
      });
      
      eventBus.emit('execution:initialized', {
        maxConcurrent: this.maxConcurrent,
      });
      
      return true;
    } catch (error) {
      this.status = 'error';
      logger.error('[ExecutionService] Error inicializando', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Ejecuta un plan
   * @param {Object} plan - Plan a ejecutar (generado por ReasoningService)
   * @param {string} sessionId - ID de sesión
   * @param {Object} [options] - Opciones adicionales
   * @returns {Promise<Object>} Resultado de la ejecución
   */
  // backend/src/services/executionService.js

// backend/src/services/executionService.js

async executePlan(plan, sessionId, options = {}) {
  return this._measure('executePlan', async () => {
    const traceId = global.traceId || uuidv4();

    // ⭐ LOG para debug (opcional)
    logger.debug('[ExecutionService] Plan recibido', { 
      sessionId,
      hasPlan: !!plan,
      hasPlanText: !!(plan?.plan?.text),
      planKeys: Object.keys(plan || {})
    });

    // ⭐ Normalizar el plan - extraer steps y respuesta
    let steps = [];
    let responseText = null;
    let planData = plan;

    // 1. Si plan tiene plan.text (¡ESTE ES EL CASO REAL!)
    if (plan.plan && plan.plan.text) {
      responseText = plan.plan.text;
      // Si tiene steps, usarlos, si no, crear uno
      if (plan.plan.steps && plan.plan.steps.length > 0) {
        steps = plan.plan.steps;
      } else {
        steps = [{
          id: 'response',
          type: 'action',
          description: 'Respuesta generada',
          action: 'respond',
          output: responseText
        }];
      }
    } 
    // 2. Si plan tiene plan.output
    else if (plan.plan && plan.plan.output) {
      responseText = plan.plan.output;
      steps = [{
        id: 'response',
        type: 'action',
        description: 'Respuesta generada',
        action: 'respond',
        output: responseText
      }];
    }
    // 3. Si plan tiene text directamente
    else if (plan.text) {
      responseText = plan.text;
      steps = [{
        id: 'response',
        type: 'action',
        description: 'Respuesta generada',
        action: 'respond',
        output: responseText
      }];
    }
    // 4. Si plan tiene output
    else if (plan.output) {
      responseText = plan.output;
      steps = [{
        id: 'response',
        type: 'action',
        description: 'Respuesta generada',
        action: 'respond',
        output: responseText
      }];
    }
    // 5. Si plan tiene steps
    else if (plan.steps) {
      steps = plan.steps;
      if (steps.length > 0 && steps[0].output) {
        responseText = steps[0].output;
      } else {
        responseText = 'Procesado correctamente.';
      }
    }
    // 6. Si plan.plan tiene steps
    else if (plan.plan && plan.plan.steps) {
      steps = plan.plan.steps;
      if (steps.length > 0 && steps[0].output) {
        responseText = steps[0].output;
      } else {
        responseText = 'Procesado correctamente.';
      }
    }
    // 7. Si plan tiene response
    else if (plan.response) {
      responseText = plan.response;
      steps = [{
        id: 'response',
        type: 'action',
        description: 'Respuesta generada',
        action: 'respond',
        output: responseText
      }];
    }
    // 8. Si es un error
    else if (plan.success === false && plan.error) {
      responseText = `❌ Error: ${plan.error}`;
      steps = [{
        id: 'error',
        type: 'action',
        description: 'Error en el plan',
        action: 'respond',
        output: responseText
      }];
    }
    // 9. Fallback
    else {
      responseText = 'Procesado correctamente.';
      steps = [{
        id: 'response',
        type: 'action',
        description: 'Respuesta generada',
        action: 'respond',
        output: responseText
      }];
      logger.warn('[ExecutionService] No se pudo extraer respuesta del plan', { 
        sessionId,
        planKeys: Object.keys(plan || {})
      });
    }

    // ⭐ Verificar que steps es un array
    if (!Array.isArray(steps)) {
      steps = [steps];
    }

    if (steps.length === 0) {
      logger.warn('[ExecutionService] Plan sin pasos', { sessionId });
      return {
        success: false,
        error: 'Plan sin pasos',
        steps: [],
        executed: 0,
        response: 'No se pudo procesar el plan.'
      };
    }

    // ⭐ Ejecutar los pasos
    const results = [];
    let executed = 0;

    for (const step of steps) {
      try {
        logger.debug('[ExecutionService] Ejecutando paso', {
          sessionId,
          stepId: step.id,
          stepType: step.type,
          traceId
        });

        let result = await this._executeStep(step, sessionId, { traceId });
        results.push({ success: true, step, result });
        executed++;
      } catch (error) {
        logger.error('[ExecutionService] Error ejecutando paso', {
          sessionId,
          stepId: step.id,
          error: error.message,
          traceId
        });
        results.push({ success: false, step, error: error.message });
        break;
      }
    }

    const finalResponse = responseText || 
                         (results.length > 0 && results[0].success ? 
                          results[0].result?.output || results[0].result : 
                          'Procesado correctamente.');

    return {
      success: true,
      response: finalResponse,
      steps: steps,
      executed: executed,
      results: results,
      planId: plan.id || plan.plan?.id || null,
      taskId: `task_${Date.now()}_${uuidv4().slice(0, 6)}`
    };
  }, { sessionId: sessionId || 'unknown' });
}
  /**
   * Ejecuta un paso del plan
   * @private
   */
  async _executeStep(step, sessionId, traceId) {
    const { step: description, toolOrAgent, params = {} } = step;
    
    logger.debug('[ExecutionService] Ejecutando paso', {
      sessionId,
      traceId,
      step: description,
      toolOrAgent,
    });
    
    // Si es una respuesta de IA directa
    if (toolOrAgent === 'ai_response') {
      const response = await this.aiProvider.generate({
        prompt: params.query || params.text || 'Responde al usuario',
        systemPrompt: params.systemPrompt || 'Eres JARVIS, asistente útil.',
        task: 'execution',
        temperature: params.temperature || 0.7,
      });
      return response.text;
    }
    
    // Si es un servicio de memoria
    if (toolOrAgent === 'memoryService' || toolOrAgent === 'memory') {
      if (params.action === 'getContext') {
        return await this.memoryService.getContext(sessionId);
      }
      if (params.action === 'saveContext') {
        return await this.memoryService.saveContext(sessionId, params.data || {});
      }
      if (params.action === 'getHistory') {
        return await this.memoryService.getConversationHistory(sessionId, params.limit || 10);
      }
    }
    
    // Si es LongTermMemory
    if (toolOrAgent === 'longTermMemory' || toolOrAgent === 'memory_long') {
      if (params.action === 'getEpisodic') {
        return await this.longTermMemory.getRecentEpisodicEvents(sessionId, params.limit || 5);
      }
      if (params.action === 'getSemantic') {
        return await this.longTermMemory.getSemanticFact(sessionId, params.key);
      }
      if (params.action === 'saveSemantic') {
        return await this.longTermMemory.saveSemanticFact(
          sessionId,
          params.key,
          params.value,
          params.confidence || 0.8,
          params.metadata || {}
        );
      }
    }
    
    // Si es una herramienta registrada
    if (this.toolRegistry.get(toolOrAgent)) {
      try {
        return await this.toolRegistry.execute(toolOrAgent, params, { traceId });
      } catch (error) {
        // Si la herramienta falla, intentar con IA
        logger.warn('[ExecutionService] Herramienta falló, usando IA como fallback', {
          sessionId,
          traceId,
          tool: toolOrAgent,
          error: error.message,
        });
        
        const response = await this.aiProvider.generate({
          prompt: `La herramienta ${toolOrAgent} falló con el error: ${error.message}. 
                   Responde directamente al usuario sobre: ${params.query || params.text || 'la consulta'}`,
          task: 'execution',
        });
        return response.text;
      }
    }
    
    // Fallback: usar IA directamente
    const response = await this.aiProvider.generate({
      prompt: `El usuario pregunta sobre: ${params.query || params.text || description}`,
      systemPrompt: 'Eres JARVIS, asistente útil.',
      task: 'execution',
    });
    
    return response.text;
  }

  /**
   * Delega a un agente específico
   * @private
   */
  async _delegateToAgent(agentName, plan, sessionId, traceId) {
    try {
      // Buscar el agente en el registry
      const agents = this.knowledge.getAgents();
      const agent = agents.find(a => 
        a.name.toLowerCase() === agentName.toLowerCase() ||
        a.name.toLowerCase().includes(agentName.toLowerCase())
      );
      
      if (!agent) {
        logger.warn('[ExecutionService] Agente no encontrado', {
          agentName,
          available: agents.map(a => a.name),
        });
        return `No encontré al agente "${agentName}". Usando respuesta general: ${plan.responseDraft || 'Procesado.'}`;
      }
      
      // Importar y ejecutar el agente dinámicamente
      try {
        const modulePath = agent.path;
        const module = await import(modulePath);
        const agentInstance = module.default || module;
        
        if (typeof agentInstance.process === 'function') {
          const result = await agentInstance.process(
            plan.steps[0]?.params?.query || 'Consulta delegada',
            { sessionId, traceId, plan }
          );
          return result.text || result.response || 'Agente procesado correctamente.';
        }
      } catch (error) {
        logger.error('[ExecutionService] Error ejecutando agente', {
          agentName,
          error: error.message,
        });
      }
      
      return `Agente "${agentName}" ejecutado. Respuesta: ${plan.responseDraft || 'Procesado.'}`;
    } catch (error) {
      logger.error('[ExecutionService] Error delegando a agente', {
        agentName,
        error: error.message,
      });
      return plan.responseDraft || 'Error al delegar al agente.';
    }
  }

  /**
   * Genera respuesta final
   * @private
   */
  async _generateFinalResponse(plan, results, sessionId, traceId) {
    // Si hay un responseDraft y no hay resultados, usarlo
    if (plan.responseDraft && results.length === 0) {
      return plan.responseDraft;
    }
    
    // Si solo hay un resultado, usarlo
    if (results.length === 1 && results[0].success) {
      return results[0].result || plan.responseDraft;
    }
    
    // Combinar resultados en una respuesta coherente
    const successResults = results.filter(r => r.success);
    if (successResults.length === 0) {
      return plan.responseDraft || 'No se pudo completar la solicitud.';
    }
    
    // Si hay múltiples resultados, combinarlos
    const combined = successResults.map(r => r.result).filter(r => r).join('\n\n');
    if (combined) {
      return combined;
    }
    
    return plan.responseDraft || 'Procesado correctamente.';
  }

  // ─── MÉTRICAS Y ESTADO ──────────────────────────────────────

  getMetrics() {
    return {
      ...this.metrics,
      maxConcurrent: this.maxConcurrent,
      timeout: this.timeout,
    };
  }

  getStatus() {
    return {
      name: this.name,
      status: this.status,
      initialized: this.initialized,
      maxConcurrent: this.maxConcurrent,
      metrics: this.getMetrics(),
    };
  }

  async shutdown() {
    try {
      this.status = 'offline';
      this.initialized = false;
      
      logger.info('[ExecutionService] Apagado correctamente');
      return true;
    } catch (error) {
      logger.error('[ExecutionService] Error en shutdown', {
        error: error.message,
      });
      return false;
    }
  }
}

// Instancia por defecto
const executionService = new ExecutionService();

export default executionService;