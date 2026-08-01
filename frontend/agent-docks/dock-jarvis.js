// frontend/agent-docks/dock-jarvis.js
import { DockBase } from './dock-base.js';

export class JarvisDock extends DockBase {
  render() {
    const agent = this.agent;
    const lastResponse = this.getLastResponse();
    
    let html = this.renderHeader(agent, '🧠 Planificador Estratégico y Coordinador');
    
    html += `
      <div class="dock-content">
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>📋 PLANIFICAR ESTRATEGIA</h4>
          <div class="input-group">
            <label>¿Qué necesitas planificar?</label>
            <input id="jarvis-plan-input" type="text" placeholder="Ej: Estrategia de contenido para la semana, Plan de lanzamiento..." />
          </div>
          <button class="btn-primary" onclick="window.jarvisPlan()" style="background:${this.color};">📋 Generar Plan</button>
        </div>

        ${lastResponse ? `
          <div class="section" style="border-left: 3px solid ${this.color};">
            <h4 style="color:${this.color};">📌 Último Plan</h4>
            <div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:14px;font-size:0.9rem;line-height:1.8;max-height:250px;overflow-y:auto;white-space:pre-wrap;">
              ${this.formatText(lastResponse.text)}
            </div>
          </div>
        ` : ''}

        ${this.renderResponseArea('🧠 Esperando tu comando, señor...')}
        ${this.renderStats(agent)}
      </div>
    `;

    this.container.innerHTML = html;
    
    // Guardar referencia del dock para eventos
    window._currentDock = this;
    window.jarvisPlan = () => {
      const input = document.getElementById('jarvis-plan-input');
      if (!input || !input.value.trim()) {
        alert('Por favor, ingresa qué quieres planificar');
        return;
      }
      this.showLoading('🧠 JARVIS está planificando...');
      this.sendMessage(`Planifica: ${input.value.trim()}`);
      input.value = '';
    };
  }
}