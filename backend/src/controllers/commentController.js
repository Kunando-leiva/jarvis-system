// backend/src/controllers/commentController.js
// 🎯 TODA la lógica de procesamiento de comentarios

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { enviarRespuestaInstagram } from '../services/instagramService.js';
import { getAIResponse } from './aiController.js';
import { getCurrentMode } from '../state/appState.js';
import { sendActionToN8n } from '../services/n8nService.js';
import memoryService from '../services/memoryService.js';
import { buscarHistoriaPersonaje, getPersonajesConocidos } from './historyController.js';
import { buscarRespuestaPersonalizada } from './responseController.js';
import { tryParseAction } from '../utils/textFormatter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── ESTADO EN MEMORIA ──────────────────────────────────────────
const comentariosRespondidos = new Set();
const comentariosProcesados = new Map();

// ─── CONTROLADOR PRINCIPAL ──────────────────────────────────────

export async function procesarComentario(req, res) {
  // ============================================================
  // 🔥 CONTROL: RESPUESTAS A COMENTARIOS DESACTIVADAS
  // ============================================================
  if (process.env.DISABLE_COMMENT_RESPONSES === 'true') {
    console.log('[Webhook] ⚠️ Respuestas a comentarios DESACTIVADAS');
    return res.status(200).json({ 
      success: true, 
      message: 'Comment responses disabled',
      note: 'Cambia DISABLE_COMMENT_RESPONSES a false en .env para reactivar'
    });
  }

  console.log('[Webhook] 📨 Datos completos recibidos:', JSON.stringify(req.body, null, 2));
  const { id, user, text, post_id, timestamp } = req.body;

  if (!id || !text) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos (id, text)' });
  }

  // 🧠 OBTENER CONTEXTO DE CONVERSACIÓN ANTERIOR
  const sessionId = `user_${user}`;
  let contextoAnterior = {};
  let yaInvitoDM = false;
  
  try {
    contextoAnterior = await memoryService.getContext(sessionId);
    if (contextoAnterior && contextoAnterior.lastTopic) {
      yaInvitoDM = contextoAnterior.invitoDM || false;
    }
  } catch (error) {
    // Si falla, sigue normal
  }

  if (comentariosRespondidos.has(id)) {
    console.log(`[Gideon Warning] Comentario ${id} ya fue respondido. Ignorando duplicado.`);
    return res.status(200).json({ success: true, message: 'Duplicado ignorado' });
  }

  console.log(`[Gideon Engine] Analizando comentario de @${user}: "${text}"`);
  console.log(`[Historia] 🔍 Analizando: "${text}"`);

  // =============================================
  // 📖 BUSCAR RESPUESTA PERSONALIZADA
  // =============================================
  const videoId = post_id || 'default';
  
  let respuestaPersonalizada = buscarRespuestaPersonalizada(text, videoId);
  
  if (respuestaPersonalizada) {
    console.log(`[Respuestas] ✅ Respuesta personalizada encontrada para "${text}"`);
    
    await enviarRespuestaInstagram(id, respuestaPersonalizada);
    
    comentariosRespondidos.add(id);
    comentariosProcesados.set(id, Date.now());
    
    // Emitir evento (se maneja desde el socket)
    return res.status(200).json({ success: true, message: 'Procesado' });
  }

  // 📖 DETECTAR PERSONAJE EN EL COMENTARIO
  const personajesConocidos = getPersonajesConocidos();
  const textoLower = text.toLowerCase();
  let historiaEncontrada = null;
  let personajeEncontrado = null;

  for (const personaje of personajesConocidos) {
    if (textoLower.includes(personaje)) {
      personajeEncontrado = personaje;
      historiaEncontrada = buscarHistoriaPersonaje(personaje);
      if (historiaEncontrada) {
        console.log(`[Historia] 📖 Encontrada historia de ${personaje}`);
        break;
      }
    }
  }
  if (!historiaEncontrada) {
    console.log(`[Historia] ❌ No se detectó ningún personaje conocido`);
  }

  // 🆕 CONTROL DE DUPLICADOS MEJORADO
  if (comentariosProcesados.has(id)) {
    const tiempoPasado = Date.now() - comentariosProcesados.get(id);
    if (tiempoPasado < 5000) {
      console.log(`[Gideon Warning] ⚠️ Duplicado real de ${id} ignorado (${tiempoPasado}ms)`);
      return res.status(200).json({ success: true, message: 'Duplicado ignorado' });
    } else {
      console.log(`[Gideon] 🔄 Comentario ${id} ya procesado hace ${tiempoPasado/1000}s, pero permitimos nueva interacción`);
    }
  }

  try {
    // Guardar en Obsidian
    const carpetaComments = path.join('C:', 'Users', 'Soledad', 'Desktop', 'MiCerebroDigital', 'Instagram_Comments');
    
    if (!fs.existsSync(carpetaComments)) {
      fs.mkdirSync(carpetaComments, { recursive: true });
    }

    const nombreArchivo = `Comment_${id}.md`;
    const contenidoLog = `---
usuario: "${user}"
post_id: "${post_id}"
fecha: "${timestamp}"
respondido: true
---

### Comentario:
${text}`;
    
    fs.writeFileSync(path.join(carpetaComments, nombreArchivo), contenidoLog, 'utf-8');
    console.log(`[Obsidian Log] ¡Éxito! Guardado ${nombreArchivo} en Instagram_Comments`);

  } catch (err) {
    console.error('[Obsidian Log Error] No se pudo escribir en el Vault:', err.message);
  }

  try {
    const INSTAGRAM_PROMPT_INTEGRADO = `
      Sos el guardián interactivo de la comunidad "Reino de Valhalla". 
      Tu objetivo es responder al comentario del usuario de forma ultra contextual, lógica y humana según lo que puso.
      
      REGLAS:
      1. Habla con tono épico y nórdico, pero directo y natural.
      2. NO dejes enlaces ni links en este bloque.
      3. No uses hashtags. Que la respuesta sea limpia.
      4. Si demuestran mucho interés o preguntan por partes nuevas, invítalos a que A QUE TE SIGAN PARA NO PERDERTESE NINGUNA HISTORIA para continuar la charla con nosotros y no dispersar la interacción fuera de la página.
      
      REGLAS DE GENERACIÓN DE INTRIGA:
      1. Si te preguntan sobre el destino, muerte o historia de un personaje (como Floki, Ragnar, etc.), responde con una sola frase mística y corta que siembre la duda. NUNCA les cuentes el desenlace ni les hagas un resumen de los hechos.
      2. Inmediatamente después, DILE QUE TE SIGA Y BUSQUE SU PERSONAJE FAVORITO con el nombre del personaje si quieren conocer la verdad oculta de la saga antes que el resto.
      3. Varía tus saludos y tono épico para no sonar repetitivo. No uses siempre las mismas metáforas de fuego ni repitas palabras del comentario anterior.
      4. Mantén la respuesta en un máximo de dos o tres líneas de texto. Prohibido usar hashtags o enlaces.
    
      INSTRUCCIONES CRÍTICAS DE LÓGICA:
      1. ELEGIR EL CAMINO CORRECTO:
          - CAMINO A (RECOMPENSA): Si el usuario pide EXPLÍCITAMENTE la historia completa, el relato, el capítulo, o pone frases como "pásame la historia", "quiero leerlo", incluye en tu respuesta ÚNICAMENTE este enlace exacto: https://tuweb.com/historias/ragnar
          - CAMINO B (INTRIGA): Si el usuario hace una PREGUNTA de curiosidad (ej: "¿Cómo se conocieron?", "¿Cómo murió Floki?"), NO le des el enlace anterior. Respóndele con una sola frase mística corta que siembre la duda sin revelar el desenlace (¡no quemes el contenido de los videos!).
      2. Invítalos de forma sutil a SERGUITE solo si es el CAMINO B (Intriga) para que continúen la charla con nosotros.
      3. Respuestas ultra cortas (máximo 2-3 líneas). No uses hashtags repetitivos ni links inventados.
    `;

    let promptFinal = INSTAGRAM_PROMPT_INTEGRADO;
    
    if (contextoAnterior && contextoAnterior.lastTopic) {
      promptFinal += `\n\n⚠️ CONTEXTO DE CONVERSACIÓN ANTERIOR:
      El usuario ya dijo: "${contextoAnterior.lastTopic}"
      Tu respuesta fue: "${contextoAnterior.lastResponse}"
      
      📌 INSTRUCCIÓN: Esta es una CONTINUACIÓN. ${yaInvitoDM ? 'YA invitaste al usuario SEGUIRNOS. NO vuelvas a invitarlo ahora.' : 'Puedes invitar a SEGUIRNOS si es la primera vez que preguntan.'}
      El usuario ahora dice: "${text}"`;
    }

    // 📖 SI ENCONTRÓ HISTORIA, RESPONDER CON ELLA
    if (historiaEncontrada) {
      let respuestaHistoria = `📖 **${historiaEncontrada.titulo}**\n\n${historiaEncontrada.resumen}`;
      if (historiaEncontrada.frase) {
        respuestaHistoria += `\n\n_"${historiaEncontrada.frase}"_`;
      }
      if (historiaEncontrada.ragnarok) {
        respuestaHistoria += `\n\n⚔️ **Ragnarok:** ${historiaEncontrada.ragnarok}`;
      }
      respuestaHistoria += `\n\n⚔️ ¿Quieres saber más sobre ${personajeEncontrado}? sigueme y te contaré más secretos del Valhalla.`;
      
      await enviarRespuestaInstagram(id, respuestaHistoria);
      
      comentariosRespondidos.add(id);
      comentariosProcesados.set(id, Date.now());
      
      return res.status(200).json({ success: true, message: 'Procesado' });
    }

    const { text: textIA } = await getAIResponse(text, promptFinal);
    let mensajeFinal = textIA;
    const actionData = tryParseAction(textIA);
    if (actionData) {
      mensajeFinal = actionData.textResponse;
    }

    await enviarRespuestaInstagram(id, mensajeFinal);

    // 🔥 ENVIAR TODOS LOS COMENTARIOS A N8N
    const n8nPayload = {
      action: 'instagram_comment',
      payload: {
        id: id,
        user: user,
        text: text,
        post_id: post_id,
        timestamp: timestamp,
        response: mensajeFinal
      },
      textResponse: mensajeFinal
    };
    sendActionToN8n(n8nPayload);

    comentariosRespondidos.add(id);
    comentariosProcesados.set(id, Date.now());

    // 🧠 GUARDAR CONTEXTO
    try {
      await memoryService.saveContext(sessionId, {
        lastTopic: text,
        lastResponse: mensajeFinal,
        invitoDM: mensajeFinal.toLowerCase().includes('mensaje privado') || 
                  mensajeFinal.toLowerCase().includes('dm')
      });
    } catch (error) {
      // Si falla, sigue normal
    }

    // Limpiar comentarios viejos
    for (const [key, value] of comentariosProcesados) {
      if (Date.now() - value > 3600000) {
        comentariosProcesados.delete(key);
      }
    }

    return res.status(200).json({ success: true, message: 'Procesado' });

  } catch (error) {
    console.error('[Gideon Loop Error]', error.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// ─── GETTERS PARA ESTADO ──────────────────────────────────────

export function getComentariosRespondidos() {
  return comentariosRespondidos;
}

export function getComentariosProcesados() {
  return comentariosProcesados;
}

export function limpiarComentariosViejos() {
  for (const [key, value] of comentariosProcesados) {
    if (Date.now() - value > 3600000) {
      comentariosProcesados.delete(key);
    }
  }
}