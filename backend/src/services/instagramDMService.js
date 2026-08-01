import fs from 'fs';
import path from 'path';
import { getAIResponse } from '../controllers/aiController.js';
import { getCurrentMode } from '../state/appState.js';

// =============================================
// CONFIGURACIÓN DE RUTAS
// =============================================
const RUTA_VAULT = path.join('C:', 'Users', 'Soledad', 'Desktop', 'MiCerebroDigital');
const RUTA_HISTORIAS = path.join(RUTA_VAULT, 'Instagram');
const RUTA_DMS = path.join(RUTA_VAULT, 'Instagram_DMs');
const RUTA_REGISTRO_DMS = path.join(process.cwd(), 'registro_dms.json');

// =============================================
// FUNCIONES DE CONTROL DE DUPLICADOS
// =============================================
export const obtenerDMsRespondidos = () => {
  if (!fs.existsSync(RUTA_REGISTRO_DMS)) return [];
  try { 
    return JSON.parse(fs.readFileSync(RUTA_REGISTRO_DMS, 'utf-8')); 
  } catch { 
    return []; 
  }
};

export const registrarDMRespondido = (id) => {
  const ids = obtenerDMsRespondidos();
  if (!ids.includes(id)) {
    ids.push(id);
    if (ids.length > 1000) ids.shift();
    fs.writeFileSync(RUTA_REGISTRO_DMS, JSON.stringify(ids, null, 2), 'utf-8');
  }
};

// =============================================
// FUNCIÓN PRINCIPAL - PROCESAR DM
// =============================================
export const procesarDMInstagram = async ({ id, user, text, timestamp, recipient_id }) => {
  console.log(`[DM Service] 📨 Procesando DM de @${user}: "${text}"`);

  // 1️⃣ Crear carpeta de DMs si no existe
  if (!fs.existsSync(RUTA_DMS)) {
    fs.mkdirSync(RUTA_DMS, { recursive: true });
  }

  // 2️⃣ Analizar intención del usuario
  const intencion = await analizarIntencionDM(text);
  console.log(`[DM Service] 🎯 Intención detectada: ${intencion}`);

  let respuestaFinal = '';
  let resumen = '';

  // 3️⃣ Rutas según intención
  switch(intencion) {
    case 'SOLICITAR_HISTORIA':
      respuestaFinal = await procesarSolicitudHistoria(user, text);
      resumen = '📖 Historia completa enviada';
      break;
      
    case 'PREGUNTAR_PERSONAJE':
      respuestaFinal = await procesarPreguntaPersonaje(user, text);
      resumen = '🔮 Intriga generada';
      break;
      
    case 'SOLICITAR_AYUDA':
      respuestaFinal = await procesarAyuda(user, text);
      resumen = '🆘 Ayuda proporcionada';
      break;
      
    case 'INTERACCION_GENERAL':
    default:
      respuestaFinal = await procesarInteraccionGeneral(user, text);
      resumen = '💬 Respuesta general';
  }

  // 4️⃣ Guardar el DM en Obsidian
  await guardarDMEnObsidian({
    id,
    user,
    text,
    timestamp,
    respuesta: respuestaFinal,
    intencion
  });

  // 5️⃣ Enviar respuesta por DM
  await enviarMensajeDirectoInstagram(recipient_id || user, respuestaFinal);

  return {
    exito: true,
    resumen,
    respuesta: respuestaFinal,
    intencion
  };
};

// =============================================
// FUNCIÓN: Analizar intención del DM
// =============================================
const analizarIntencionDM = async (text) => {
  const PROMPT_ANALISIS = `
    Analiza el siguiente mensaje de Instagram DM y clasifícalo en UNA de estas categorías:
    
    1. SOLICITAR_HISTORIA: Cuando el usuario pide EXPLÍCITAMENTE la historia completa de algo/alguien, o quiere leer el capítulo completo. 
       Ejemplos: "Quiero leer la historia de Floki", "Pásame el relato de Ubbe", "Dame la crónica de Ragnar"
    
    2. PREGUNTAR_PERSONAJE: Cuando el usuario hace una PREGUNTA sobre un personaje, su destino, su historia, etc.
       Ejemplos: "¿Cómo murió Ragnar?", "¿Qué pasó con Floki?", "¿Quién es Ubbe?"
    
    3. SOLICITAR_AYUDA: Cuando el usuario pide ayuda, información sobre la página, o hace preguntas generales.
       Ejemplos: "¿Cómo funciona esto?", "¿Qué es Valhalla?", "Ayuda", "Info"
    
    4. INTERACCION_GENERAL: Cualquier otro mensaje que no encaje en las anteriores.
       Ejemplos: "Hola", "Buen día", "Me encanta la página", "Saludos"

    Mensaje: "${text}"
    
    Responde SOLO con el nombre de la categoría (SOLICITAR_HISTORIA, PREGUNTAR_PERSONAJE, SOLICITAR_AYUDA, o INTERACCION_GENERAL).
  `;
  
  try {
    const { text: resultado } = await getAIResponse(text, PROMPT_ANALISIS);
    return resultado.trim();
  } catch (error) {
    console.error('[DM Service] Error analizando intención:', error.message);
    return 'INTERACCION_GENERAL';
  }
};

