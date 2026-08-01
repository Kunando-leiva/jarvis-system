const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook-test/jarvis-action';

/**
 * Envía una acción estructurada a n8n por webhook.
 * Se ejecuta en segundo plano: no bloquea la respuesta al frontend.
 *
 * @param {object} actionPayload - Objeto completo { action, payload, textResponse }.
 * @returns {Promise<void>}
 */
export async function sendActionToN8n(actionPayload) {
  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actionPayload),
    });

    if (!res.ok) {
      console.error(`[n8nService] Webhook respondió con status ${res.status}`);
      return;
    }

    console.log(`[n8nService] Acción "${actionPayload.action}" enviada a n8n correctamente.`);
  } catch (err) {
    console.error('[n8nService] Error al enviar acción a n8n:', err.message);
  }
}