// backend/src/socket/agentSocket.js
// Socket.io para comunicación en tiempo real con agentes

import { agentRegistry } from '../agents/index.js';

export function setupAgentSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Agente conectado: ${socket.id}`);

    // ──────────────────────────────────────────────────────────
    // 📤 ENVIAR LISTA DE AGENTES AL CONECTARSE
    // ──────────────────────────────────────────────────────────
    
    socket.emit('agents:list', agentRegistry.getAllAgents());

    // ──────────────────────────────────────────────────────────
    // 📨 ENVIAR MENSAJE A AGENTE
    // ──────────────────────────────────────────────────────────
    
    socket.on('agent:message', async ({ agentId, message, context }) => {
      try {
        const result = await agentRegistry.processMessage(
          message, 
          agentId, 
          context || {}
        );
        
        socket.emit('agent:response', {
          agentId,
          result,
          timestamp: new Date()
        });
      } catch (error) {
        socket.emit('agent:error', {
          agentId,
          error: error.message
        });
      }
    });

    // ──────────────────────────────────────────────────────────
    // 🎙️ COMANDOS DE VOZ
    // ──────────────────────────────────────────────────────────
    
    socket.on('voice:command', async ({ text }) => {
      // Detectar agente por palabra clave
      const lower = text.toLowerCase();
      let targetAgent = 'jarvis'; // default
      
      if (lower.includes('gideon') || lower.includes('comunidad')) {
        targetAgent = 'gideon';
      } else if (lower.includes('heimdall') || lower.includes('vigilancia')) {
        targetAgent = 'heimdall';
      }
      
      try {
        const result = await agentRegistry.processMessage(text, targetAgent, {
          source: 'voice'
        });
        
        socket.emit('voice:response', {
          agentId: targetAgent,
          text: result.text,
          timestamp: new Date()
        });
      } catch (error) {
        socket.emit('voice:error', {
          error: error.message
        });
      }
    });

    // ──────────────────────────────────────────────────────────
   // 🔄 EVENTOS DEL REGISTRO DE AGENTES
    // ──────────────────────────────────────────────────────────
    
    agentRegistry.on('message', (data) => {
      socket.emit('agent:activity', data);
    });

    agentRegistry.on('register', (data) => {
      socket.emit('agent:registered', data);
    });

    agentRegistry.on('unregister', (data) => {
      socket.emit('agent:unregistered', data);
    });

    // ──────────────────────────────────────────────────────────
    // ❌ DESCONEXIÓN
    // ──────────────────────────────────────────────────────────
    
    socket.on('disconnect', () => {
      console.log(`[Socket] Agente desconectado: ${socket.id}`);
    });
  });
}