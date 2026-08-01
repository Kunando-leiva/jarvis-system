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
  }
}