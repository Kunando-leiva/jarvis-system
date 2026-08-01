// backend/src/agents/contentCreatorAgent.js
// Agente Content-Creator - Generación de contenido viral

import { BaseAgent } from './BaseAgent.js';
import storageService from '../services/storageService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ContentCreatorAgent extends BaseAgent {
  constructor() {
    super({
      id: 'content-creator',
      name: 'CONTENT-CREATOR',
      icon: '🎬',
      description: 'Genera guiones virales y contenido para Reels/TikTok',
      color: '#ff6b6b',
      systemPrompt: `
        Sos CONTENT-CREATOR, el agente especializado en contenido viral.
        Tu misión es generar guiones, ideas y contenido para redes sociales.
        
        CAPACIDADES:
        1. 📝 Guiones para Reels (30-60 segundos)
        2. 🎬 Storytelling viral
        3. 📊 Análisis de tendencias
        4. 🎯 Estrategias de contenido
        5. 🔥 Copywriting persuasivo
        
        FORMATO DE RESPUESTA:
        1. 📌 IDEA PRINCIPAL
        2. 📝 GUION COMPLETO (con tiempos)
        3. 🏷️ HASHTAGS ESTRATÉGICOS
        4. ⚔️ CALL TO ACTION
        5. 📊 MÉTRICAS SUGERIDAS
      `
    });
  }

  buildPrompt(message, context) {
    return `
      ${this.systemPrompt}
      
      ⚠️ TEMA O IDEA: "${message}"
      
      📌 INSTRUCCIONES ESPECÍFICAS:
      - Creá contenido que sea VIRAL
      - Usá storytelling épico (estilo vikingo/nórdico)
      - Incluí gancho en los primeros 3 segundos
      - Mantené ritmo rápido y dinámico
      - Proporcioná valor real
      
      🎬 ¡GENERÁ CONTENIDO VIRAL!
    `;
  }

  async handleResponse(text, message, context) {
    // Guardar el guión automáticamente
    const titulo = this.extractTitleFromPrompt(message) || 'Guión generado';
    const guionPath = storageService.guardarGuion(titulo, text, {
      prompt: message,
      agente: 'CONTENT-CREATOR'
    });
    
    // Extraer respuestas personalizadas si las hay
    const respuestas = this.extractRespuestas(text);
    if (Object.keys(respuestas).length > 0) {
      storageService.guardarRespuestas(titulo, respuestas);
    }
    
    // También guardar en temp para referencia
    const tempPath = path.join(__dirname, '../../temp/guion_creado.txt');
    const tempDir = path.dirname(tempPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    fs.writeFileSync(tempPath, text, 'utf-8');
    
    return {
      text: `
${text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 **GUARDADO AUTOMÁTICAMENTE EN:**
📂 ${guionPath}
${Object.keys(respuestas).length > 0 ? `📂 Respuestas personalizadas: guardadas` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Guión generado y guardado correctamente.`,
      provider: 'groq',
      guionPath: guionPath,
      message: '✅ Guión generado y guardado.'
    };
  }

  /**
   * Extrae el título del prompt del usuario
   */
  extractTitleFromPrompt(prompt) {
    // Buscar patrones comunes
    const patterns = [
      /sobre\s+([^,.]+)/i,
      /tema:\s*([^,.]+)/i,
      /para\s+([^,.]+)/i,
      /de\s+([^,.]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match) return match[1].trim();
    }
    
    // Si no encuentra, usar las primeras palabras
    const words = prompt.split(' ').slice(0, 5).join(' ');
    return words || 'Guión sin título';
  }

  /**
   * Extrae respuestas personalizadas del texto
   */
  extractRespuestas(text) {
    const respuestas = {};
    const regex = /###\s*Palabra clave:\s*(.*?)\s*\n\*\*Respuesta:\*\*\s*([\s\S]*?)(?=\n###|$)/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const palabra = match[1].trim();
      const respuesta = match[2].trim();
      if (palabra && respuesta) {
        respuestas[palabra] = respuesta;
      }
    }
    return respuestas;
  }

  async generarGuionReels(tema, duracion = 45) {
    const prompt = `
      Genera un guión para un Reels de ${duracion} segundos sobre:
      "${tema}"
      
      Formato (con tiempos exactos):
      [0:00-0:05] Gancho
      [0:05-0:15] Desarrollo
      [0:15-0:30] Clímax
      [0:30-0:${duracion}] Cierre + Call to Action
    `;
    
    const result = await this.process(prompt);
    return result;
  }

  async generarDescripcionVisual(guion) {
    const prompt = `
      Basado en este guión, generá descripciones visuales para CADA escena:
      
      ${guion}
      
      Formato:
      Escena 1: [descripción visual detallada]
      Escena 2: [descripción visual detallada]
      ...
    `;
    
    const result = await this.process(prompt);
    return result;
  }
}

export default new ContentCreatorAgent();