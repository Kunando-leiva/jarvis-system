// frontend/agent-docks/dock-video-generator.js
import { DockBase } from './dock-base.js';

export class VideoGeneratorDock extends DockBase {
  render() {
    const agent = this.agent;
    const lastResponse = this.getLastResponse();
    
    let html = this.renderHeader(agent, '🎥 Generador Automático de Videos con IA Local');
    
    html += `
      <div class="dock-content">
        <!-- SECCIÓN 1: GENERAR VIDEO COMPLETO -->
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>🎬 GENERAR VIDEO COMPLETO</h4>
          <div class="input-group">
            <label>Guion o Tema:</label>
            <textarea id="vg-guion" rows="4" placeholder="Ej: La historia de Ragnar Lothbrok, el primer vikingo que llegó a Inglaterra..."></textarea>
          </div>
          <div class="input-group">
            <label>Título:</label>
            <input id="vg-titulo" placeholder="Título del video (opcional)" />
          </div>
          <button class="btn-primary" onclick="window.vgGenerarVideo()" style="background:${this.color};width:100%;">
            🎬 Generar Video
          </button>
        </div>

        <!-- SECCIÓN 2: GENERAR SOLO IMÁGENES -->
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>🎨 GENERAR IMÁGENES (Stable Diffusion)</h4>
          <div class="input-group">
            <label>Descripción:</label>
            <input id="vg-imagen" placeholder="Ej: Guerrero vikingo en batalla, cinematográfico, 4K" />
          </div>
          <button class="btn-primary" onclick="window.vgGenerarImagen()" style="background:${this.color};width:100%;">
            🎨 Generar Imagen
          </button>
        </div>

        <!-- SECCIÓN 3: GENERAR SOLO AUDIO -->
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>🎵 GENERAR NARRACIÓN (Edge TTS)</h4>
          <div class="input-group">
            <label>Texto a narrar:</label>
            <textarea id="vg-audio" rows="2" placeholder="Texto para convertir en voz..."></textarea>
          </div>
          <div class="input-group">
            <label>Voz:</label>
            <select id="vg-voz">
              <option value="es-ES-ElviraNeural">Elvira (Española)</option>
              <option value="es-MX-DaliaNeural">Dalia (Mexicana)</option>
              <option value="es-ES-AlvaroNeural">Álvaro (Español)</option>
            </select>
          </div>
          <button class="btn-primary" onclick="window.vgGenerarAudio()" style="background:${this.color};width:100%;">
            🎵 Generar Audio
          </button>
        </div>

        ${lastResponse ? `
          <div class="section" style="border-left: 3px solid ${this.color};">
            <h4 style="color:${this.color};">📌 Último Video Generado</h4>
            <div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:14px;font-size:0.9rem;line-height:1.8;max-height:250px;overflow-y:auto;white-space:pre-wrap;">
              ${this.formatText(lastResponse.text)}
            </div>
          </div>
        ` : ''}

        ${this.renderResponseArea('🎥 Esperando tu comando de video...')}
        ${this.renderStats(agent)}
      </div>
    `;

    this.container.innerHTML = html;
    
    window._currentDock = this;
    window._vgDock = this;

    // ─── FUNCIONES ──────────────────────────────────────────────
    window.vgGenerarVideo = () => {
      const guion = document.getElementById('vg-guion')?.value;
      const titulo = document.getElementById('vg-titulo')?.value || 'Video Automatizado';
      
      if (!guion || guion.trim().length < 10) {
        alert('Escribe un guión o tema para el video (mínimo 10 caracteres).');
        return;
      }

      this.showLoading('🎬 Generando video... (esto puede tomar varios minutos)');
      this.sendMessage(`Genera video: ${guion.trim()}. Título: ${titulo}`);
    };

    window.vgGenerarImagen = () => {
      const descripcion = document.getElementById('vg-imagen')?.value;
      
      if (!descripcion || descripcion.trim().length < 5) {
        alert('Describe la imagen que quieres generar.');
        return;
      }

      this.showLoading('🎨 Generando imagen con IA...');
      this.sendMessage(`Genera imagen: ${descripcion.trim()}`);
    };

    window.vgGenerarAudio = () => {
      const texto = document.getElementById('vg-audio')?.value;
      const voz = document.getElementById('vg-voz')?.value || 'es-ES-ElviraNeural';
      
      if (!texto || texto.trim().length < 10) {
        alert('Escribe el texto para la narración.');
        return;
      }

      this.showLoading('🎵 Generando audio...');
      this.sendMessage(`Genera audio con voz ${voz}: ${texto.trim()}`);
    };
  }
}