// frontend/agent-docks/dock-base.js
// Clase base para todos los docks de agentes

// frontend/agent-docks/dock-base.js
// Clase base para todos los docks de agentes

export class DockBase {
  constructor(agent, socket) {
    this.agent = agent;
    this.socket = socket;
    this.container = document.getElementById('dock-container');
    this.color = agent.color || '#00e5ff';
    
    // Inicializar agentHistory si no existe
    if (!window.agentHistory) {
      window.agentHistory = {};
    }

     if (!window.agentHistory[agent.id]) {
        window.agentHistory[agent.id] = [];
    }
    
    this.history = window.agentHistory[agent.id] || [];
  }

  // ─── RENDERIZAR EL DOCK (DEBE SER SOBREESCRITO) ───
  render() {
    throw new Error('El método render() debe ser implementado por cada dock');
  }

  // ─── OBTENER ÚLTIMA RESPUESTA ──────────────────────
  getLastResponse() {
    const history = this.history.filter(h => h.role === this.agent.id);
    return history.length > 0 ? history[history.length - 1] : null;
  }

  // ─── ENVIAR MENSAJE AL AGENTE ──────────────────────
  sendMessage(message) {
    if (!message || !message.trim()) return;
    
    // Asegurar que agentHistory existe
    if (!window.agentHistory) {
      window.agentHistory = {};
    }
    
    if (!window.agentHistory[this.agent.id]) {
      window.agentHistory[this.agent.id] = [];
    }
    
    window.agentHistory[this.agent.id].push({
      role: 'user',
      text: message,
      time: new Date().toLocaleTimeString()
    });

    // Enviar vía socket
    this.socket.emit('agent:message', {
      agentId: this.agent.id,
      message: message,
      context: { source: 'dock' }
    });
  }

  // ─── FORMATEAR TEXTO ──────────────────────────────
  formatText(text) {
    if (!text) return '';
    let formatted = text;
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/^# (.*)$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^---$/gm, '<hr style="border-color:rgba(255,255,255,0.1);margin:8px 0;">');
    formatted = formatted.replace(/^-\s(.*)$/gm, '• $1');
    formatted = formatted.replace(/^(\d+)\.\s(.*)$/gm, '<span style="color:var(--accent);font-weight:bold;">$1.</span> $2');
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    formatted = formatted.replace(/```([\s\S]*?)```/g, function(match, code) {
      return '<pre style="background:rgba(0,0,0,0.4);padding:10px;border-radius:6px;overflow-x:auto;font-size:0.8rem;border-left:3px solid var(--accent);"><code>' + code.trim() + '</code></pre>';
    });
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }

  // ─── ACTUALIZAR ÁREA DE RESPUESTA ──────────────────
  updateResponse(text) {
    const area = this.container.querySelector('.response-area');
    if (area) {
      area.innerHTML = this.formatText(text);
    }
  }

  // ─── MOSTRAR ESTADO DE CARGA ──────────────────────
  showLoading(message = '⏳ Procesando...') {
    const area = this.container.querySelector('.response-area');
    if (area) area.innerHTML = message;
  }

  // ─── HEADER COMÚN ──────────────────────────────────
  renderHeader(agent, subtitle) {
    return `
      <div class="dock-header">
        <div class="left">
          <span class="icon">${agent.icon || '🤖'}</span>
          <div>
            <div class="title" style="color:${this.color};">${agent.name}</div>
            <div class="subtitle">${subtitle || agent.description || ''}</div>
          </div>
        </div>
        <button class="dock-close" onclick="window.closeDock()">✕ Cerrar</button>
      </div>
    `;
  }

  // ─── ESTADÍSTICAS BÁSICAS ─────────────────────────
  renderStats(agent) {
    const tasks = agent.metrics?.tasksProcessed || 0;
    const avgTime = agent.metrics?.avgResponseTime || 0;
    return `
      <div class="section" style="border-color:${this.color}44;">
        <h4 style="color:${this.color};">📊 Estadísticas</h4>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(120px,1fr)); gap:12px;">
          <div><strong>Tareas:</strong> ${tasks}</div>
          <div><strong>Promedio:</strong> ${avgTime > 0 ? avgTime.toFixed(1) + 's' : '--'}</div>
          <div><strong>Estado:</strong> <span style="color:${this.color};">${agent.status || 'idle'}</span></div>
        </div>
      </div>
    `;
  }

  // ─── ÁREA DE RESPUESTA ────────────────────────────
  renderResponseArea(placeholder = 'Esperando interacción...') {
    return `
      <div class="section">
        <h4>📋 Respuesta</h4>
        <div class="response-area">${placeholder}</div>
      </div>
    `;
  }

  // ─── INPUT DE MENSAJE SIMPLE ──────────────────────
  renderSimpleInput(placeholder = 'Escribe tu mensaje...') {
    return `
      <div class="section" style="border-left: 4px solid ${this.color};">
        <h4>💬 Conversar con ${this.agent.name}</h4>
        <div class="input-group">
          <textarea class="dock-message-input" rows="3" placeholder="${placeholder}"></textarea>
        </div>
        <button class="btn-primary" onclick="window.sendDockMessage()" style="background:${this.color};">📤 Enviar mensaje</button>
      </div>
    `;
  }
}