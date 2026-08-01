// frontend/js/components/SelfHealing.js
// 🎯 Componente de Self-Healing

import { socketManager } from '../core/socket.js';
import { toast } from '../utils/dom.js';

export class SelfHealing {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.panel = null;
    
    this.setupListeners();
  }

  setupListeners() {
    socketManager.on('skillsContent', ({ code }) => {
      this.enqueue({
        label: 'Contenido actual de skills.js (solo lectura)',
        code
      });
    });
    
    socketManager.on('patchApplied', (result) => {
      toast('✅ ' + result.message);
      this.processing = false;
      this.processNext();
    });
    
    socketManager.on('healingError', (err) => {
      toast('❌ Error: ' + err.message);
      this.processing = false;
      this.processNext();
    });
    
    socketManager.on('rollbackResult', (result) => {
      if (result.success) {
        toast('↩ ' + result.message);
      } else {
        toast('❌ ' + result.message);
      }
    });
  }

  enqueue(item) {
    this.queue.push(item);
    if (!this.processing) {
      this.processNext();
    }
  }

  processNext() {
    if (this.queue.length === 0) {
      this.processing = false;
      this.hidePanel();
      return;
    }
    
    this.processing = true;
    const next = this.queue[0];
    this.showPanel(next);
  }

  showPanel({ label, code }) {
    this.buildPanel();
    
    const labelEl = document.getElementById('pp-label');
    const codeEl = document.getElementById('pp-code');
    const counterEl = document.getElementById('pp-queue-counter');
    
    if (labelEl) labelEl.textContent = label || 'La IA propone la siguiente modificación:';
    if (codeEl) codeEl.textContent = code;
    if (counterEl) {
      counterEl.textContent = this.queue.length > 1 ? 
        `Acción 1 de ${this.queue.length} en cola` : '';
    }
    
    if (this.panel) {
      this.panel.style.display = 'flex';
    }
  }

  buildPanel() {
    if (this.panel) return;
    
    this.panel = document.createElement('div');
    this.panel.id = 'patch-panel';
    this.panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      background: #0a0f1e;
      border: 2px solid var(--accent, #00e5ff);
      border-radius: 12px;
      padding: 24px;
      width: min(90vw, 680px);
      max-height: 80vh;
      display: none;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 0 40px var(--accent-glow, rgba(0,229,255,0.4));
      font-family: monospace;
      color: #c9d1e0;
    `;
    
    this.panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span id="pp-title" style="font-size:0.85rem;letter-spacing:2px;color:var(--accent,#00e5ff);text-transform:uppercase;font-weight:700;">
          ⚠ Revisión de Parche
        </span>
        <span id="pp-queue-counter" style="font-size:0.75rem;opacity:0.6;"></span>
      </div>
      <p id="pp-label" style="font-size:0.9rem;margin:0;line-height:1.5;color:#a8b2c8;"></p>
      <div style="background:#060b16;border:1px solid rgba(0,229,255,0.2);border-radius:8px;overflow:auto;max-height:46vh;padding:14px;">
        <pre id="pp-code" style="margin:0;font-size:0.78rem;line-height:1.6;white-space:pre-wrap;word-break:break-all;color:#7efff5;"></pre>
      </div>
      <div style="background:rgba(255,60,60,0.08);border:1px solid rgba(255,60,60,0.25);border-radius:6px;padding:10px 14px;font-size:0.75rem;color:#ff6b6b;line-height:1.5;">
        🔒 Este código se escribirá en <code>backend/src/services/skills.js</code>.<br>
        Se creará un backup automático antes de aplicar. Revisá el código con cuidado.
      </div>
      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button id="pp-reject-btn" style="padding:10px 24px;background:rgba(255,60,60,0.15);border:1px solid rgba(255,60,60,0.5);border-radius:6px;color:#ff6b6b;font-size:0.85rem;font-family:monospace;cursor:pointer;letter-spacing:1px;transition:background 0.2s;">
          ✗ NO
        </button>
        <button id="pp-approve-btn" style="padding:10px 28px;background:rgba(0,229,255,0.12);border:1px solid var(--accent,#00e5ff);border-radius:6px;color:var(--accent,#00e5ff);font-size:0.85rem;font-family:monospace;cursor:pointer;letter-spacing:1px;font-weight:700;transition:background 0.2s;">
          ✓ SÍ — APLICAR
        </button>
      </div>
    `;
    
    document.body.appendChild(this.panel);
    
    document.getElementById('pp-approve-btn')?.addEventListener('click', () => this.approve());
    document.getElementById('pp-reject-btn')?.addEventListener('click', () => this.reject());
  }

  approve() {
    const approved = this.queue.shift();
    if (!approved) return;
    
    console.log('[Self-Healing] Usuario aprobó el parche:', approved.label);
    socketManager.approvePatch(approved.code);
    
    this.hidePanel();
  }

  reject() {
    const rejected = this.queue.shift();
    if (rejected) {
      console.log('[Self-Healing] Usuario rechazó el parche:', rejected.label);
    }
    this.hidePanel();
    this.processNext();
  }

  hidePanel() {
    if (this.panel) {
      this.panel.style.display = 'none';
    }
  }

  requestSkills() {
    socketManager.requestSkills();
  }
}