// frontend/js/core/state.js
// 🎯 Estado global de la aplicación

import { CONFIG, DEFAULT_AGENT, DEFAULT_THEME } from './config.js';

class AppState {
  constructor() {
    this.currentAgent = DEFAULT_AGENT;
    this.currentTheme = DEFAULT_THEME;
    this.isVoiceEnabled = false;
    this.isListening = false;
    this.agentHistory = {};
    this.agentsList = [];
    this.socketConnected = false;
    this.observers = [];
  }

  getAgent(id) {
    return CONFIG.agents[id] || null;
  }
  
  getTheme(name) {
    return CONFIG.themes[name] || CONFIG.themes[DEFAULT_THEME];
  }
  
  getCurrentAgent() {
    return this.getAgent(this.currentAgent);
  }
  
  getHistory(agentId) {
    if (!this.agentHistory[agentId]) {
      this.agentHistory[agentId] = [];
    }
    return this.agentHistory[agentId];
  }

  setAgent(agentId) {
    if (CONFIG.agents[agentId]) {
      this.currentAgent = agentId;
      this.notify('agentChange', { agentId });
      return true;
    }
    return false;
  }
  
  setTheme(themeName) {
    if (CONFIG.themes[themeName]) {
      this.currentTheme = themeName;
      document.body.setAttribute('data-theme', themeName);
      this.notify('themeChange', { themeName });
      return true;
    }
    return false;
  }
  
  toggleVoice() {
    this.isVoiceEnabled = !this.isVoiceEnabled;
    this.notify('voiceToggle', { enabled: this.isVoiceEnabled });
    return this.isVoiceEnabled;
  }
  
  toggleListening() {
    this.isListening = !this.isListening;
    this.notify('listeningToggle', { listening: this.isListening });
    return this.isListening;
  }

  addHistory(agentId, entry) {
    const history = this.getHistory(agentId);
    history.push({
      role: entry.role || 'user',
      text: entry.text,
      time: entry.time || new Date().toLocaleTimeString(),
      ...entry
    });
    this.notify('historyUpdate', { agentId, history });
  }

  setAgentsList(agents) {
    this.agentsList = agents;
    this.notify('agentsUpdate', { agents });
  }

  subscribe(callback) {
    this.observers.push(callback);
  }
  
  notify(event, data) {
    this.observers.forEach(cb => {
      try { cb(event, data); } catch (e) {}
    });
  }
}

export const state = new AppState();