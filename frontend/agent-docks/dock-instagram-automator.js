// frontend/agent-docks/dock-instagram-automator.js
import { DockBase } from './dock-base.js';

export class InstagramAutomatorDock extends DockBase {
  render() {
    const agent = this.agent;
    const lastResponse = this.getLastResponse();
    
    let html = this.renderHeader(agent, '📱 Automatización Completa para Instagram');
    
    html += `
      <div class="dock-content">
        <!-- ACCIÓN RÁPIDA 1: AUTOMATIZACIÓN COMPLETA -->
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>🚀 AUTOMATIZACIÓN COMPLETA</h4>
          <p style="color:var(--text-secondary);font-size:0.8rem;margin-bottom:12px;">
            Genera guiones, captions, investiga tendencias y programa todo en un solo comando.
          </p>
          <button class="btn-primary" onclick="window.instaAutoFull()" style="background:${this.color};width:100%;">
            ⚡ Ejecutar Automatización Completa
          </button>
        </div>

        <!-- ACCIÓN RÁPIDA 2: PLAN DE CONTENIDO -->
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>📋 PLAN DE CONTENIDO</h4>
          <div class="input-group">
            <label>Días a planificar:</label>
            <select id="insta-days">
              <option value="7">7 días</option>
              <option value="14">14 días</option>
              <option value="30">30 días</option>
            </select>
          </div>
          <button class="btn-primary" onclick="window.instaPlan()" style="background:${this.color};width:100%;">
            📋 Generar Plan de Contenido
          </button>
        </div>

        <!-- PROGRAMACIÓN DE HISTORIAS -->
        <div class="section" style="border-left:4px solid ${this.color};">
          <h4>📲 PROGRAMAR HISTORIA</h4>
          <p style="color:var(--text-secondary);font-size:0.8rem;margin-bottom:12px;">
            Programa una imagen o video. Si agregás un enlace, JARVIS te pedirá completar el sticker desde Instagram.
          </p>
          <div class="input-group">
            <label>Nombre interno</label>
            <input id="story-title" type="text" placeholder="Ej: Promo del viernes" maxlength="120">
          </div>
          <div class="input-group">
            <label>Cuenta</label>
            <select id="story-account">
              <option value="valhalla">Reino de Valhalla</option>
              <option value="alhornodirecto">Alhorno Directo</option>
            </select>
          </div>
          <div class="input-group">
            <label>Tipo de medio</label>
            <select id="story-media-type">
              <option value="image">Imagen</option>
              <option value="video">Video</option>
            </select>
          </div>
          <div class="input-group">
            <label>URL pública HTTPS del medio</label>
            <input id="story-media-url" type="url" placeholder="https://..." required>
          </div>
          <div class="input-group">
            <label>Fecha y hora de publicación</label>
            <input id="story-scheduled-at" type="datetime-local" required>
          </div>
          <div class="input-group">
            <label>URL del sticker (opcional)</label>
            <input id="story-link-url" type="url" placeholder="https://chat.whatsapp.com/...">
          </div>
          <div class="input-group">
            <label>Texto del sticker (si agregás enlace)</label>
            <input id="story-link-label" type="text" placeholder="UNITE A NUESTRO CANAL" maxlength="40">
          </div>
          <button class="btn-primary" onclick="window.instaCreateStory()" style="background:${this.color};width:100%;">
            🗓️ Programar historia
          </button>
          <button class="btn-secondary" onclick="window.instaLoadStories()" style="width:100%;margin-top:8px;">
            🔄 Actualizar historias
          </button>
          <div id="story-feedback" role="status" style="font-size:0.8rem;margin-top:10px;white-space:pre-wrap;"></div>
          <div style="margin-top:12px;">
            <strong style="font-size:0.8rem;">Historias programadas y estado</strong>
            <pre id="story-list" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto;background:rgba(0,0,0,.25);padding:10px;border-radius:6px;font-size:.72rem;">Cargando...</pre>
          </div>
          <div class="input-group" style="margin-top:12px;">
            <label>ID de historia completada manualmente</label>
            <input id="story-manual-id" type="text" placeholder="story_...">
          </div>
          <div class="input-group">
            <label>ID devuelto por Instagram (opcional)</label>
            <input id="story-instagram-id" type="text" placeholder="Instagram Media ID">
          </div>
          <button class="btn-primary" onclick="window.instaCompleteStory()" style="background:${this.color};width:100%;">
            ✓ Confirmar publicación manual
          </button>
        </div>

        <!-- ACCIÓN RÁPIDA 3: ESTRATEGIA DE ENGAGEMENT -->
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>📊 ESTRATEGIA DE ENGAGEMENT</h4>
          <div class="input-group">
            <label>Objetivo:</label>
            <select id="insta-goal">
              <option value="crecimiento">🚀 Crecimiento de seguidores</option>
              <option value="engagement">❤️ Aumentar engagement</option>
              <option value="ventas">💲 Conversión a ventas</option>
            </select>
          </div>
          <button class="btn-primary" onclick="window.instaEngagement()" style="background:${this.color};width:100%;">
            📊 Generar Estrategia
          </button>
        </div>

        <!-- CHAT RÁPIDO -->
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>💬 Comando Personalizado</h4>
          <div class="input-group">
            <textarea class="dock-message-input" rows="2" placeholder="Ej: Automatiza mi estrategia de contenido para esta semana..."></textarea>
          </div>
          <button class="btn-primary" onclick="window.sendDockMessage()" style="background:${this.color};width:100%;">
            📤 Enviar Comando
          </button>
        </div>

        ${lastResponse ? `
          <div class="section" style="border-left: 3px solid ${this.color};">
            <h4 style="color:${this.color};">📌 Última Automatización</h4>
            <div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:14px;font-size:0.9rem;line-height:1.8;max-height:300px;overflow-y:auto;white-space:pre-wrap;">
              ${this.formatText(lastResponse.text)}
            </div>
          </div>
        ` : ''}

        ${this.renderResponseArea('📱 Esperando tu comando de automatización...')}
        ${this.renderStats(agent)}
      </div>
    `;

    this.container.innerHTML = html;
    
    window._currentDock = this;
    window._instaDock = this;

    // ─── FUNCIONES ──────────────────────────────────────────────
    window.instaAutoFull = () => {
      this.showLoading('🚀 Ejecutando automatización completa...');
      this.sendMessage('Ejecuta automatización completa para Instagram');
    };

    window.instaPlan = () => {
      const days = document.getElementById('insta-days')?.value || 7;
      this.showLoading(`📋 Generando plan de contenido para ${days} días...`);
      this.sendMessage(`Genera un plan de contenido para Instagram para los próximos ${days} días`);
    };

    window.instaEngagement = () => {
      const goal = document.getElementById('insta-goal')?.value || 'crecimiento';
      this.showLoading('📊 Generando estrategia de engagement...');
      this.sendMessage(`Genera una estrategia de engagement para Instagram con objetivo: ${goal}`);
    };

    window.instaLoadStories = async () => {
      const output = document.getElementById('story-list');
      if (!output) return;
      output.textContent = 'Consultando historias...';
      try {
        const response = await fetch('/api/instagram/stories');
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'No se pudieron cargar las historias.');
        output.textContent = result.stories.length
          ? result.stories.map(story => [
              story.title,
              'Estado: ' + story.status,
              'Cuenta: ' + story.accountId,
              'Programada: ' + new Date(story.scheduledAt).toLocaleString(),
              'ID: ' + story.id,
              story.error ? 'Error: ' + story.error : ''
            ].filter(Boolean).join('\\n')).join('\\n\\n')
          : 'Todavía no hay historias programadas.';
      } catch (error) {
        output.textContent = 'Error: ' + error.message;
      }
    };

