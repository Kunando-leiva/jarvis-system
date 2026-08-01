// frontend/agent-docks/dock-growth-marketer.js
// Dock del agente Growth Marketer

import { DockBase } from './dock-base.js';

export class GrowthMarketerDock extends DockBase {
  render() {
    const agent = this.agent;
    const lastResponse = this.getLastResponse();
    
    let html = this.renderHeader(agent, '📈 Consultor de Growth Marketing y Monetización Digital');
    
    html += `
      <div class="dock-content">
        <!-- SECCIÓN COMANDOS RÁPIDOS -->
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>⚡ COMANDOS RÁPIDOS</h4>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <button class="btn-secondary" onclick="window.gmCommand('/analizar')" style="font-size:0.7rem;">📋 Analizar</button>
            <button class="btn-secondary" onclick="window.gmCommand('/recomendar')" style="font-size:0.7rem;">🎯 Recomendar</button>
            <button class="btn-secondary" onclick="window.gmCommand('/tendencias')" style="font-size:0.7rem;">🔥 Tendencias</button>
            <button class="btn-secondary" onclick="window.gmCommand('/crecimiento')" style="font-size:0.7rem;">📊 Crecimiento</button>
            <button class="btn-secondary" onclick="window.gmCommand('/monetizar')" style="font-size:0.7rem;">💰 Monetizar</button>
            <button class="btn-secondary" onclick="window.gmCommand('/embudo')" style="font-size:0.7rem;">🔄 Embudo</button>
            <button class="btn-secondary" onclick="window.gmCommand('/competencia')" style="font-size:0.7rem;">🔍 Competencia</button>
            <button class="btn-secondary" onclick="window.gmCommand('/gancho')" style="font-size:0.7rem;">🎯 Gancho</button>
          </div>
        </div>

        <!-- SECCIÓN COMANDO PERSONALIZADO -->
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>💬 COMANDO PERSONALIZADO</h4>
          <div class="input-group">
            <input id="gm-input" type="text" placeholder="/analizar, /recomendar, /tendencias..." style="width:100%;padding:10px 14px;border-radius:6px;border:1px solid var(--border-color);background:rgba(0,0,0,0.3);color:var(--text-primary);font-size:0.85rem;" />
          </div>
          <button class="btn-primary" onclick="window.gmSend()" style="background:${this.color};width:100%;">
            📤 Enviar Comando
          </button>
        </div>

        ${lastResponse ? `
          <div class="section" style="border-left: 3px solid ${this.color};">
            <h4 style="color:${this.color};">📌 Último Análisis</h4>
            <div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:14px;font-size:0.9rem;line-height:1.8;max-height:350px;overflow-y:auto;white-space:pre-wrap;font-family:'Segoe UI',system-ui,sans-serif;color:#e8edf5;">
              ${this.formatText(lastResponse.text)}
            </div>
          </div>
        ` : ''}

        ${this.renderResponseArea('📈 Esperando tu comando de Growth Marketing...')}
        ${this.renderStats(agent)}
      </div>
    `;

    this.container.innerHTML = html;
    
    window._currentDock = this;
    window._gmDock = this;

    // ─── FUNCIONES ──────────────────────────────────────────────
    window.gmCommand = (command) => {
      document.getElementById('gm-input').value = command;
      window.gmSend();
    };

    window.gmSend = () => {
      const input = document.getElementById('gm-input');
      const message = input.value.trim();
      
      if (!message) {
        alert('Escribe un comando (ej: /analizar)');
        return;
      }

      this.showLoading(`📈 Procesando ${message}...`);
      this.sendMessage(message);
      input.value = '';
    };
  }
}