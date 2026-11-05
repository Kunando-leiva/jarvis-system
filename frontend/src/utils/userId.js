// frontend/utils/userId.js
// 🆔 GESTIÓN DE userId PERSISTENTE EN LOCALSTORAGE

const USER_ID_KEY = 'jarvisUserId';
const SESSION_ID_KEY = 'jarvisSessionId';

/**
 * Obtiene el userId persistente del usuario
 * Se guarda en localStorage y persiste entre sesiones del navegador
 */
export function getUserId() {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

/**
 * Obtiene el sessionId para la conversación actual
 * Se guarda en sessionStorage (se pierde al cerrar el navegador)
 */
export function getSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Inicia una nueva sesión (nuevo sessionId)
 * El userId permanece igual
 */
export function startNewSession() {
  const sessionId = `session_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
  sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  return sessionId;
}

/**
 * Limpia la sesión actual
 */
export function clearSession() {
  sessionStorage.removeItem(SESSION_ID_KEY);
}

/**
 * Obtiene userId y sessionId juntos
 */
export function getIds() {
  return {
    userId: getUserId(),
    sessionId: getSessionId()
  };
}

export default {
  getUserId,
  getSessionId,
  startNewSession,
  clearSession,
  getIds
};