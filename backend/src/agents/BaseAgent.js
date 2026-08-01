// backend/src/agents/BaseAgent.js
// Clase base para todos los agentes

import { getAIResponse } from '../controllers/aiController.js';

export class BaseAgent {
  constructor(config) {
    this.id = config.id || 'agent_' + Date.now();
    this.name = config.name || 'Agente';
    this.icon = config.icon || '🤖';
    this.description = config.description || 'Agente sin descripción';
    this.color = config.color || '#00e5ff';
    this.status = 'idle';
    this.enabled = config.enabled !== false;
    this.systemPrompt = config.systemPrompt || '';
    this.skills = config.skills || [];
    this.createdAt = new Date();
    this.lastActivity = null;
    this.metrics = {
      tasksProcessed: 0,
      avgResponseTime: 0,
      totalResponseTime: 0
    };
  }

  async process(message, context = {}) {
    if (!this.enabled) {
      throw new Error(`Agente ${this.name} está deshabilitado`);
    }

    this.status = 'thinking';
    this.lastActivity = new Date();
    const startTime = Date.now();

    try {
      const prompt = this.buildPrompt(message, context);
      const { text, provider } = await getAIResponse(message, prompt);
      
      this.status = 'executing';
      this.metrics.tasksProcessed++;
      this.metrics.totalResponseTime += (Date.now() - startTime);
      this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.tasksProcessed;

      const result = await this.handleResponse(text, message, context);
      this.status = 'done';
      return result;
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  buildPrompt(message, context) {
    return this.systemPrompt;
  }

  async handleResponse(text, message, context) {
    return { text, provider: 'ai' };
  }

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      status: this.status,
      description: this.description,
      color: this.color,
      metrics: this.metrics,
      lastActivity: this.lastActivity,
      enabled: this.enabled
    };
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}