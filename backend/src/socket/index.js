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
socket.on('user-message', async (message, options = {}) => {
  try {
    const sessionId = options.sessionId || `frontend_${socket.id}`;
    
    console.log(`[Memory] 📝 Sesión: ${sessionId}`);
    console.log(`[Memory] 📝 Mensaje: "${message}"`);
    
    // 🔥 GUARDAR MENSAJE DEL USUARIO
    await memoryService.saveMessage(sessionId, 'user', message);
    
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

    // 🔥 OBTENER HISTORIAL COMPLETO
    const historial = await memoryService.getConversationHistory(sessionId, 10);
    
    let systemPrompt = await getSystemPrompt(getCurrentMode());
    
    // 🔥 CONSTRUIR CONTEXTO CON EL HISTORIAL COMPLETO - VERSIÓN MEJORADA
    if (historial && historial.length > 0) {
      let contextoCompleto = '\n\n⚠️ **HISTORIAL DE CONVERSACIÓN (IMPORTANTE):**\n';
      
      // Mostrar TODOS los mensajes relevantes
      for (const msg of historial) {
        const rol = msg.role === 'user' ? '👤 Usuario' : '🤖 JARVIS';
        contextoCompleto += `\n${rol}: ${msg.content}`;
      }
      
      // 🔥 EXTRAER INFORMACIÓN CLAVE DEL HISTORIAL
      contextoCompleto += `\n\n📌 **INFORMACIÓN QUE DEBES RECORDAR:**`;
      
      const textoCompleto = historial.map(m => m.content).join(' ');
      
      // Buscar colores
      const colores = ['amarillo', 'azul', 'rojo', 'verde', 'negro', 'blanco', 'morado', 'naranja', 'rosa', 'gris', 'marrón', 'violeta', 'celeste', 'turquesa', 'fucsia', 'bordo', 'beige', 'ocre', 'carmesí', 'esmeralda', 'rubí', 'zafiro'];
      for (const color of colores) {
        if (textoCompleto.toLowerCase().includes(color)) {
          contextoCompleto += `\n- Color favorito: ${color}`;
          break;
        }
      }
      
      // Buscar nombres
      const nombresMatch = textoCompleto.match(/mi nombre es ([A-Za-záéíóúñÁÉÍÓÚÑ]+)/i) || 
                            textoCompleto.match(/me llamo ([A-Za-záéíóúñÁÉÍÓÚÑ]+)/i) ||
                            textoCompleto.match(/soy ([A-Za-záéíóúñÁÉÍÓÚÑ]+)/i);
      if (nombresMatch) {
        contextoCompleto += `\n- Nombre: ${nombresMatch[1]}`;
      }
      
      // Buscar intereses
      const intereses = ['mitología', 'vikingos', 'historia', 'música', 'cine', 'deporte', 'lectura', 'viajes', 'fotografía', 'arte', 'tecnología', 'inteligencia artificial', 'programación'];
      const interesesEncontrados = intereses.filter(i => textoCompleto.toLowerCase().includes(i));
      if (interesesEncontrados.length > 0) {
        contextoCompleto += `\n- Intereses: ${interesesEncontrados.join(', ')}`;
      }
      
      contextoCompleto += `\n\n📌 **INSTRUCCIONES IMPORTANTES:**`;
      contextoCompleto += `\n1. SI el usuario pregunta algo que ya está en el historial, RESPONDE con esa información directamente.`;
      contextoCompleto += `\n2. NO digas "no tengo información" si ya está en el historial.`;
      // contextoCompleto += `\n3. SI el usuario pregunta "¿Cuál es mi color favorito?" y el historial dice "amarillo", RESPONDE "Tu color favorito es el amarillo".`;
      contextoCompleto += `\n4. Siempre prioriza la información del historial sobre cualquier otra cosa.`;
      
      systemPrompt += contextoCompleto;
    } else if (contextoAnterior && contextoAnterior.lastTopic) {
      // Fallback: si no hay historial pero hay contexto
      systemPrompt += `\n\n⚠️ CONTEXTO DE CONVERSACIÓN ANTERIOR:
      El usuario ya dijo: "${contextoAnterior.lastTopic}"
      Tu respuesta fue: "${contextoAnterior.lastResponse}"
      
      📌 INSTRUCCIÓN: Esta es una CONTINUACIÓN. Responde considerando la conversación anterior.
      El usuario ahora dice: "${message}"`;
    }

    const { text, provider, fallback } = await getAIResponse(message, systemPrompt);

    // 🔥 GUARDAR RESPUESTA DEL AGENTE
    await memoryService.saveMessage(sessionId, 'assistant', text);

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