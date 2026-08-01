// frontend/agent-docks/dock-kill-research.js
import { DockBase } from './dock-base.js';

export class KillResearchDock extends DockBase {
  render() {
    const agent = this.agent;
    const lastResponse = this.getLastResponse();
    
    let html = this.renderHeader(agent, '🔍 Investigación Automática en Internet');
    
    html += `
      <div class="dock-content">
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>🔍 INVESTIGAR</h4>
          <div class="input-group">
            <label>¿Qué quieres investigar?</label>
            <input id="research-topic" placeholder="Ej: Tendencias de marketing en Instagram 2026" />
          </div>
          <button class="btn-primary" onclick="window.killResearchStart()" style="background:${this.color};">🔍 Investigar</button>
        </div>

        ${lastResponse ? `
          <div class="section" style="border-left: 3px solid ${this.color};">
            <h4 style="color:${this.color};">📌 Última Investigación</h4>
            <div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:14px;font-size:0.9rem;line-height:1.8;max-height:250px;overflow-y:auto;white-space:pre-wrap;">
              ${this.formatText(lastResponse.text)}
            </div>
          </div>
        ` : ''}

        ${this.renderResponseArea('🔍 Esperando tema de investigación...')}
        ${this.renderStats(agent)}
      </div>
    `;

    this.container.innerHTML = html;
    
    window._currentDock = this;
    window.killResearchStart = () => {
      const topic = document.getElementById('research-topic')?.value;
      if (!topic) {
        alert('Ingresa un tema para investigar.');
        return;
      }
      this.showLoading('🔍 Investigando sobre "' + topic + '"...');
      this.sendMessage(`Investiga sobre: ${topic}`);
    };
  }
}