    window.instaCreateStory = async () => {
      const feedback = document.getElementById('story-feedback');
      const scheduledValue = document.getElementById('story-scheduled-at')?.value;
      const payload = {
        title: document.getElementById('story-title')?.value.trim(),
        accountId: document.getElementById('story-account')?.value,
        mediaType: document.getElementById('story-media-type')?.value,
        mediaUrl: document.getElementById('story-media-url')?.value.trim(),
        scheduledAt: scheduledValue ? new Date(scheduledValue).toISOString() : '',
        linkUrl: document.getElementById('story-link-url')?.value.trim() || null,
        linkLabel: document.getElementById('story-link-label')?.value.trim() || null
      };
      if (!payload.title || !payload.mediaUrl || !scheduledValue) {
        feedback.textContent = 'Completá el nombre, la URL HTTPS del medio y la fecha/hora.';
        return;
      }
      if (!payload.mediaUrl.startsWith('https://')) {
        feedback.textContent = 'Instagram necesita una URL HTTPS pública para descargar el archivo.';
        return;
      }
      if (payload.linkUrl && !payload.linkLabel) {
        feedback.textContent = 'El texto del sticker es obligatorio cuando agregás un enlace.';
        return;
      }

      feedback.textContent = 'Programando historia...';
      try {
        const response = await fetch('/api/instagram/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'No se pudo programar la historia.');
        feedback.textContent = result.notice || 'Historia programada.';
        document.getElementById('story-title').value = '';
        document.getElementById('story-media-url').value = '';
        document.getElementById('story-link-url').value = '';
        document.getElementById('story-link-label').value = '';
        window.instaLoadStories();
      } catch (error) {
        feedback.textContent = 'Error: ' + error.message;
      }
    };

    window.instaCompleteStory = async () => {
      const feedback = document.getElementById('story-feedback');
      const id = document.getElementById('story-manual-id')?.value.trim();
      const instagramMediaId = document.getElementById('story-instagram-id')?.value.trim() || null;
      if (!id) {
        feedback.textContent = 'Ingresá el ID de la historia que publicaste manualmente.';
        return;
      }
      try {
        const response = await fetch('/api/instagram/stories/' + encodeURIComponent(id) + '/manual-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instagramMediaId })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'No se pudo confirmar la historia.');
        feedback.textContent = 'Publicación manual registrada correctamente.';
        document.getElementById('story-manual-id').value = '';
        document.getElementById('story-instagram-id').value = '';
        window.instaLoadStories();
      } catch (error) {
        feedback.textContent = 'Error: ' + error.message;
      }
    };

    window.instaLoadStories();
  }
}