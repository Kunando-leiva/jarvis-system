import {
  callGroq,
  callGemini,
  callOpenRouter,
  FALLBACK_TEXT,
} from '../config/ai.js';

const CASCADE = [
  { name: 'groq', fn: callGroq },
  { name: 'gemini', fn: callGemini },
  { name: 'openrouter', fn: callOpenRouter },
];

/**
 * Ejecuta la cascada híbrida de IA.
 * Intenta cada proveedor en orden; si uno falla, pasa al siguiente de inmediato.
 * Si todos fallan, devuelve el texto de contingencia local.
 *
 * @param {string} message - Mensaje del usuario.
 * @param {string} [systemPrompt] - System prompt del modo activo (JARVIS/GIDEON).
 */
export async function getAIResponse(message, systemPrompt = '') {
  for (const provider of CASCADE) {
    try {
      const text = await provider.fn(message, systemPrompt);
      return { text, provider: provider.name, fallback: false };
    } catch (err) {
      console.error(`[AI Cascade] Falló ${provider.name}:`, err.message);
      continue;
    }
  }

  return { text: FALLBACK_TEXT, provider: 'local', fallback: true };
}