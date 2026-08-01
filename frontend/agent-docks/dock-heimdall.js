// frontend/agent-docks/dock-heimdall.js
import { DockBase } from './dock-base.js';

export class HeimdallDock extends DockBase {
  render() {
    const agent = this.agent;
    const lastResponse = this.getLastResponse();
    
    let html = this.renderHeader(agent, '👁️ Vigilante de Métricas y Monitoreo del Sistema');
    
    html += `
      <div class="dock-content">
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>👁️ CONSULTAR MÉTRICAS</h4>
          <div class="input-group">
            <label>¿Qué quieres monitorear?</label>
            <input id="heimdall-query" placeholder="Ej: Estado del sistema, métricas de Instagram, rendimiento..." />
          </div>
          <button class="btn-primary" onclick="window.heimdallQuery()" style="background:${this.color};">👁️ Consultar</button>
        </div>

        ${lastResponse ? `
          <div class="section" style="border-left: 3px solid ${this.color};">
            <h4 style="color:${this.color};">📌 Último Reporte</h4>
            <div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:14px;font-size:0.9rem;line-height:1.8;max-height:250px;overflow-y:auto;white-space:pre-wrap;">
              ${this.formatText(lastResponse.text)}
            </div>
          </div>
        ` : ''}

        ${this.renderResponseArea('👁️ Todo en calma...')}
        ${this.renderStats(agent)}
      </div>
    `;

    this.container.innerHTML = html;
    
    window._currentDock = this;
    window.heimdallQuery = () => {
      const query = document.getElementById('heimdall-query')?.value;
      if (!query) {
        alert('Ingresa qué quieres consultar.');
        return;
      }
      this.showLoading('👁️ HEIMDALL observando...');
      this.sendMessage(`Monitorea: ${query}`);
    };
  }
}