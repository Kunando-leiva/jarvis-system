// backend/src/socket/index.js
// 🎯 SOCKET.IO - Coordinador de Conexiones
// Refactorizado para usar la nueva arquitectura (Fase 0)
// ✅ CON userId PERSISTENTE PARA MEMORIA COGNITIVA

import { Server } from 'socket.io';
import { logger, createTraceContext, withTraceContext } from '../core/logger.js';
import { eventBus } from '../core/eventBus.js';
import { taskManager } from '../core/taskManager.js';
import memoryService from '../services/memoryService.js';
import executionService from '../services/executionService.js';
import reflectionService from '../services/reflectionService.js';
import { getCurrentMode, setCurrentMode, detectModeSwitch } from '../state/appState.js';
import { getSystemPrompt } from '../utils/loadPrompt.js';
import { sendActionToN8n } from '../services/n8nService.js';
import { tryParseAction } from '../utils/textFormatter.js';
import { agentRegistry } from '../agents/index.js';
// 🧠 MEMORIA COGNITIVA
import { cognitiveMemory } from '../app.js';

/**
 * Configura el servidor Socket.io
 * @param {http.Server} server - Servidor HTTP
 * @param {Object} reasoningServiceInstance - Instancia de ReasoningService (inyectada desde app.js)
 * @returns {Server} Instancia de Socket.io
 */
