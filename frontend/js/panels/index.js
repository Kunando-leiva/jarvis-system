// frontend/js/panels/index.js
// 🎯 Exporta todos los paneles de agentes

import { BasePanel } from './BasePanel.js';

// ─── PANELES PERSONALIZADOS ──────────────────────────────────
// Si necesitas un panel específico para un agente, créalo aquí

export const PANELS = {
  // Por defecto, todos usan BasePanel
  // Si quieres un panel personalizado para un agente específico:
  // 'jarvis': JarvisPanel,
  // 'gideon': GideonPanel,
};

export function getPanel(agentId) {
  const Panel = PANELS[agentId] || BasePanel;
  return Panel;
}