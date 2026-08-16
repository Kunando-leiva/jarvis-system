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
    // 🔥 USAR EL SESSION ID ENVIADO DESDE EL FRONTEND
    const sessionId = options.sessionId || `frontend_${socket.id}`;
    
    console.log(`[Memory] 📝 Sesión: ${sessionId}`);
    console.log(`[Memory] 📝 Mensaje: "${message}"`);
    
    // 🔥 GUARDAR MENSAJE DEL USUARIO
    await memoryService.saveMessage(sessionId, 'user', message);
    
    // 🔥 OBTENER CONTEXTO ANTERIOR
    let contextoAnterior = {};
    try {
      contextoAnterior = await memoryService.getContext(sessionId);
    } catch (error) {}

    // Detectar cambio de modo
    const requestedMode = detectModeSwitch(message);
    if (requestedMode && requestedMode !== getCurrentMode()) {
      setCurrentMode(requestedMode);
      io.emit('state-change', { mode: getCurrentMode() });
      console.log(`[state] modo cambiado a ${getCurrentMode()}`);
    }

    // 🔥 OBTENER HISTORIAL COMPLETO (ÚLTIMOS 15 MENSAJES)
    const historial = await memoryService.getConversationHistory(sessionId, 15);
    
    // Obtener el system prompt base (TU PROMPT)
    let systemPrompt = await getSystemPrompt(getCurrentMode());
    
    // ─── CONSTRUIR CONTEXTO DE FORMA INTELIGENTE ───
    if (historial && historial.length > 0) {
      // Extraer información clave del historial de forma inteligente
      const textoCompleto = historial.map(m => m.content).join(' ');
      
      // Detectar si el usuario está preguntando por algo específico
      const preguntandoColor = /color|favorito|preferido|amarillo|azul|rojo|verde|negro|blanco|morado|naranja|rosa|gris|marrón|violeta|celeste|turquesa/i.test(message);
      const preguntandoPelicula = /película|pelicula|favorita|preferida|capitan|avengers|marvel|dc|star wars|harry potter|señor de los anillos|batman|superman/i.test(message);
      const preguntandoNombre = /nombre|llamo|como te llamas|quien eres|soy/i.test(message);
      const preguntandoGenero = /música|genero|banda|canción|artista|favorito|preferido/i.test(message);
      
      let infoRecordada = '';
      
      // Buscar información SOLO si el usuario pregunta
      if (preguntandoColor) {
        const colores = ['amarillo', 'azul', 'rojo', 'verde', 'negro', 'blanco', 'morado', 
                         'naranja', 'rosa', 'gris', 'marrón', 'violeta', 'celeste', 'turquesa'];
        for (const color of colores) {
          if (textoCompleto.toLowerCase().includes(color)) {
            infoRecordada += `- Color favorito: ${color}\n`;
            break;
          }
        }
      }
      
      if (preguntandoPelicula) {
        const peliculas = ['capitan america', 'capitán américa', 'avengers', 'iron man', 'spiderman', 
                         'thor', 'hulk', 'black panther', 'star wars', 'harry potter', 'el señor de los anillos',
                         'batman', 'superman', 'deadpool', 'wolverine', 'la liga de la justicia'];
        for (const pelicula of peliculas) {
          if (textoCompleto.toLowerCase().includes(pelicula)) {
            infoRecordada += `- Película favorita: ${pelicula}\n`;
            break;
          }
        }
      }
      
      if (preguntandoNombre) {
        const nombreMatch = textoCompleto.match(/mi nombre es ([A-Za-záéíóúñÁÉÍÓÚÑ\s]+)/i) || 
                            textoCompleto.match(/me llamo ([A-Za-záéíóúñÁÉÍÓÚÑ\s]+)/i) ||
                            textoCompleto.match(/soy ([A-Za-záéíóúñÁÉÍÓÚÑ\s]+)/i);
        if (nombreMatch) {
          infoRecordada += `- Nombre: ${nombreMatch[1].trim()}\n`;
        }
      }
      
      if (preguntandoGenero) {
        const generos = ['rock', 'pop', 'metal', 'clasica', 'jazz', 'blues', 'electronica', 'reggae', 
                         'hip hop', 'rap', 'indie', 'alternativo', 'punk', 'folk', 'country'];
        for (const genero of generos) {
          if (textoCompleto.toLowerCase().includes(genero)) {
            infoRecordada += `- Género musical: ${genero}\n`;
            break;
          }
        }
      }
      
      // SOLO añadir al prompt si hay información relevante y el usuario preguntó
      if (infoRecordada) {
        systemPrompt += `\n\n📌 **INFORMACIÓN RECORDADA (relevante para la pregunta):**\n${infoRecordada}`;
        systemPrompt += `\n⚠️ **INSTRUCCIÓN:** Usa esta información SOLO si el usuario preguntó por ella. Sé natural, no la repitas innecesariamente.`;
      }
      
      // Añadir historial resumido (solo últimos 5 mensajes, truncados)
      let historialResumido = '\n\n📜 **CONTEXTO RECIENTE:**\n';
      const ultimosMensajes = historial.slice(-5);
      for (const msg of ultimosMensajes) {
        const rol = msg.role === 'user' ? 'Usuario' : 'JARVIS';
        const contenido = msg.content.length > 120 ? msg.content.substring(0, 120) + '...' : msg.content;
        historialResumido += `${rol}: ${contenido}\n`;
      }
      
      systemPrompt += historialResumido;
      systemPrompt += `\n⚠️ **INSTRUCCIÓN FINAL:** El historial es para contexto. NO repitas información ya confirmada. Sé conciso y natural, como un mayordomo británico competente.`;
      
    } else if (contextoAnterior && contextoAnterior.lastTopic) {
      // Fallback: si no hay historial pero hay contexto guardado
      systemPrompt += `\n\n⚠️ CONTEXTO DE CONVERSACIÓN ANTERIOR:
      El usuario mencionó: "${contextoAnterior.lastTopic}"
      Tu respuesta fue: "${contextoAnterior.lastResponse}"
      
      📌 INSTRUCCIÓN: Esta es una CONTINUACIÓN. Responde considerando la conversación anterior.
      El usuario ahora dice: "${message}"`;
    }

    // ─── OBTENER RESPUESTA DE LA IA ──────────────────────
    const { text, provider, fallback } = await getAIResponse(message, systemPrompt);

    // 🔥 GUARDAR RESPUESTA DEL AGENTE
    await memoryService.saveMessage(sessionId, 'assistant', text);

    // 🔥 GUARDAR CONTEXTO ACTUALIZADO
    try {
      await memoryService.saveContext(sessionId, {
        lastTopic: message,
        lastResponse: text,
        timestamp: new Date().toISOString()
      });
    } catch (error) {}

    // ─── ENVIAR RESPUESTA AL FRONTEND ─────────────────────
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