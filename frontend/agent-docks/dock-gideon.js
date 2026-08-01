// frontend/agent-docks/dock-gideon.js
import { DockBase } from './dock-base.js';

export class GideonDock extends DockBase {
  render() {
    const agent = this.agent;
    const lastResponse = this.getLastResponse();
    
    let html = this.renderHeader(agent, '⚔️ Ejecutor de Comunidad · Vigilante de los Comentarios');
    
    html += `
      <div class="dock-content" style="--accent-color:${this.color};">
        <!-- SECCIÓN 1: RESPONDER COMENTARIOS -->
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>🛡️ Responder Comentario</h4>
          <div class="input-group">
            <label>ID del Comentario:</label>
            <input id="gideon-comment-id" placeholder="Ej: 123456789" />
          </div>
          <div class="input-group">
            <label>Respuesta:</label>
            <textarea id="gideon-comment-response" rows="2" placeholder="Escribe la respuesta épica..."></textarea>
          </div>
          <button class="btn-primary" onclick="window.gideonReplyComment()" style="background:${this.color};">⚔️ Enviar Respuesta</button>
        </div>

        <!-- SECCIÓN 2: ENVIAR DM -->
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>📨 Mensaje Directo (DM)</h4>
          <div class="input-group">
            <label>Usuario (ID):</label>
            <input id="gideon-dm-user" placeholder="ID de Instagram" />
          </div>
          <div class="input-group">
            <label>Mensaje:</label>
            <textarea id="gideon-dm-text" rows="2" placeholder="Texto del DM..."></textarea>
          </div>
          <button class="btn-primary" onclick="window.gideonSendDM()" style="background:${this.color};">📤 Enviar DM</button>
        </div>

        <!-- SECCIÓN 3: RESPUESTA RÁPIDA -->
        <div class="section" style="border-left: 4px solid ${this.color};">
          <h4>💬 Chat Rápido con GIDEON</h4>
          <div class="input-group">
            <textarea id="gideon-chat-input" rows="2" placeholder="Escribe un mensaje para GIDEON..."></textarea>
          </div>
          <button class="btn-primary" onclick="window.gideonChat()" style="background:${this.color};">🗣️ Hablar con GIDEON</button>
        </div>

        ${lastResponse ? `
          <div class="section" style="border-left: 3px solid ${this.color};">
            <h4 style="color:${this.color};">📌 Última Interacción</h4>
            <div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:14px;font-size:0.9rem;line-height:1.8;max-height:200px;overflow-y:auto;white-space:pre-wrap;">
              ${this.formatText(lastResponse.text)}
            </div>
          </div>
        ` : ''}

        ${this.renderResponseArea('⚔️ Esperando la llamada de los guerreros...')}
        ${this.renderStats(agent)}
      </div>
    `;

    this.container.innerHTML = html;
    
    // Guardar referencia
    window._currentDock = this;
    window._gideonDock = this;

    // ─── FUNCIONES DE GIDEON ───────────────────────────
    window.gideonReplyComment = () => {
      const commentId = document.getElementById('gideon-comment-id')?.value;
      const response = document.getElementById('gideon-comment-response')?.value;
      
      if (!commentId || !response) {
        alert('Completa el ID del comentario y la respuesta.');
        return;
      }

      this.showLoading('⚔️ Enviando respuesta a comentario...');
      
      fetch('/api/webhook/instagram-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: commentId,
          text: response,
          user: 'gideon',
          post_id: 'manual',
          timestamp: Date.now().toString()
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.updateResponse('✅ Respuesta enviada correctamente al comentario ' + commentId);
        } else {
          this.updateResponse('❌ Error: ' + (data.error || 'desconocido'));
        }
      })
      .catch(err => {
        this.updateResponse('❌ Error de red: ' + err.message);
      });
    };

    window.gideonSendDM = () => {
      const user = document.getElementById('gideon-dm-user')?.value;
      const text = document.getElementById('gideon-dm-text')?.value;
      
      if (!user || !text) {
        alert('Completa el usuario y el mensaje.');
        return;
      }

      this.showLoading('📨 Enviando DM a @' + user + '...');
      
      fetch('/api/webhook/instagram-dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'dm_' + Date.now(),
          user: user,
          text: text,
          timestamp: Date.now().toString(),
          recipient_id: user
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.updateResponse('✅ DM enviado a @' + user);
        } else {
          this.updateResponse('❌ Error: ' + (data.error || 'desconocido'));
        }
      })
      .catch(err => {
        this.updateResponse('❌ Error de red: ' + err.message);
      });
    };

    window.gideonChat = () => {
      const input = document.getElementById('gideon-chat-input');
      if (!input || !input.value.trim()) {
        alert('Escribe un mensaje para GIDEON');
        return;
      }
      this.showLoading('⚔️ GIDEON está procesando...');
      this.sendMessage(input.value.trim());
      input.value = '';
    };
  }
}