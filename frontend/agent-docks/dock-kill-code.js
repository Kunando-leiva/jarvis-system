// frontend/agent-docks/dock-kill-code.js
import { DockBase } from './dock-base.js';

export class KillCodeDock extends DockBase {
  render() {
    const agent = this.agent;
    const lastResponse = this.getLastResponse();
    
    let html = this.renderHeader(agent, '⚡ Generador Automático de Código');
    
    html += `
      <div class="dock-content">
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>💻 GENERAR CÓDIGO</h4>
          <div class="input-group">
            <label>Lenguaje:</label>
            <select id="kc-language">
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="react">React</option>
              <option value="node">Node.js</option>
              <option value="html">HTML/CSS</option>
            </select>
          </div>
          <div class="input-group">
            <label>Requerimiento:</label>
            <textarea id="kc-prompt" rows="3" placeholder="Describe lo que quieres crear..."></textarea>
          </div>
          <button class="btn-primary" onclick="window.killCodeGenerate()" style="background:${this.color};">⚡ Generar Código</button>
        </div>

        ${lastResponse ? `
          <div class="section" style="border-left: 3px solid ${this.color};">
            <h4 style="color:${this.color};">📌 Último Código</h4>
            <div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:14px;font-size:0.9rem;line-height:1.8;max-height:250px;overflow-y:auto;white-space:pre-wrap;font-family:monospace;">
              ${this.formatText(lastResponse.text)}
            </div>
          </div>
        ` : ''}

        ${this.renderResponseArea('💻 Esperando proyecto...')}
        ${this.renderStats(agent)}
      </div>
    `;

    this.container.innerHTML = html;
    
    window._currentDock = this;
    window.killCodeGenerate = () => {
      const language = document.getElementById('kc-language')?.value;
      const prompt = document.getElementById('kc-prompt')?.value;
      
      if (!prompt) {
        alert('Describe lo que quieres crear.');
        return;
      }

      this.showLoading('💻 Generando código en ' + language + '...');
      this.sendMessage(`Genera código en ${language} para: ${prompt}. Proporciona el código completo con explicaciones.`);
    };
  }
}