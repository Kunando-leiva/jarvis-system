// frontend/js/panels/BasePanel.js
// 🎯 Panel base para todos los agentes
// ✅ MODIFICA ESTE ARCHIVO PARA CAMBIAR EL DISEÑO DE TODOS LOS PANELES

import { state } from '../core/state.js';
import { formatText } from '../utils/formatters.js';

export class BasePanel {
  constructor(agent, container) {
    this.agent = agent;
    this.container = container;
  }

  render() {
    const agent = this.agent;
    const history = state.getHistory(agent.id);
    const lastResponse = history.filter(h => h.role === agent.id).pop();
    const color = agent.color || '#00e5ff';
    const status = agent.status || 'idle';
    
    this.container.innerHTML = `
      <!-- ===== HEADER ===== -->
      <div class="panel-header" style="--agent-color:${color};">
        <span class="panel-icon">${agent.icon || '🤖'}</span>
        <div>
          <span class="panel-title">${agent.name}</span>
          <span class="panel-status ${status === 'idle' ? 'offline' : 'online'}">
            ${status === 'idle' ? '💤' : '⚡'} ${status}
          </span>
        </div>
        <span style="margin-left:auto;font-size:0.7rem;color:#6a7a8a;">
          ${agent.enabled !== false ? '✅ Activo' : '⛔ Desactivado'}
        </span>
      </div>

      <!-- ===== DESCRIPCIÓN ===== -->
      <div class="panel-description">${agent.description || 'Sin descripción'}</div>

      <!-- ===== ESTADÍSTICAS ===== -->
      <div class="panel-stats">
        <div class="stat-card">
          <div class="stat-value">${agent.metrics?.tasksProcessed || 0}</div>
          <div class="stat-label">Tareas</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${agent.metrics?.avgResponseTime ? agent.metrics.avgResponseTime.toFixed(1) + 's' : '--'}</div>
          <div class="stat-label">Tiempo promedio</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${history.length}</div>
          <div class="stat-label">Mensajes</div>
        </div>
      </div>

      <!-- ===== ACCIONES RÁPIDAS ===== -->
      <div class="panel-actions">
        <button class="btn-primary" onclick="window._basePanel.sendQuickPrompt('Saludar')">👋 Saludar</button>
        <button class="btn-primary" onclick="window._basePanel.sendQuickPrompt('Ayúdame a planificar mi semana')">📋 Planificar</button>
        <button class="btn-primary" onclick="window._basePanel.sendQuickPrompt('Resumen de tus capacidades')">📖 Resumen</button>
        <button class="btn-secondary" onclick="window._basePanel.toggleAgent()">
          ${agent.enabled !== false ? '⛔ Desactivar' : '✅ Activar'}
        </button>
      </div>

      <!-- ===== ÚLTIMA RESPUESTA ===== -->
      ${lastResponse ? `
        <div class="panel-section" style="border-left:3px solid ${color};">
          <h4 style="color:${color};">📌 Última Respuesta</h4>
          <div class="panel-response">${formatText(lastResponse.text)}</div>
        </div>
      ` : ''}

      <!-- ===== HISTORIAL ===== -->
      <div class="panel-history">
        <div class="history-title">💬 Conversaciones (${history.length})</div>
        ${history.length === 0 ? `
          <div style="color:#6a7a8a;text-align:center;padding:20px;font-size:0.8rem;">
            Sin conversaciones aún
          </div>
        ` : `
          ${history.slice(-15).reverse().map(h => `
            <div class="history-item ${h.role === 'error' ? 'error' : ''}">
              <span class="h-time">${h.time || '--:--'}</span>
              <span class="h-msg">
                ${h.role === 'user' ? '👤 Tú' : '🤖 ' + (h.role === agent.id ? agent.name : h.role)}:
                ${h.text.substring(0, 100)}${h.text.length > 100 ? '...' : ''}
              </span>
            </div>
          `).join('')}
        `}
      </div>

      <!-- ===== FOOTER ===== -->
      <div style="margin-top:12px;font-size:0.65rem;color:#6a7a8a;display:flex;gap:16px;">
        <span>🆔 ${agent.id}</span>
        <span>📅 ${agent.createdAt ? new Date(agent.createdAt).toLocaleString() : '--'}</span>
      </div>
    `;

    // Guardar referencia para acciones
    window._basePanel = this;
  }

  // ─── ENVIAR MENSAJE RÁPIDO ──────────────────────────────────
  sendQuickPrompt(message) {
    const fullMessage = `${message}`;
    // Emitir evento para que el chat lo maneje
    const event = new CustomEvent('quickPrompt', { 
      detail: { agentId: this.agent.id, message: fullMessage }
    });
    document.dispatchEvent(event);
  }

  // ─── TOGGLE AGENTE ──────────────────────────────────────────
  toggleAgent() {
    const newState = !this.agent.enabled;
    socketManager.toggleAgent(this.agent.id, newState);
  }
}