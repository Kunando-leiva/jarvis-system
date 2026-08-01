// backend/src/services/jarvisMetricsService.js
// Métricas de JARVIS - Agentes y sistema

import { agentRegistry } from '../agents/index.js';

class JarvisMetricsService {
  constructor() {
    this.metrics = {
      startTime: new Date(),
      totalMessages: 0,
      totalErrors: 0,
      agentUsage: {},
      messageHistory: []
    };
  }

  // ─── REGISTRAR USO DE AGENTE ────────────────────────────────────
  logAgentUsage(agentId, message, response) {
    if (!this.metrics.agentUsage[agentId]) {
      this.metrics.agentUsage[agentId] = {
        count: 0,
        messages: []
      };
    }
    
    this.metrics.agentUsage[agentId].count++;
    this.metrics.agentUsage[agentId].messages.push({
      message: message.substring(0, 100),
      response: response.substring(0, 100),
      timestamp: new Date().toISOString()
    });

    // Limitar historial
    if (this.metrics.agentUsage[agentId].messages.length > 50) {
      this.metrics.agentUsage[agentId].messages.shift();
    }

    this.metrics.totalMessages++;
  }

  // ─── REGISTRAR ERROR ─────────────────────────────────────────────
  logError(error) {
    this.metrics.totalErrors++;
    console.error('[Jarvis Metrics] ❌ Error registrado:', error.message);
  }

  // ─── OBTENER MÉTRICAS ───────────────────────────────────────────
  getMetrics() {
    const uptime = Math.floor((Date.now() - new Date(this.metrics.startTime).getTime()) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    // Obtener agentes del registry
    const agents = agentRegistry.getAllAgents();
    const agentStatus = agents.map(a => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      status: a.status,
      tasks: this.metrics.agentUsage[a.id]?.count || 0,
      color: a.color
    }));

    return {
      system: {
        uptime: `${hours}h ${minutes}m ${seconds}s`,
        startTime: this.metrics.startTime,
        totalMessages: this.metrics.totalMessages,
        totalErrors: this.metrics.totalErrors,
        activeAgents: agents.filter(a => a.enabled).length,
        totalAgents: agents.length
      },
      agents: agentStatus,
      usage: this.metrics.agentUsage
    };
  }

  // ─── MÉTRICAS SIMULADAS (para pruebas) ──────────────────────────
  getSimulatedMetrics() {
    return {
      getSimulatedMetrics() {
  // 🔥 USAR TUS DATOS REALES DEL CURL
  return {
    username: 'reino_valhalla',
    name: 'Reino de Valhalla',
    followers_count: 96,
    media_count: 28,
    biography: '⚔️ Descubrí el mito, la sangre y la gloria del Norte.',
    insights: {
      data: [
        { name: 'reach', title: 'Alcance', total_value: { value: 500 } },
        { name: 'likes', title: 'Likes', total_value: { value: 31 } },
        { name: 'comments', title: 'Comentarios', total_value: { value: 43 } },
        { name: 'saved', title: 'Guardados', total_value: { value: 4 } },
        { name: 'shares', title: 'Compartidos', total_value: { value: 0 } },
        { name: 'profile_views', title: 'Visitas al Perfil', total_value: { value: 6 } }
      ]
    }
  };
},
      agents: [
        { id: 'jarvis', name: 'JARVIS', icon: '🧠', status: 'done', tasks: 345, color: '#00e5ff' },
        { id: 'gideon', name: 'GIDEON', icon: '⚔️', status: 'idle', tasks: 234, color: '#ffb800' },
        { id: 'heimdall', name: 'HEIMDALL', icon: '👁️', status: 'idle', tasks: 56, color: '#00ff88' },
        { id: 'kill', name: 'KILL', icon: '💀', status: 'idle', tasks: 89, color: '#ff0044' },
        { id: 'kill-research', name: 'KILL-RESEARCH', icon: '🔍', status: 'thinking', tasks: 67, color: '#00d4ff' },
        { id: 'kill-write', name: 'KILL-WRITE', icon: '✍️', status: 'done', tasks: 78, color: '#ff6b6b' },
        { id: 'kill-code', name: 'KILL-CODE', icon: '💻', status: 'idle', tasks: 45, color: '#00ff88' }
      ],
      usage: {}
    };
  }

  // ─── LIMPIAR MÉTRICAS ────────────────────────────────────────────
  clearMetrics() {
    this.metrics = {
      startTime: new Date(),
      totalMessages: 0,
      totalErrors: 0,
      agentUsage: {},
      messageHistory: []
    };
    console.log('[Jarvis Metrics] 🧹 Métricas limpiadas');
  }
}

export default new JarvisMetricsService();