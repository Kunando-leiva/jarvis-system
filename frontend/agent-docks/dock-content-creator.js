// frontend/agent-docks/dock-content-creator.js
import { DockBase } from './dock-base.js';

export class ContentCreatorDock extends DockBase {
  render() {
    const agent = this.agent;
    const lastResponse = this.getLastResponse();
    
    let html = this.renderHeader(agent, '🎥 Generador de Guiones Virales para Reels/TikTok');
    
    html += `
      <div class="dock-content">
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>📝 GENERAR GUIÓN</h4>
          <div class="input-group">
            <label>Tema del video:</label>
            <input id="cc-topic" placeholder="Ej: Ragnar Lothbrok en Inglaterra, La Batalla de Hafrsfjord..." />
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div class="input-group" style="flex-direction:column;">
              <label>Duración (segundos):</label>
              <input id="cc-duration" type="number" value="45" min="15" max="90" />
            </div>
            <div class="input-group" style="flex-direction:column;">
              <label>Estilo:</label>
              <select id="cc-style">
                <option value="cinematográfico">🎬 Cinematográfico</option>
                <option value="fotorrealista">🎨 Fotorrealista</option>
                <option value="retrato">📸 Retrato</option>
                <option value="paisaje">🏔️ Paisaje</option>
                <option value="artístico">🎭 Artístico</option>
              </select>
            </div>
          </div>
          <button class="btn-primary" onclick="window.contentCreatorGenerate()" style="background:${this.color};">🎬 Generar Guión</button>
        </div>

        ${lastResponse ? `
          <div class="section" style="border-left: 3px solid ${this.color};">
            <h4 style="color:${this.color};">📌 Último Guión</h4>
            <div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:14px;font-size:0.9rem;line-height:1.8;max-height:250px;overflow-y:auto;white-space:pre-wrap;">
              ${this.formatText(lastResponse.text)}
            </div>
          </div>
        ` : ''}

        ${this.renderResponseArea('🎬 Esperando idea creativa...')}
        ${this.renderStats(agent)}
      </div>
    `;

    this.container.innerHTML = html;
    
    window._currentDock = this;
    window.contentCreatorGenerate = () => {
      const topic = document.getElementById('cc-topic')?.value;
      const duration = document.getElementById('cc-duration')?.value || 45;
      const style = document.getElementById('cc-style')?.value || 'cinematográfico';
      
      if (!topic) {
        alert('Ingresa un tema para el video.');
        return;
      }

      this.showLoading('🎬 Generando guión para "' + topic + '"...');
      this.sendMessage(`Crea un guión para un Reels de ${duration} segundos sobre "${topic}" con estilo ${style}. Usa formato épico.`);
    };
  }
}