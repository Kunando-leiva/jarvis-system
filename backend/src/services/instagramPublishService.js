import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

class InstagramPublishService {
  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || 'EAAOunkDS8VcBSLpHAfO4MOKpUjGmtRJBezpYLZAAXCOdyGeZC6UjeqgGZBRjvm5yyLX6OZCrRA01c7sUz1SG3xp8QdZAvQXYNr6akoctMm4SDcohWDarv2zDSnjlPYnMgwhXNgvADuHsvRUbFNVNahWg1Sv1LowsBoG04fCd5s4uVG3S9QIKU8yJZBlhtOJdmR';
    this.igUserId = '17841415579405374';
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.vaultPath = 'C:/Users/Soledad/Desktop/MiCerebroDigital';
    this.publicUrl = 'https://untrue-drainage-cahoots.ngrok-free.dev';
  }

  /**
   * ESCANEAR CONTENIDO PROGRAMADO
   * Soporta: image_path, video_path, image_url, video_url
   */
  async scanScheduledContent() {
    const programadosPath = path.join(this.vaultPath, 'Instagram_Content', 'Programados');
    
    if (!fs.existsSync(programadosPath)) {
      fs.mkdirSync(programadosPath, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(programadosPath);
    const ahora = new Date();
    const pendientes = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = path.join(programadosPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const metadata = this.extractMetadata(content);

      if (!metadata) continue;
      if (metadata.publicado === 'true') continue;

      const fechaPub = new Date(metadata.fecha_publicacion);
      if (fechaPub <= ahora) {
        // Determinar tipo de medio (prioridad: URL externa > archivo local)
        let mediaPath = '';
        let mediaType = 'text';
        
        if (metadata.video_url) {
          mediaPath = metadata.video_url;
          mediaType = 'video_url';
        } else if (metadata.image_url) {
          mediaPath = metadata.image_url;
          mediaType = 'image_url';
        } else if (metadata.video_path) {
          mediaPath = path.join(this.vaultPath, metadata.video_path);
          mediaType = 'video';
        } else if (metadata.image_path) {
          mediaPath = path.join(this.vaultPath, metadata.image_path);
          mediaType = 'image';
        } else {
          mediaType = 'text';
        }
        
        pendientes.push({
          file,
          filePath,
          metadata,
          mediaPath,
          mediaType
        });
      }
    }

    return pendientes;
  }

  /**
   * DETECTAR TIPO DE MEDIO (para archivos locales)
   */
  detectMediaType(mediaPath) {
    if (!mediaPath || mediaPath.trim() === '') {
      return 'text';
    }
    
    const ext = path.extname(mediaPath).toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.jfif', '.bmp', '.tiff'];
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm'];
    
    if (imageExtensions.includes(ext)) return 'image';
    if (videoExtensions.includes(ext)) return 'video';
    return 'text';
  }

  /**
   * EXTRAER METADATA del frontmatter
   */
  extractMetadata(content) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    const metadata = {};
    const lines = frontmatterMatch[1].split('\n');

    for (const line of lines) {
      const [key, ...values] = line.split(':');
      if (key && values.length) {
        let value = values.join(':').trim();
        value = value.replace(/^["']|["']$/g, '');
        
        if (value.startsWith('[') && value.endsWith(']')) {
          try {
            metadata[key.trim()] = JSON.parse(value);
          } catch {
            metadata[key.trim()] = value.split(',').map(v => v.trim());
          }
        } else {
          metadata[key.trim()] = value;
        }
      }
    }

    return metadata;
  }

  /**
   * PUBLICAR MEDIO (punto de entrada principal)
   */
  async publishMedia(metadata, mediaPath, mediaType) {
    console.log(`[Instagram Publish] Tipo: ${mediaType}`);
    
    // URL externa de video
    if (mediaType === 'video_url') {
      return await this.publishVideoFromUrl(metadata, mediaPath);
    }
    
    // URL externa de imagen
    if (mediaType === 'image_url') {
      return await this.publishImageFromUrl(metadata, mediaPath);
    }
    
    // Archivo local de video
    if (mediaType === 'video') {
      return await this.publishVideo(metadata, mediaPath);
    }
    
    // Archivo local de imagen
    if (mediaType === 'image') {
      return await this.publishImage(metadata, mediaPath);
    }
    
    // Solo texto (genera imagen automáticamente)
    return await this.publishText(metadata);
  }

  /**
   * 🎬 PUBLICAR VIDEO DESDE URL EXTERNA
   */
  async publishVideoFromUrl(metadata, videoUrl) {
    try {
      console.log(`[Instagram Publish] Publicando video desde URL: ${metadata.titulo}`);
      console.log(`[Instagram Publish] URL: ${videoUrl}`);

      const containerUrl = `${this.baseUrl}/${this.igUserId}/media`;
      
      const params = new URLSearchParams();
      params.append('media_type', 'REELS');
      params.append('video_url', videoUrl);
      params.append('caption', this.buildCaption(metadata));
      params.append('share_to_feed', 'true');
      params.append('access_token', this.accessToken);

      console.log('[Instagram Publish] Subiendo video desde URL...');
      const containerResponse = await axios.post(containerUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 120000,
      });

      const creationId = containerResponse.data.id;
      console.log(`[Instagram Publish] Video subido, ID: ${creationId}`);

      await this.waitForProcessing(creationId);

      const publishUrl = `${this.baseUrl}/${this.igUserId}/media_publish`;
      const publishResponse = await axios.post(publishUrl, {
        creation_id: creationId,
        access_token: this.accessToken,
      });

      console.log(`[Instagram Publish] ✅ Video publicado! ID: ${publishResponse.data.id}`);
      return {
        success: true,
        postId: publishResponse.data.id,
        mediaId: creationId,
        metadata,
      };

    } catch (error) {
      console.error('[Instagram Publish Error]', error.response?.data || error.message);
      throw new Error(`Error publicando video desde URL: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * 📸 PUBLICAR IMAGEN DESDE URL EXTERNA
   */
  async publishImageFromUrl(metadata, imageUrl) {
    try {
      console.log(`[Instagram Publish] Publicando imagen desde URL: ${metadata.titulo}`);
      console.log(`[Instagram Publish] URL: ${imageUrl}`);

      const containerUrl = `${this.baseUrl}/${this.igUserId}/media`;
      
      const params = new URLSearchParams();
      params.append('image_url', imageUrl);
      params.append('caption', this.buildCaption(metadata));
      params.append('access_token', this.accessToken);

      console.log('[Instagram Publish] Subiendo imagen desde URL...');
      const containerResponse = await axios.post(containerUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 60000,
      });

      const creationId = containerResponse.data.id;
      console.log(`[Instagram Publish] Imagen subida, ID: ${creationId}`);

      const publishUrl = `${this.baseUrl}/${this.igUserId}/media_publish`;
      const publishResponse = await axios.post(publishUrl, {
        creation_id: creationId,
        access_token: this.accessToken,
      });

      console.log(`[Instagram Publish] ✅ Imagen publicada! ID: ${publishResponse.data.id}`);
      return {
        success: true,
        postId: publishResponse.data.id,
        mediaId: creationId,
        metadata,
      };

    } catch (error) {
      console.error('[Instagram Publish Error]', error.response?.data || error.message);
      throw new Error(`Error publicando imagen desde URL: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * 📸 PUBLICAR IMAGEN LOCAL
   */
  async publishImage(metadata, imagePath) {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Imagen no encontrada: ${imagePath}`);
      }

      console.log(`[Instagram Publish] Publicando imagen local: ${metadata.titulo}`);
      
      const fileName = path.basename(imagePath);
      const publicImageUrl = `${this.publicUrl}/api/media/${fileName}`;
      
      console.log(`[Instagram Publish] URL pública: ${publicImageUrl}`);

      const containerUrl = `${this.baseUrl}/${this.igUserId}/media`;
      
      const params = new URLSearchParams();
      params.append('image_url', publicImageUrl);
      params.append('caption', this.buildCaption(metadata));
      params.append('access_token', this.accessToken);

      console.log('[Instagram Publish] Subiendo imagen...');
      const containerResponse = await axios.post(containerUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 60000,
      });

      const creationId = containerResponse.data.id;
      console.log(`[Instagram Publish] Imagen subida, ID: ${creationId}`);

      const publishUrl = `${this.baseUrl}/${this.igUserId}/media_publish`;
      const publishResponse = await axios.post(publishUrl, {
        creation_id: creationId,
        access_token: this.accessToken,
      });

      console.log(`[Instagram Publish] ✅ Imagen publicada! ID: ${publishResponse.data.id}`);
      return {
        success: true,
        postId: publishResponse.data.id,
        mediaId: creationId,
        metadata,
      };

    } catch (error) {
      console.error('[Instagram Publish Error]', error.response?.data || error.message);
      throw new Error(`Error publicando imagen: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * 🎬 PUBLICAR VIDEO LOCAL
   */
  async publishVideo(metadata, videoPath) {
    try {
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video no encontrado: ${videoPath}`);
      }

      console.log(`[Instagram Publish] Publicando video local: ${metadata.titulo}`);

      const containerUrl = `${this.baseUrl}/${this.igUserId}/media`;
      
      const params = new URLSearchParams();
      params.append('media_type', 'REELS');
      const fileName = path.basename(videoPath);
      const publicVideoUrl = `${this.publicUrl}/api/media/${fileName}`;
      params.append('video_url', publicVideoUrl);
      params.append('caption', this.buildCaption(metadata));
      params.append('share_to_feed', 'true');
      params.append('access_token', this.accessToken);

       // 🔥 PORTADA PERSONALIZADA
    if (metadata.cover_url) {
      formData.append('cover_url', metadata.cover_url);
      console.log(`[Instagram Publish] ✅ Portada personalizada: ${metadata.cover_url}`);
    } else if (metadata.thumb_offset) {
      formData.append('thumb_offset', metadata.thumb_offset);
      console.log(`[Instagram Publish] ✅ Portada en fotograma: ${metadata.thumb_offset}ms`);
    }

      console.log('[Instagram Publish] Subiendo Reel...');
      const containerResponse = await axios.post(containerUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 120000,
      });

      const creationId = containerResponse.data.id;
      console.log(`[Instagram Publish] Reel subido, ID: ${creationId}`);

      await this.waitForProcessing(creationId);

      const publishUrl = `${this.baseUrl}/${this.igUserId}/media_publish`;
      const publishResponse = await axios.post(publishUrl, {
        creation_id: creationId,
        access_token: this.accessToken,
      });

      console.log(`[Instagram Publish] ✅ Reel publicado! ID: ${publishResponse.data.id}`);
      return {
        success: true,
        postId: publishResponse.data.id,
        mediaId: creationId,
        metadata,
      };

    } catch (error) {
      console.error('[Instagram Publish Error]', error.response?.data || error.message);
      throw new Error(`Error publicando video: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * 📝 PUBLICAR TEXTO (genera imagen automáticamente)
   */
  async publishText(metadata) {
    try {
      console.log(`[Instagram Publish] Generando imagen para texto: ${metadata.titulo}`);
      
      const tempImagePath = path.join(this.vaultPath, 'videos', `temp_${Date.now()}.jpg`);
      
      const { execSync } = await import('child_process');
      const text = (metadata.descripcion || metadata.titulo || 'Publicación').replace(/'/g, "\\'");
      
      const ffmpegCmd = `ffmpeg -f lavfi -i color=c=navy:size=1080x1080:duration=1 -vf "drawtext=text='${text}':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=(h-text_h)/2:fontfile='C\\\\:/Windows/Fonts/Arial.ttf'" -frames:v 1 -c:v mjpeg -q:v 2 "${tempImagePath}"`;
      
      try {
        execSync(ffmpegCmd, { stdio: 'ignore' });
      } catch (error) {
        const simpleCmd = `ffmpeg -f lavfi -i color=c=navy:size=1080x1080:duration=1 -frames:v 1 -c:v mjpeg -q:v 2 "${tempImagePath}"`;
        execSync(simpleCmd, { stdio: 'ignore' });
      }
      
      const result = await this.publishImage(metadata, tempImagePath);
      
      try {
        fs.unlinkSync(tempImagePath);
      } catch (e) {}
      
      return result;

    } catch (error) {
      console.error('[Instagram Publish Error]', error.message);
      throw new Error(`Error publicando texto: ${error.message}`);
    }
  }

  /**
   * ESPERAR PROCESAMIENTO
   */
  async waitForProcessing(mediaId, maxAttempts = 30) {
    const statusUrl = `${this.baseUrl}/${mediaId}`;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(statusUrl, {
          params: {
            fields: 'status_code,status',
            access_token: this.accessToken,
          },
        });

        const status = response.data.status_code;
        console.log(`[Instagram Publish] Estado: ${status}`);

        if (status === 'FINISHED') {
          return true;
        } else if (status === 'ERROR') {
          const errorMsg = response.data.status || 'Error procesando el medio';
          throw new Error(`Error procesando: ${errorMsg}`);
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error('[Instagram Publish] Error verificando estado:', error.message);
        throw error;
      }
    }

    throw new Error('Timeout esperando procesamiento');
  }

  /**
   * CONSTRUIR CAPTION
   */
  buildCaption(metadata) {
    let caption = metadata.descripcion || metadata.titulo || '';
    
    if (metadata.hashtags && metadata.hashtags.length > 0) {
      const hashtags = Array.isArray(metadata.hashtags) 
        ? metadata.hashtags 
        : metadata.hashtags.split(',').map(h => h.trim());
      caption += '\n\n' + hashtags.join(' ');
    }

    if (metadata.llamada_accion) {
      caption += `\n\n${metadata.llamada_accion}`;
    }

    return caption.slice(0, 2200);
  }

  /**
   * MARCAR COMO PUBLICADO
   */
  markAsPublished(filePath, postId, mediaId) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const updated = content.replace(
      /^---\n([\s\S]*?)\n---/,
      (match, frontmatter) => {
        let newFrontmatter = frontmatter;
        
        if (newFrontmatter.includes('publicado:')) {
          newFrontmatter = newFrontmatter.replace(/publicado:.*/, `publicado: true`);
        } else {
          newFrontmatter += `\npublicado: true`;
        }

        newFrontmatter += `\ninstagram_post_id: ${postId}`;
        newFrontmatter += `\ninstagram_media_id: ${mediaId}`;
        newFrontmatter += `\nfecha_publicacion_real: ${new Date().toISOString()}`;

        return `---\n${newFrontmatter}\n---`;
      }
    );

    fs.writeFileSync(filePath, updated, 'utf-8');

    const fileName = path.basename(filePath);
    const publicadosPath = path.join(path.dirname(filePath), '..', 'Publicados');
    
    if (!fs.existsSync(publicadosPath)) {
      fs.mkdirSync(publicadosPath, { recursive: true });
    }

    const newPath = path.join(publicadosPath, fileName);
    fs.renameSync(filePath, newPath);
    
    console.log(`[Instagram Publish] Archivo movido a: ${newPath}`);
    
     // 🔥🔥🔥 AGREGAR ESTA LÍNEA PARA ACTUALIZAR RESPUESTAS
  this.actualizarVideoIdEnRespuestas(this.extractTitleFromContent(content), postId);
  
  return newPath;
  }

  /**
 * EXTRAER TÍTULO DEL CONTENIDO (función auxiliar)
 */
extractTitleFromContent(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const tituloMatch = frontmatter.match(/titulo:\s*["']?(.*?)["']?\n/);
    if (tituloMatch) {
      return tituloMatch[1].trim();
    }
  }
  return null;
}

  /**
 * ACTUALIZAR VIDEO_ID EN EL ARCHIVO DE RESPUESTAS
 */
async actualizarVideoIdEnRespuestas(titulo, postId) {
  try {
    const respuestasPath = path.join(this.vaultPath, 'Instagram_Content', 'Respuestas_Personalizadas');
    
    if (!fs.existsSync(respuestasPath)) {
      console.log('[Respuestas] ⚠️ Carpeta de respuestas no encontrada');
      return;
    }

    const files = fs.readdirSync(respuestasPath);
    console.log(`[Respuestas] 🔍 Buscando archivo de respuestas para: "${titulo}"`);
    
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      
      const filePath = path.join(respuestasPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Buscar video_titulo en el frontmatter
      const tituloMatch = content.match(/video_titulo:\s*["']?(.*?)["']?\n/);
      if (!tituloMatch) continue;
      
      const tituloArchivo = tituloMatch[1].trim();
      
      // Si el título coincide (aproximadamente)
      if (tituloArchivo.toLowerCase().includes(titulo.toLowerCase()) || 
          titulo.toLowerCase().includes(tituloArchivo.toLowerCase())) {
        
        console.log(`[Respuestas] ✅ Encontrado archivo de respuestas: ${file}`);
        
        // Actualizar el video_id en el frontmatter
        let newContent = content;
        
        // Reemplazar video_id existente o agregarlo
        if (content.includes('video_id:')) {
          newContent = newContent.replace(
            /video_id:\s*["']?.*["']?\n/,
            `video_id: "${postId}"\n`
          );
        } else {
          // Si no tiene video_id, agregarlo después del título
          newContent = newContent.replace(
            /(video_titulo:.*?\n)/,
            `$1video_id: "${postId}"\n`
          );
        }
        
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`[Respuestas] ✅ video_id actualizado a "${postId}" en ${file}`);
        return;
      }
    }
    
    console.log('[Respuestas] ⚠️ No se encontró archivo de respuestas para este video');
  } catch (error) {
    console.error('[Respuestas] ❌ Error:', error.message);
  }
}
}

export default InstagramPublishService;