// =============================================
// FUNCIÓN: Procesar solicitud de historia (CAMINO A)
// =============================================
const procesarSolicitudHistoria = async (user, text) => {
  // Extraer nombre del personaje
  const personaje = await extraerPersonaje(text);
  
  if (!personaje || personaje === 'Ninguno') {
    return `¡Saludos @${user}! ⚔️ Los sabios del reino están preparando nuevas crónicas. ¿Por qué no me preguntas por algún guerrero en específico?`;
  }

  // Buscar archivo del personaje en Obsidian
  const rutaHistoria = path.join(RUTA_HISTORIAS, `${personaje}.md`);
  
  if (fs.existsSync(rutaHistoria)) {
    console.log(`[DM Service] 📖 Historia de ${personaje} encontrada en Obsidian`);
    const contenido = fs.readFileSync(rutaHistoria, 'utf-8');
    const textoLimpio = contenido.replace(/---[\s\S]*?---/, '').trim();
    
    // Dividir la historia en partes si es muy larga
    const historiaCorta = textoLimpio.length > 500 
      ? textoLimpio.substring(0, 500) + '...' 
      : textoLimpio;
    
    return `¡Skål @${user}! ⚔️ Las crónicas de ${personaje} te esperan:\n\n${historiaCorta}\n\n📖 Lee la historia completa aquí: https://tuweb.com/historias/${personaje.toLowerCase()}`;
  } else {
    // Si no existe el archivo, generar intriga
    console.log(`[DM Service] 🔮 No se encontró historia de ${personaje}, generando intriga`);
    const PROMPT_INTRIGA = `
      El usuario @${user} pidió la historia de "${personaje}", pero aún no tenemos ese relato en nuestros pergaminos.
      Genera una respuesta ÉPICA y MÍSTICA que mantenga el hype, mencionando que los sabios del reino están escribiendo sus crónicas en la bóveda de los secretos.
      Tono: Nórdico, misterioso, emocionante.
      Máximo 3 líneas.
      No uses hashtags ni emojis.
    `;
    const { text: respuesta } = await getAIResponse(text, PROMPT_INTRIGA);
    return respuesta;
  }
};

// =============================================
// FUNCIÓN: Procesar pregunta sobre personaje (CAMINO B)
// =============================================
const procesarPreguntaPersonaje = async (user, text) => {
  const personaje = await extraerPersonaje(text);
  
  if (!personaje || personaje === 'Ninguno') {
    return `¡Oh, @${user}! ⚡ Los secretos del Valhalla son muchos. ¿Pregúntame por un guerrero en específico y te revelaré lo que sé... o lo que oculto?`;
  }

  const PROMPT_INTRIGA = `
    El usuario @${user} preguntó por el personaje "${personaje}".
    Genera una respuesta MÍSTICA y CORTA (máximo 2 líneas) que SIEMBRE LA DUDA sobre el destino de este personaje, sin revelar spoilers.
    Usa metáforas nórdicas: cuervos, runas, el Valhalla, el destino, etc.
    Ejemplos: "Los cuervos susurran que ${personaje} aún camina entre las sombras... ¿o fue su espíritu quien nunca se fue?"
    No uses hashtags ni emojis.
  `;
  
  const { text: respuesta } = await getAIResponse(text, PROMPT_INTRIGA);
  return respuesta;
};

// =============================================
// FUNCIÓN: Procesar solicitud de ayuda (CAMINO C)
// =============================================
const procesarAyuda = async (user, text) => {
  const PROMPT_AYUDA = `
    El usuario @${user} pidió ayuda o información sobre la página.
    Responde con un tono épico y amigable, explicando brevemente que:
    - Pueden explorar las historias de los guerreros vikingos
    - Pueden preguntar por cualquier personaje
    - Pueden pedir crónicas completas
    Máximo 3 líneas.
  `;
  
  const { text: respuesta } = await getAIResponse(text, PROMPT_AYUDA);
  return respuesta;
};

// =============================================
// FUNCIÓN: Procesar interacción general (CAMINO D)
// =============================================
const procesarInteraccionGeneral = async (user, text) => {
  const PROMPT_GENERAL = `
    Responde al usuario @${user} que te envió este mensaje en Instagram DM: "${text}"
    Usa tono épico nórdico, amigable pero misterioso.
    Invita sutilmente a que exploren el contenido de la página o pregunten por algún guerrero.
    Máximo 2 líneas.
  `;
  
  const { text: respuesta } = await getAIResponse(text, PROMPT_GENERAL);
  return respuesta;
};

