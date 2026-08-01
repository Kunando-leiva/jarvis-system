// frontend/agent-docks/dock-kill.js
import { DockBase } from './dock-base.js';

export class KillDock extends DockBase {
  render() {
    const agent = this.agent;
    const lastResponse = this.getLastResponse();
    
    let html = this.renderHeader(agent, '💀 Automatización Total - "Kill your to-do list"');
    
    html += `
      <div class="dock-content">
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>💀 AUTOMATIZAR TAREA</h4>
          <div class="input-group">
            <label>Describe la tarea a automatizar:</label>
            <textarea id="kill-task" rows="3" placeholder="Ej: Investiga tendencias de marketing, escribe un artículo, genera código para una app..."></textarea>
          </div>
          <button class="btn-primary" onclick="window.killExecute()" style="background:${this.color};">💀 EJECUTAR AUTOMATIZACIÓN</button>
        </div>

        ${lastResponse ? `
          <div class="section" style="border-left: 3px solid ${this.color};">
            <h4 style="color:${this.color};">📌 Última Automatización</h4>
            <div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:14px;font-size:0.9rem;line-height:1.8;max-height:250px;overflow-y:auto;white-space:pre-wrap;">
              ${this.formatText(lastResponse.text)}
            </div>
          </div>
        ` : ''}

        ${this.renderResponseArea('💀 Esperando una misión...')}
        ${this.renderStats(agent)}
      </div>
    `;

    this.container.innerHTML = html;
    
    window._currentDock = this;
    window.killExecute = () => {
      const task = document.getElementById('kill-task')?.value;
      if (!task) {
        alert('Describe la tarea que quieres automatizar.');
        return;
      }
      this.showLoading('💀 KILL está eliminando tu lista de pendientes...');
      this.sendMessage(`Automatiza: ${task}`);
    };
  }
}