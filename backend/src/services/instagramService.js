import axios from 'axios';

/**
 * Envía una respuesta automática a un comentario específico de Instagram
 * @param {string} commentId - El ID del comentario que envió n8n
 * @param {string} message - El texto de la respuesta o historia
 */
export async function enviarRespuestaInstagram(commentId, message) {
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN; 
  const url = `https://graph.facebook.com/v20.0/${commentId}/replies`;

  if (!ACCESS_TOKEN) {
    console.error('[Gideon Error] No se encontró el META_ACCESS_TOKEN en el .env');
    throw new Error('Token de Meta no configurado');
  }

  try {
    await axios.post(url, {
      message: message,
      access_token: ACCESS_TOKEN
    });
    console.log(`[Meta API] Respuesta enviada con éxito al comentario ${commentId}`);
  } catch (error) {
    console.error('[Meta API Error]', error.response?.data || error.message);
    throw error;
  }
}