// =============================================
// FUNCIÓN: Extraer nombre del personaje
// =============================================
const extraerPersonaje = async (text) => {
  const PROMPT_EXTRACCION = `
    Extrae el nombre del personaje de la saga vikinga mencionado en este mensaje:
    "${text}"
    
    Posibles personajes: Ragnar, Floki, Ubbe, Ivar, Bjorn, Lagertha, Rollo, Sigurd, Hvitserk, Harald, Halfdan, Aslaug, Torvi, etc.
    
    Si no menciona ninguno, responde "Ninguno".
    Responde SOLO con el nombre del personaje (sin comillas, sin puntos, sin texto adicional).
  `;
  
  try {
    const { text: resultado } = await getAIResponse(text, PROMPT_EXTRACCION);
    return resultado.trim();
  } catch (error) {
    console.error('[DM Service] Error extrayendo personaje:', error.message);
    return 'Ninguno';
  }
};

// =============================================
// FUNCIÓN: Guardar DM en Obsidian
// =============================================
const guardarDMEnObsidian = async ({ id, user, text, timestamp, respuesta, intencion }) => {
  try {
    if (!fs.existsSync(RUTA_DMS)) {
      fs.mkdirSync(RUTA_DMS, { recursive: true });
    }

    const nombreArchivo = `DM_${id}.md`;
    const fecha = new Date(parseInt(timestamp)).toLocaleString('es-ES');
    
    const contenido = `---
usuario: "${user}"
id_dm: "${id}"
timestamp: "${timestamp}"
fecha: "${fecha}"
intencion: "${intencion}"
---
### 📨 Mensaje del usuario:
${text}

### ⚔️ Respuesta enviada:
${respuesta}
---
*Este DM fue procesado automáticamente por el sistema GIDEON*
`;
    
    fs.writeFileSync(path.join(RUTA_DMS, nombreArchivo), contenido, 'utf-8');
    console.log(`[DM Service] ✅ DM guardado en Obsidian: ${nombreArchivo}`);
    
  } catch (error) {
    console.error('[DM Service] ❌ Error guardando en Obsidian:', error.message);
  }
};

// =============================================
// FUNCIÓN: Enviar mensaje a Instagram DM
// =============================================
export const enviarMensajeDirectoInstagram = async (recipientId, texto) => {
  console.log(`[DM Service] 📤 Enviando DM a ${recipientId}`);
  
  try {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const igBusinessId = process.env.INSTAGRAM_BUSINESS_ID;
    
    if (!token || !pageId) {
      throw new Error('Falta token o page_id en .env');
    }

    // 🔥 USAR EL ENDPOINT DE INSTAGRAM DIRECTAMENTE
    const url = `https://graph.instagram.com/v25.0/${igBusinessId || 'me'}/messages?access_token=${token}`;
    
    const payload = {
      recipient: {
        id: recipientId
      },
      message: {
        text: texto
      }
    };

    console.log('[DM Service] 📤 Enviando a Meta API:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[DM Service] ❌ Error Meta API:', data);
      
      // 🔥 INTENTAR ENDPOINT ALTERNATIVO (Facebook Graph)
      if (data.error?.code === 1 || data.error?.code === 100) {
        console.log('[DM Service] 🔄 Intentando endpoint alternativo...');
        return await enviarMensajeDirectoInstagramAlternativo(recipientId, texto);
      }
      
      throw new Error(`Error: ${data.error?.message || 'Error desconocido'}`);
    }

    console.log('[DM Service] ✅ DM enviado exitosamente:', data);
    return { success: true, data };

  } catch (error) {
    console.error('[DM Service] ❌ Error:', error.message);
    throw error;
  }
};

// 🔥 FUNCIÓN ALTERNATIVA (Facebook Graph)
export const enviarMensajeDirectoInstagramAlternativo = async (recipientId, texto) => {
  console.log(`[DM Service] 🔄 Usando endpoint alternativo para ${recipientId}`);
  
  try {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    
    const url = `https://graph.facebook.com/v25.0/${pageId}/messages?access_token=${token}`;
    
    const payload = {
      recipient: {
        id: recipientId
      },
      message: {
        text: texto
      }
    };

    console.log('[DM Service] 📤 Enviando (alt):', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[DM Service] ❌ Error (alt):', data);
      throw new Error(`Error alternativo: ${data.error?.message || 'Error desconocido'}`);
    }

    console.log('[DM Service] ✅ DM enviado (alt):', data);
    return { success: true, data };

  } catch (error) {
    console.error('[DM Service] ❌ Error en alternativo:', error.message);
    throw error;
  }
};