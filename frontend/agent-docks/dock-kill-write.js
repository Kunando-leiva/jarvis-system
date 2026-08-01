// frontend/agent-docks/dock-kill-write.js
import { DockBase } from './dock-base.js';

export class KillWriteDock extends DockBase {
  render() {
    const agent = this.agent;
    const lastResponse = this.getLastResponse();
    
    let html = this.renderHeader(agent, '✍️ Escritura Automática de Alta Calidad');
    
    html += `
      <div class="dock-content">
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>✍️ GENERAR CONTENIDO</h4>
          <div class="input-group">
            <label>Tema:</label>
            <input id="write-topic" placeholder="Ej: La historia de Ragnar Lothbrok" />
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div class="input-group" style="flex-direction:column;">
              <label>Tipo:</label>
              <select id="write-type">
                <option value="post">📱 Post Instagram</option>
                <option value="blog">📝 Artículo/Blog</option>
                <option value="guion">🎬 Guión Video</option>
                <option value="copy">📢 Copywriting</option>
              </select>
            </div>
            <div class="input-group" style="flex-direction:column;">
              <label>Tono:</label>
              <select id="write-tone">
                <option value="epico">⚔️ Épico/Nórdico</option>
                <option value="profesional">💼 Profesional</option>
                <option value="divertido">😂 Divertido</option>
                <option value="informativo">📚 Informativo</option>
              </select>
            </div>
          </div>
          <button class="btn-primary" onclick="window.killWriteGenerate()" style="background:${this.color};">✍️ Generar Contenido</button>
        </div>

        ${lastResponse ? `
          <div class="section" style="border-left: 3px solid ${this.color};">
            <h4 style="color:${this.color};">📌 Último Contenido</h4>
            <div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:14px;font-size:0.9rem;line-height:1.8;max-height:250px;overflow-y:auto;white-space:pre-wrap;">
              ${this.formatText(lastResponse.text)}
            </div>
          </div>
        ` : ''}

        ${this.renderResponseArea('✍️ Esperando tema para escribir...')}
        ${this.renderStats(agent)}
      </div>
    `;

    this.container.innerHTML = html;
    
    window._currentDock = this;
    window.killWriteGenerate = () => {
      const topic = document.getElementById('write-topic')?.value;
      const type = document.getElementById('write-type')?.value || 'post';
      const tone = document.getElementById('write-tone')?.value || 'epico';
      
      if (!topic) {
        alert('Ingresa un tema para el contenido.');
        return;
      }

      this.showLoading('✍️ Generando contenido tipo "' + type + '"...');
      this.sendMessage(`Genera contenido tipo "${type}" con tono "${tone}" sobre: ${topic}`);
    };
  }
}