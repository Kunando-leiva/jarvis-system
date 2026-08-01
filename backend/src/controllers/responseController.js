// backend/src/controllers/responseController.js
// 🎯 Lógica de respuestas personalizadas

import fs from 'fs';
import path from 'path';
import { normalizarTexto } from '../utils/textFormatter.js';

export function buscarRespuestaPersonalizada(comentario, postId) {
  try {
    const respuestasPath = path.join('C:', 'Users', 'Soledad', 'Desktop', 'MiCerebroDigital', 'Instagram_Content', 'Respuestas_Personalizadas');
    
    if (!fs.existsSync(respuestasPath)) {
      console.log('[Respuestas] ⚠️ Carpeta no encontrada');
      return null;
    }

    const files = fs.readdirSync(respuestasPath);
    const comentarioNormalizado = normalizarTexto(comentario);
    
    console.log(`[Respuestas] 🔍 Buscando: "${comentario}" (normalizado: "${comentarioNormalizado}") para post_id: "${postId}"`);
    
    // 🔥 PRIMERO: Buscar archivo con video_id que coincida EXACTAMENTE
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      
      const filePath = path.join(respuestasPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const idMatch = content.match(/video_id:\s*["']?(.*?)["']?\n/);
      if (idMatch) {
        const idVideo = idMatch[1].trim();
        
        if (idVideo === postId) {
          console.log(`[Respuestas] ✅ Archivo con ID exacto: ${file}`);
          const respuesta = buscarRespuestaEnArchivo(content, comentarioNormalizado);
          if (respuesta) return respuesta;
          
          const defaultMatch = content.match(/###\s*Palabra clave:\s*default\s*\n\*\*Respuesta:\*\*\s*([\s\S]*?)(?=\n###|$)/i);
          if (defaultMatch) {
            console.log(`[Respuestas] ✅ Usando default de archivo con ID exacto`);
            return defaultMatch[1].trim();
          }
        }
      }
    }
    
    // 🔥 SEGUNDO: Buscar archivos con "pendiente"
    const archivosPendientes = files.filter(file => {
      if (!file.endsWith('.md')) return false;
      const content = fs.readFileSync(path.join(respuestasPath, file), 'utf-8');
      const idMatch = content.match(/video_id:\s*["']?(.*?)["']?\n/);
      return idMatch && idMatch[1].trim() === 'pendiente';
    });
    
    archivosPendientes.sort((a, b) => {
      const statA = fs.statSync(path.join(respuestasPath, a));
      const statB = fs.statSync(path.join(respuestasPath, b));
      return statB.mtime.getTime() - statA.mtime.getTime();
    });
    
    for (const file of archivosPendientes) {
      console.log(`[Respuestas] 📄 Revisando archivo pendiente: ${file}`);
      const filePath = path.join(respuestasPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const respuesta = buscarRespuestaEnArchivo(content, comentarioNormalizado);
      if (respuesta) return respuesta;
      
      const defaultMatch = content.match(/###\s*Palabra clave:\s*default\s*\n\*\*Respuesta:\*\*\s*([\s\S]*?)(?=\n###|$)/i);
      if (defaultMatch) {
        console.log(`[Respuestas] ✅ Usando default de archivo pendiente: ${file}`);
        return defaultMatch[1].trim();
      }
    }
    
    console.log(`[Respuestas] ❌ No se encontró respuesta para "${comentario}"`);
    return null;
  } catch (error) {
    console.error('[Respuestas] ❌ Error:', error.message);
    return null;
  }
}

export function buscarRespuestaEnArchivo(content, comentarioNormalizado) {
  const regex = /###\s*Palabra clave:\s*(.*?)\s*\n\*\*Respuesta:\*\*\s*([\s\S]*?)(?=\n###|$)/gi;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const clave = normalizarTexto(match[1].trim());
    const respuesta = match[2].trim();
    
    if (clave === comentarioNormalizado) {
      console.log(`[Respuestas] ✅ Encontrada palabra clave: "${clave}"`);
      return respuesta;
    }
  }
  
  return null;
}