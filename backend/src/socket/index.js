// backend/src/socket/index.js
// 🎯 TODA la configuración de Socket.io

import { Server } from 'socket.io';
import { getCurrentMode, setCurrentMode, detectModeSwitch } from '../state/appState.js';
import { getAIResponse } from '../controllers/aiController.js';
import { getSystemPrompt } from '../utils/loadPrompt.js';
import { sendActionToN8n } from '../services/n8nService.js';
import { agentRegistry } from '../agents/index.js';
import memoryService from '../services/memoryService.js';
import { readSkills, applyPatch, rollbackSkills } from '../controllers/healingController.js';
import { tryParseAction } from '../utils/textFormatter.js';

export function setupSocket(server) {
  const io = new Server(server, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.emit('state-change', { mode: getCurrentMode() });

    // ─── AGENTES ─────────────────────────────────────────────
    socket.emit('agents:list', agentRegistry.getAllAgents());

    socket.on('agents:request', () => {
      socket.emit('agents:list', agentRegistry.getAllAgents());
    });

    socket.on('agent:message', async ({ agentId, message, context }) => {
      try {
        console.log(`[Socket] Mensaje para ${agentId}: "${message}"`);
        const result = await agentRegistry.processMessage(message, agentId, context || {});
        socket.emit('agent:response', { agentId, result });
      } catch (error) {
        console.error('[Socket] Error en agent:message:', error.message);
        socket.emit('agent:error', { agentId, error: error.message });
      }
    });

    socket.on('agent:toggle', ({ agentId, enabled }) => {
      const agent = agentRegistry.getAgent(agentId);
      if (agent) {
        agent.enabled = enabled;
        socket.emit('agents:list', agentRegistry.getAllAgents());
        console.log(`[Socket] Agente ${agentId} ${enabled ? 'activado' : 'desactivado'}`);
      }
    });

    // ─── SELF-HEALING ──────────────────────────────────────
    socket.on('request-skills', async () => {
      try {
        const code = await readSkills();
        socket.emit('skills-content', { code });
        console.log('[Self-Healing] skills.js enviado al frontend para revisión.');
      } catch (err) {
        console.error('[Self-Healing] Error leyendo skills.js:', err.message);
        socket.emit('healing-error', { message: err.message });
      }
    });

    socket.on('approve-patch', async ({ code }) => {
      if (!code || typeof code !== 'string') {
        socket.emit('healing-error', { message: 'El parche enviado está vacío o es inválido.' });
        return;
      }

      try {
        const result = await applyPatch(code);
        socket.emit('patch-applied', result);
        console.log('[Self-Healing] Parche aplicado y confirmado al frontend.');
      } catch (err) {
        console.error('[Self-Healing] Parche rechazado:', err.message);
        socket.emit('healing-error', { message: err.message });
      }
    });

    socket.on('rollback-skills', async () => {
      try {
        const result = await rollbackSkills();
        socket.emit('rollback-result', result);
      } catch (err) {
        socket.emit('healing-error', { message: err.message });
      }
    });

    // ─── MENSAJES DE USUARIO ──────────────────────────────
    socket.on('user-message', async (message) => {
      try {
        const sessionId = `frontend_${socket.id}`;
        let contextoAnterior = {};
        
        try {
          contextoAnterior = await memoryService.getContext(sessionId);
        } catch (error) {}

        const requestedMode = detectModeSwitch(message);

        if (requestedMode && requestedMode !== getCurrentMode()) {
          setCurrentMode(requestedMode);
          io.emit('state-change', { mode: getCurrentMode() });
          console.log(`[state] modo cambiado a ${getCurrentMode()}`);
        }

        let systemPrompt = await getSystemPrompt(getCurrentMode());
        
        if (contextoAnterior && contextoAnterior.lastTopic) {
          systemPrompt += `\n\n⚠️ CONTEXTO DE CONVERSACIÓN ANTERIOR:
          El usuario ya dijo: "${contextoAnterior.lastTopic}"
          Tu respuesta fue: "${contextoAnterior.lastResponse}"
          
          📌 INSTRUCCIÓN: Esta es una CONTINUACIÓN. Responde considerando la conversación anterior.
          El usuario ahora dice: "${message}"`;
        }

        const { text, provider, fallback } = await getAIResponse(message, systemPrompt);

        try {
          await memoryService.saveContext(sessionId, {
            lastTopic: message,
            lastResponse: text,
            timestamp: new Date().toISOString()
          });
        } catch (error) {}

        const actionData = tryParseAction(text);

        if (actionData) {
          sendActionToN8n(actionData);
          socket.emit('ai-response', {
            text: actionData.textResponse,
            provider,
            fallback,
            mode: getCurrentMode(),
            action: actionData.action,
          });
        } else {
          socket.emit('ai-response', {
            text,
            provider,
            fallback,
            mode: getCurrentMode(),
          });
        }
      } catch (err) {
        console.error('[Socket] Error inesperado en cascada de IA:', err.message);
        socket.emit('ai-response', {
          text: 'Ocurrió un error inesperado. Intentá de nuevo.',
          provider: 'local',
          fallback: true,
          mode: getCurrentMode(),
        });
      }
    });

    // ─── EVENTOS DEL REGISTRO ─────────────────────────────
    agentRegistry.on('register', (data) => {
      io.emit('agent:registered', data);
      io.emit('agents:list', agentRegistry.getAllAgents());
    });

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });

  return io;
}