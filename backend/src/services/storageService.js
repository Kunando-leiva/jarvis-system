// backend/src/services/storageService.js
// Servicio para guardar resultados de agentes

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StorageService {
  constructor() {
    this.vaultPath = process.env.VAULT_PATH || 'C:/Users/Soledad/Desktop/MiCerebroDigital';
    this.instagramContentPath = path.join(this.vaultPath, 'Instagram_Content');
    this.guionesPath = path.join(this.instagramContentPath, 'Guiones');
    this.respuestasPath = path.join(this.instagramContentPath, 'Respuestas_Personalizadas');
    this.imagenesPath = path.join(this.vaultPath, 'img');
    this.videosPath = path.join(this.vaultPath, 'videos');
    
    // Crear carpetas si no existen
    [this.guionesPath, this.respuestasPath, this.imagenesPath, this.videosPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    console.log('[StorageService] 📁 Inicializado');
    console.log(`  📂 Guiones: ${this.guionesPath}`);
    console.log(`  📂 Respuestas: ${this.respuestasPath}`);
    console.log(`  📂 Imágenes: ${this.imagenesPath}`);
    console.log(`  📂 Videos: ${this.videosPath}`);
  }

  /**
   * Guarda un guión generado por CONTENT-CREATOR
   */
  guardarGuion(titulo, contenido, metadata = {}) {
    const timestamp = Date.now();
    const nombreArchivo = titulo
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñü ]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 50);
    
    const filePath = path.join(this.guionesPath, `${nombreArchivo}_${timestamp}.md`);
    
    const contenidoCompleto = `---
titulo: "${titulo}"
fecha_creacion: "${new Date().toISOString()}"
agente: "CONTENT-CREATOR"
tipo: "guion"
${Object.entries(metadata).map(([k, v]) => `${k}: "${v}"`).join('\n')}
---

# ${titulo}

${contenido}
`;
    
    fs.writeFileSync(filePath, contenidoCompleto, 'utf-8');
    console.log(`[StorageService] ✅ Guión guardado: ${filePath}`);
    return filePath;
  }

  /**
   * Guarda una respuesta personalizada para Instagram
   */
  guardarRespuesta(titulo, respuestas, videoId = 'pendiente') {
    const timestamp = Date.now();
    const nombreArchivo = titulo
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñü ]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 50);
    
    const filePath = path.join(this.respuestasPath, `${nombreArchivo}_respuestas_${timestamp}.md`);
    
    let contenido = `---
video_titulo: "${titulo}"
video_id: "${videoId}"
fecha_creacion: "${new Date().toISOString()}"
---

## 🗣️ RESPUESTAS PERSONALIZADAS

`;
    
    for (const [palabra, respuesta] of Object.entries(respuestas)) {
      contenido += `### Palabra clave: ${palabra.toUpperCase()}\n`;
      contenido += `**Respuesta:**\n${respuesta}\n\n`;
    }
    
    fs.writeFileSync(filePath, contenido, 'utf-8');
    console.log(`[StorageService] ✅ Respuestas guardadas: ${filePath}`);
    return filePath;
  }

  /**
   * Guarda un caption generado por KILL-WRITE
   */
  guardarCaption(titulo, caption, hashtags, metadata = {}) {
    const timestamp = Date.now();
    const nombreArchivo = titulo
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñü ]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 50);
    
    const filePath = path.join(this.instagramContentPath, 'Captions', `${nombreArchivo}_${timestamp}.md`);
    
    // Crear carpeta Captions si no existe
    const captionsDir = path.dirname(filePath);
    if (!fs.existsSync(captionsDir)) {
      fs.mkdirSync(captionsDir, { recursive: true });
    }
    
    const contenido = `---
titulo: "${titulo}"
fecha_creacion: "${new Date().toISOString()}"
agente: "KILL-WRITE"
hashtags: ${JSON.stringify(hashtags)}
${Object.entries(metadata).map(([k, v]) => `${k}: "${v}"`).join('\n')}
---

# CAPTION

${caption}

## HASHTAGS

${hashtags.join(' ')}
`;
    
    fs.writeFileSync(filePath, contenido, 'utf-8');
    console.log(`[StorageService] ✅ Caption guardado: ${filePath}`);
    return filePath;
  }

  /**
   * Guarda una imagen generada por VIDEO-GENERATOR
   */
  guardarImagen(origen, destino) {
    const timestamp = Date.now();
    const nombreArchivo = `imagen_${timestamp}.png`;
    const destinoPath = path.join(this.imagenesPath, nombreArchivo);
    
    fs.copyFileSync(origen, destinoPath);
    console.log(`[StorageService] ✅ Imagen guardada: ${destinoPath}`);
    return destinoPath;
  }

  /**
   * Guarda un video generado por VIDEO-GENERATOR
   */
  guardarVideo(origen, titulo) {
    const timestamp = Date.now();
    const nombreArchivo = titulo
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñü ]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 30);
    
    const destinoPath = path.join(this.videosPath, `${nombreArchivo}_${timestamp}.mp4`);
    
    fs.copyFileSync(origen, destinoPath);
    console.log(`[StorageService] ✅ Video guardado: ${destinoPath}`);
    return destinoPath;
  }
}

export default new StorageService();