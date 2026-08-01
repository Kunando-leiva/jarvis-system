// backend/src/state/appState.js
// Estado global mínimo en memoria. Si en el futuro hay múltiples usuarios/sesiones
// concurrentes con modos distintos, esto debería migrar a un estado por-socket
// (ej. socket.data.mode) en vez de una variable de módulo compartida.

export const VALID_MODES = ['JARVIS', 'GIDEON'];

let currentMode = 'JARVIS';

export function getCurrentMode() {
  return currentMode;
}

export function setCurrentMode(mode) {
  if (!VALID_MODES.includes(mode)) {
    throw new Error(`Modo inválido: ${mode}`);
  }
  currentMode = mode;
  return currentMode;
}

/**
 * Detecta intención de cambio de modo en el texto del usuario.
 * Devuelve 'JARVIS', 'GIDEON' o null si no hay cambio solicitado.
 */
export function detectModeSwitch(text) {
  if (!text || typeof text !== 'string') return null;

  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // quita acentos: "pásate" -> "pasate"

  const toGideon = [
    'pasa a gideon',
    'pasate a gideon',
    'cambia a gideon',
    'cambiate a gideon',
    'activa gideon',
    'modo gideon',
  ];

  const toJarvis = [
    'pasa a jarvis',
    'pasate a jarvis',
    'cambia a jarvis',
    'cambiate a jarvis',
    'activa jarvis',
    'modo jarvis',
  ];

  if (toGideon.some((phrase) => normalized.includes(phrase))) return 'GIDEON';
  if (toJarvis.some((phrase) => normalized.includes(phrase))) return 'JARVIS';

  return null;
}