// backend/src/routes/publishRoutes.js
// 🎯 Rutas de publicación de contenido

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import InstagramPublishService from '../services/instagramPublishService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const publisher = new InstagramPublishService();

// ─── VER CONTENIDO PROGRAMADO ────────────────────────────────
router.get('/scheduled-content', async (req, res) => {
  try {
    const contenido = await publisher.scanScheduledContent();
    res.json({
      success: true,
      total: contenido.length,
      contenido
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ─── PUBLICAR UN VIDEO ESPECÍFICO ────────────────────────────
router.post('/publish-video', async (req, res) => {
  const { filePath } = req.body;
  
  if (!filePath) {
    return res.status(400).json({
      success: false,
      error: 'Se requiere filePath'
    });
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const metadata = publisher.extractMetadata(content);
    
    if (!metadata) {
      throw new Error('No se pudo extraer metadata del archivo');
    }

    const mediaPath = metadata.image_path || metadata.video_path || '';
    const mediaType = publisher.detectMediaType(mediaPath);
    
    const result = await publisher.publishMedia(
      metadata,
      path.join(publisher.vaultPath, mediaPath),
      mediaType
    );

    publisher.markAsPublished(filePath, result.postId, result.mediaId);

    res.json({
      success: true,
      message: 'Publicado exitosamente',
      data: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ─── PUBLICAR TODO EL CONTENIDO PENDIENTE ────────────────────
router.post('/publish-all-pending', async (req, res) => {
  try {
    console.log('[API] Publicando todo el contenido pendiente...');
    const pendientes = await publisher.scanScheduledContent();
    
    if (pendientes.length === 0) {
      return res.json({
        success: true,
        message: 'No hay contenido pendiente para publicar',
        total: 0
      });
    }

    const resultados = [];

    for (const item of pendientes) {
      try {
        console.log(`[API] Publicando: ${item.metadata.titulo}`);
        const result = await publisher.publishMedia(
          item.metadata,
          item.mediaPath,
          item.mediaType
        );
        publisher.markAsPublished(item.filePath, result.postId, result.mediaId);
        resultados.push({
          success: true,
          titulo: item.metadata.titulo,
          postId: result.postId,
          mensaje: 'Publicado exitosamente'
        });
      } catch (error) {
        console.error(`[API] Error publicando ${item.metadata.titulo}:`, error.message);
        resultados.push({
          success: false,
          titulo: item.metadata.titulo,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      total: pendientes.length,
      procesados: resultados.length,
      resultados
    });

  } catch (error) {
    console.error('[API] Error en publish-all-pending:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ─── CREAR PUBLICACIÓN DESDE FRONTEND ────────────────────────
router.post('/create-post', async (req, res) => {
  try {
    const { titulo, fecha_publicacion, video_url, image_url, image_path, video_path, hashtags, descripcion, llamada_accion, cover_url, thumb_offset, palabras_clave, respuestas } = req.body;
    
    console.log('[Create Post] 📝 Datos recibidos:', JSON.stringify(req.body, null, 2));
    
    if (!titulo || !fecha_publicacion) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos (titulo, fecha)' });
    }
    
    const nombreArchivo = titulo
      .toLowerCase()
      .replace(/ /g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 50) + '_' + Date.now() + '.md';
    
    const rutaArchivo = path.join('C:/Users/Soledad/Desktop/MiCerebroDigital/Instagram_Content/Programados', nombreArchivo);
    
    let contenido = '---\n';
    contenido += `titulo: "${titulo}"\n`;
    contenido += `fecha_publicacion: "${fecha_publicacion}"\n`;
    
    if (video_url) contenido += `video_url: "${video_url}"\n`;
    if (image_url) contenido += `image_url: "${image_url}"\n`;
    if (image_path) contenido += `image_path: "${image_path}"\n`;
    if (video_path) contenido += `video_path: "${video_path}"\n`;
    
    if (cover_url && cover_url.trim() !== '') {
      contenido += `cover_url: "${cover_url.trim()}"\n`;
    }
    if (thumb_offset) contenido += `thumb_offset: "${thumb_offset}"\n`;
    
    if (hashtags && hashtags.length > 0) {
      const hashtagsStr = hashtags.map(h => `"${h}"`).join(', ');
      contenido += `hashtags: [${hashtagsStr}]\n`;
    }
    
    if (descripcion) contenido += `descripcion: "${descripcion}"\n`;
    if (llamada_accion) contenido += `llamada_accion: "${llamada_accion}"\n`;
    contenido += 'publicado: false\n';
    contenido += '---\n\n';
    contenido += `# ${titulo}\n\n`;
    if (descripcion) contenido += `${descripcion}\n`;
    
    fs.writeFileSync(rutaArchivo, contenido, 'utf-8');
    
    // 🔥 CREAR ARCHIVO DE RESPUESTAS PERSONALIZADAS
    if (palabras_clave && palabras_clave.length > 0 && respuestas) {
      const respuestasPath = path.join('C:/Users/Soledad/Desktop/MiCerebroDigital/Instagram_Content/Respuestas_Personalizadas');
      
      if (!fs.existsSync(respuestasPath)) {
        fs.mkdirSync(respuestasPath, { recursive: true });
      }
      
      const nombreRespuestas = titulo
        .toLowerCase()
        .replace(/ /g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 50) + '_respuestas.md';
      
      const rutaRespuestas = path.join(respuestasPath, nombreRespuestas);
      
      let contenidoRespuestas = `---\n`;
      contenidoRespuestas += `video_titulo: "${titulo}"\n`;
      contenidoRespuestas += `video_id: "pendiente"\n`;
      contenidoRespuestas += `fecha_publicacion: "${fecha_publicacion}"\n`;
      contenidoRespuestas += `---\n\n`;
      contenidoRespuestas += `## 🗣️ RESPUESTAS PERSONALIZADAS\n\n`;
      
      for (const clave of palabras_clave) {
        if (clave === 'default') continue;
        contenidoRespuestas += `### Palabra clave: ${clave.toUpperCase()}\n`;
        contenidoRespuestas += `**Respuesta:**\n${respuestas[clave] || 'Respuesta no definida'}\n\n`;
      }
      
      if (respuestas['default']) {
        contenidoRespuestas += `### Palabra clave: default\n`;
        contenidoRespuestas += `**Respuesta:**\n${respuestas['default']}\n\n`;
      }
      
      fs.writeFileSync(rutaRespuestas, contenidoRespuestas, 'utf-8');
      console.log(`[Create Post] ✅ Respuestas personalizadas guardadas en: ${nombreRespuestas}`);
    }
    
    res.json({
      success: true,
      message: 'Publicación creada exitosamente',
      file: nombreArchivo,
      path: rutaArchivo
    });
    
  } catch (error) {
    console.error('[Create Post Error] ❌', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;