export function setupSocket(server, reasoningServiceInstance) {
  const io = new Server(server, {
    cors: { origin: '*' },
  });

  // ⭐ Usar la instancia recibida como parámetro
  const reasoningService = reasoningServiceInstance;

  // Validar que reasoningService esté disponible
  if (!reasoningService || typeof reasoningService.createPlan !== 'function') {
    logger.error('[Socket] ❌ reasoningService no disponible o sin createPlan');
  } else {
    logger.info('[Socket] ✅ reasoningService inyectado correctamente');
  }

  // Suscribirse a eventos del sistema para broadcast
  eventBus.on('execution:completed', (data) => {
    io.emit('execution:completed', data);
  });

  eventBus.on('execution:failed', (data) => {
    io.emit('execution:failed', data);
  });

  eventBus.on('reflection:completed', (data) => {
    io.emit('reflection:completed', data);
  });

  eventBus.on('memory:message_saved', (data) => {
    io.emit('memory:message_saved', data);
  });

  io.on('connection', (socket) => {
    const traceId = createTraceContext().traceId;
    
    logger.info('[Socket] Cliente conectado', {
      socketId: socket.id,
      traceId,
    });

    // ✅ INICIALIZAR userId Y sessionId POR DEFECTO
    socket.userId = null;
    socket.sessionId = null;

    // ─── IDENTIFICACIÓN DEL USUARIO ────────────────────────────
    socket.on('identify', (data) => {
      socket.userId = data.userId || 'anonymous';
      socket.sessionId = data.sessionId || `session_${Date.now()}`;
      
      logger.info('[Socket] Usuario identificado', {
        socketId: socket.id,
        userId: socket.userId,
        sessionId: socket.sessionId,
      });
      
      // ✅ Responder confirmación
      socket.emit('identified', {
        userId: socket.userId,
        sessionId: socket.sessionId,
        cognitiveMemoryAvailable: !!(cognitiveMemory && cognitiveMemory.initialized)
      });
    });

    // ─── ESTADO INICIAL ──────────────────────────────────────────
    socket.emit('state-change', { mode: getCurrentMode() });
    socket.emit('agents:list', agentRegistry.getAllAgents());

    // ─── SOLICITAR LISTA DE AGENTES ─────────────────────────────
    socket.on('agents:request', () => {
      socket.emit('agents:list', agentRegistry.getAllAgents());
    });

    // ─── MENSAJE A AGENTE ──────────────────────────────────────
    socket.on('agent:message', async ({ agentId, message, context }) => {
      try {
        logger.debug('[Socket] Mensaje para agente', {
          socketId: socket.id,
          agentId,
          message: message.substring(0, 50),
        });

        const result = await agentRegistry.processMessage(message, agentId, context || {});
        socket.emit('agent:response', { agentId, result });
      } catch (error) {
        logger.error('[Socket] Error en agent:message', {
          socketId: socket.id,
          agentId,
          error: error.message,
        });
        socket.emit('agent:error', { agentId, error: error.message });
      }
    });

    // ─── TOGGLE AGENTE ──────────────────────────────────────────
    socket.on('agent:toggle', ({ agentId, enabled }) => {
      const agent = agentRegistry.getAgent(agentId);
      if (agent) {
        agent.enabled = enabled;
        socket.emit('agents:list', agentRegistry.getAllAgents());
        logger.info('[Socket] Agente toggled', {
          socketId: socket.id,
          agentId,
          enabled,
        });
      }
    });

    // ─── SELF-HEALING ──────────────────────────────────────────
    socket.on('request-skills', async () => {
      try {
        const { readSkills } = await import('../controllers/healingController.js');
        const code = await readSkills();
        socket.emit('skills-content', { code });
        logger.debug('[Socket] skills.js enviado', { socketId: socket.id });
      } catch (err) {
        logger.error('[Socket] Error leyendo skills.js', {
          socketId: socket.id,
          error: err.message,
        });
        socket.emit('healing-error', { message: err.message });
      }
    });

    socket.on('approve-patch', async ({ code }) => {
      if (!code || typeof code !== 'string') {
        socket.emit('healing-error', { message: 'El parche enviado está vacío o es inválido.' });
        return;
      }

      try {
        const { applyPatch } = await import('../controllers/healingController.js');
        const result = await applyPatch(code);
        socket.emit('patch-applied', result);
        logger.info('[Socket] Parche aplicado', { socketId: socket.id });
      } catch (err) {
        logger.error('[Socket] Error aplicando parche', {
          socketId: socket.id,
          error: err.message,
        });
        socket.emit('healing-error', { message: err.message });
      }
    });

    socket.on('rollback-skills', async () => {
      try {
        const { rollbackSkills } = await import('../controllers/healingController.js');
        const result = await rollbackSkills();
        socket.emit('rollback-result', result);
        logger.info('[Socket] Rollback aplicado', { socketId: socket.id });
      } catch (err) {
        logger.error('[Socket] Error en rollback', {
          socketId: socket.id,
          error: err.message,
        });
        socket.emit('healing-error', { message: err.message });
      }
    });

    // ─── MENSAJE DE USUARIO (FLUJO PRINCIPAL) ──────────────────
    // ✅ SOPORTA TANTO STRING COMO OBJETO CON userId Y sessionId
    socket.on('user-message', async (message, options = {}) => {
      // Ejecutar con traceId para trazabilidad completa
      await withTraceContext(async (context) => {
        const traceId = context.traceId;
        
        // ✅ EXTRAER userId Y sessionId
        let userId, sessionId;
        
        // Soporte para nuevo formato (objeto con message, userId, sessionId)
        if (typeof message === 'object' && message !== null) {
          userId = message.userId || socket.userId || 'anonymous';
          sessionId = message.sessionId || socket.sessionId || `session_${Date.now()}`;
          message = message.message || message.text || '';
        } else {
          // Formato antiguo (string)
          userId = socket.userId || 'anonymous';
          sessionId = options.sessionId || socket.sessionId || `session_${Date.now()}`;
        }
        
        // Si no hay userId, usar el del socket o generar uno
        if (!userId || userId === 'anonymous') {
          userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          socket.userId = userId;
          logger.info('[Socket] userId generado automáticamente', { userId, socketId: socket.id });
        }
        
        // Guardar en el socket para futuros mensajes
        socket.userId = userId;
        socket.sessionId = sessionId;
        
        logger.info('[Socket] Mensaje de usuario', {
          socketId: socket.id,
          userId,
          sessionId,
          message: message.substring(0, 100),
          traceId,
        });

        try {
          // ─── 1. GUARDAR MENSAJE DEL USUARIO ────────────────────
          await memoryService.saveMessage(sessionId, 'user', message, {
            source: 'socket',
            traceId,
          });

          // 🧠 ─── 1.5 MEMORIA COGNITIVA ─────────────────────────────
          if (cognitiveMemory && cognitiveMemory.initialized) {
            try {
              // ✅ EXTRAER Y GUARDAR HECHOS CON userId
              const facts = await cognitiveMemory.extractAndRemember(message, { 
                userId,
                sessionId,
                tags: ['socket', 'user']
              });
              
              if (facts.length > 0) {
                logger.debug('[Socket] Hechos extraídos en memoria cognitiva', {
                  userId,
                  sessionId,
                  facts: facts.length,
                  traceId
                });
              }
              
            } catch (memError) {
              // No bloquear el flujo principal si falla la memoria
              logger.warn('[Socket] Error en memoria cognitiva (no bloqueante)', {
                error: memError.message,
                userId,
                sessionId,
                traceId
              });
            }
          }

          // ─── 2. DETECTAR CAMBIO DE MODO ────────────────────────
          const requestedMode = detectModeSwitch(message);
          if (requestedMode && requestedMode !== getCurrentMode()) {
            setCurrentMode(requestedMode);
            io.emit('state-change', { mode: getCurrentMode() });
            logger.info('[Socket] Modo cambiado', {
              socketId: socket.id,
              newMode: requestedMode,
              traceId,
            });
          }

          // ─── 3. VERIFICAR QUE REASONING SERVICE ESTÉ DISPONIBLE ──
          if (!reasoningService || typeof reasoningService.createPlan !== 'function') {
            throw new Error('ReasoningService no disponible');
          }

          // ─── 4. CREAR PLAN CON EL REASONING SERVICE ────────────
          // ✅ PASAR userId Y sessionId
          const result = await reasoningService.createPlan(message, userId, sessionId, {
            traceId,
            mode: getCurrentMode(),
          });

          // ⭐ Extraer el plan de la respuesta
          let plan = result;
          if (result.plan && result.plan.steps) {
            plan = result.plan;
          } else if (result.steps) {
            plan = result;
          } else if (result.output) {
            plan = {
              steps: [{
                id: 'response',
                type: 'action',
                description: 'Respuesta generada',
                action: 'respond',
                output: result.output
              }]
            };
          }

          // ─── 5. SI NECESITA ACLARACIÓN ──────────────────────────
          if (plan.needsClarification) {
            socket.emit('ai-response', {
              text: plan.clarificationQuestion || 'Necesito más información para continuar.',
              provider: 'reasoning',
              fallback: false,
              mode: getCurrentMode(),
              planId: plan.id || null,
              needsClarification: true,
            });
            
            await memoryService.saveMessage(sessionId, 'assistant', 
              plan.clarificationQuestion || 'Necesito más información.', 
              { source: 'reasoning', traceId }
            );
            return;
          }

          // ─── 6. EJECUTAR EL PLAN ────────────────────────────────
          const executionResult = await executionService.executePlan(plan, sessionId, {
            traceId,
            mode: getCurrentMode(),
          });

          // ─── 7. PROCESAR RESULTADO ──────────────────────────────
          let responseText = executionResult.response || plan.responseDraft || 'Procesado correctamente.';
          
          const actionData = tryParseAction(responseText);
          if (actionData) {
            sendActionToN8n(actionData);
            responseText = actionData.textResponse || responseText;
          }

          // ─── 8. GUARDAR RESPUESTA ──────────────────────────────
          await memoryService.saveMessage(sessionId, 'assistant', responseText, {
            source: 'execution',
            traceId,
            planId: plan.id || null,
            taskId: executionResult.taskId || null,
          });

          // 🧠 ─── 8.5 GUARDAR RESPUESTA EN MEMORIA COGNITIVA ──────
          if (cognitiveMemory && cognitiveMemory.initialized) {
            try {
              await cognitiveMemory.remember(responseText, {
                type: 'context',
                source: 'system',
                userId,
                sessionId,
                importance: 2,
                tags: ['conversation', 'response']
              });
            } catch (memError) {
              // No bloquear
            }
          }

          // ─── 9. EMITIR RESPUESTA AL FRONTEND ────────────────────
          socket.emit('ai-response', {
            text: responseText,
            provider: 'execution',
            fallback: false,
            mode: getCurrentMode(),
            planId: plan.id || null,
            taskId: executionResult.taskId || null,
          });

          // ─── 10. EMITIR EVENTO DE RESPUESTA ENVIADA ──────────────
          eventBus.emit('response_sent', {
            userId,
            sessionId,
            query: message,
            response: responseText,
            context: { plan, executionResult },
            traceId,
          });

          // ─── 11. REFLEXIÓN (ASINCRÓNICA, NO BLOQUEA) ───────────
          setImmediate(async () => {
            try {
              await reflectionService.reflect({
                userId,
                sessionId,
                query: message,
                response: responseText,
                context: { plan, executionResult },
                plan,
                results: executionResult.results || [],
                traceId,
              });
            } catch (err) {
              logger.warn('[Socket] Error en reflexión (no bloqueante)', {
                userId,
                sessionId,
                error: err.message,
                traceId,
              });
            }
          });

          logger.info('[Socket] Mensaje procesado', {
            socketId: socket.id,
            userId,
            sessionId,
            traceId,
            responseLength: responseText.length,
            planId: plan.id || null,
          });

        } catch (error) {
          logger.error('[Socket] Error procesando mensaje', {
            socketId: socket.id,
            userId,
            sessionId,
            error: error.message,
            stack: error.stack,
            traceId,
          });

          const errorText = 'Ocurrió un error procesando tu mensaje. Por favor, intenta de nuevo.';
          
          await memoryService.saveMessage(sessionId, 'assistant', errorText, {
            source: 'error',
            traceId,
            error: error.message,
          });

          socket.emit('ai-response', {
            text: errorText,
            provider: 'error',
            fallback: true,
            mode: getCurrentMode(),
            error: error.message,
          });
        }
      });
    });

    // ─── COMANDOS DE VOZ ──────────────────────────────────────────
    socket.on('voice:command', async ({ text }) => {
      logger.debug('[Socket] Comando de voz', {
        socketId: socket.id,
        text: text.substring(0, 50),
      });

      const lower = text.toLowerCase();
      let targetAgent = 'jarvis';
      
      if (lower.includes('gideon') || lower.includes('comunidad')) {
        targetAgent = 'gideon';
      } else if (lower.includes('heimdall') || lower.includes('vigilancia')) {
        targetAgent = 'heimdall';
      } else if (lower.includes('kill')) {
        targetAgent = 'kill';
      }
      
      try {
        const result = await agentRegistry.processMessage(text, targetAgent, {
          source: 'voice',
          socketId: socket.id,
        });
        
        socket.emit('voice:response', {
          agentId: targetAgent,
          text: result.text,
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error('[Socket] Error en voice:command', {
          socketId: socket.id,
          error: error.message,
        });
        socket.emit('voice:error', {
          error: error.message,
        });
      }
    });

    // ─── EVENTOS DEL REGISTRO DE AGENTES ────────────────────────
    agentRegistry.on('message', (data) => {
      socket.emit('agent:activity', data);
    });

    agentRegistry.on('register', (data) => {
      io.emit('agent:registered', data);
      io.emit('agents:list', agentRegistry.getAllAgents());
    });

    agentRegistry.on('unregister', (data) => {
      io.emit('agent:unregistered', data);
      io.emit('agents:list', agentRegistry.getAllAgents());
    });

    // ─── DESCONEXIÓN ─────────────────────────────────────────────
    socket.on('disconnect', () => {
      logger.info('[Socket] Cliente desconectado', {
        socketId: socket.id,
        userId: socket.userId,
        traceId: global.traceId || 'no-trace',
      });
    });
  });

  logger.info('[Socket] Socket.io configurado correctamente');
  return io;
}

export default setupSocket;