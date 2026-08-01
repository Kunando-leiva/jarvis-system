// frontend/js/core/socket.js
// 🎯 Gestión de Socket.io

import { CONFIG } from './config.js';
import { state } from './state.js';

class SocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.eventHandlers = {};
  }

  connect() {
    if (this.socket) return;
    
    this.socket = io(CONFIG.serverUrl);
    
    this.socket.on('connect', () => {
      console.log('✅ Socket conectado');
      this.connected = true;
      state.socketConnected = true;
      this.emit('agents:request');
    });
    
    this.socket.on('disconnect', () => {
      console.log('❌ Socket desconectado');
      this.connected = false;
      state.socketConnected = false;
    });
    
    this.socket.on('agents:list', (agents) => {
      state.setAgentsList(agents);
      this.trigger('agentsList', agents);
    });
    
    this.socket.on('agent:response', (data) => {
      const agentId = data.agentId || 'jarvis';
      const text = data.result?.text || 'Procesado correctamente';
      state.addHistory(agentId, { role: agentId, text: text });
      this.trigger('agentResponse', { agentId, text, data });
    });
    
    this.socket.on('agent:error', (data) => {
      const agentId = data.agentId || state.currentAgent;
      state.addHistory(agentId, {
        role: 'error',
        text: `❌ Error: ${data.error || 'Error desconocido'}`
      });
      this.trigger('agentError', data);
    });
    
    this.socket.on('state-change', (data) => {
      if (data.mode) {
        state.setTheme(data.mode);
      }
      this.trigger('stateChange', data);
    });
    
    this.socket.on('ai-response', (data) => {
      this.trigger('aiResponse', data);
    });
    
    this.socket.on('skills-content', (data) => {
      this.trigger('skillsContent', data);
    });
    
    this.socket.on('patch-applied', (data) => {
      this.trigger('patchApplied', data);
    });
    
    this.socket.on('healing-error', (data) => {
      this.trigger('healingError', data);
    });
    
    this.socket.on('rollback-result', (data) => {
      this.trigger('rollbackResult', data);
    });
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  trigger(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try { handler(data); } catch (e) {}
      });
    }
  }

  sendMessage(agentId, message, context = {}) {
    this.emit('agent:message', { agentId, message, context });
  }
  
  sendUserMessage(message) {
    this.emit('user-message', message);
  }
  
  toggleAgent(agentId, enabled) {
    this.emit('agent:toggle', { agentId, enabled });
  }
  
  requestSkills() {
    this.emit('request-skills');
  }
  
  approvePatch(code) {
    this.emit('approve-patch', { code });
  }
  
  rollbackSkills() {
    this.emit('rollback-skills');
  }
}

export const socketManager = new SocketManager();