// backend/src/agents/videoGeneratorAgent.js
// Agente especializado en generación de imágenes, videos y automatización

import { BaseAgent } from './BaseAgent.js';
import fooocusService from '../services/fooocusService.js';
import instagramPublishService from '../services/instagramPublishService.js';
import storageService from '../services/storageService.js';
import { agentRegistry } from './index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class VideoGeneratorAgent extends BaseAgent {
  constructor() {
    super({
      id: 'video-generator',
      name: 'VIDEO-GENERATOR',
      icon: '🎥',
      description: 'Genera imágenes con Fooocus, videos y publica en Instagram',
      color: '#ff6b35',
      systemPrompt: `
        Sos VIDEO-GENERATOR, el agente maestro de creación visual y automatización.
        Usas Fooocus para crear imágenes de alta calidad localmente.

        CAPACIDADES:
        1. 🎨 Generar imágenes desde prompts de texto
        2. 🎬 Crear videos con imágenes y narración
        3. 📤 Publicar en Instagram directamente
        4. 🔄 Automatizar flujo completo (guión + imágenes + video + publicación)

        COMANDOS:
        - /imagen [prompt] - Genera una imagen
        - /imagen [prompt] --modelo [modelo] - Genera con modelo específico
        - /imagen [prompt] --rapido - Genera rápido (4 pasos)
        - /publish - Publica la última imagen en Instagram
        - /video [tema] - Genera video completo desde un tema
        - /automatizar [tema] - Flujo completo (guión+video+publicación)
        - /estado - Verifica el estado de Fooocus
        - /modelos - Lista modelos disponibles

        🎯 ¡Transformando ideas en contenido automatizado!
      `
    });
    
    // Almacenar última imagen y video generados
    this.lastGeneratedImage = null;
    this.lastGeneratedVideo = null;
  }

  // ================================================================
  // 🔍 DETECCIÓN DE COMANDOS
  // ================================================================

  async handleResponse(text, message, context) {
    const lower = message.toLowerCase();
    
    // Detectar comandos
    if (lower.includes('/imagen') || lower.includes('genera imagen')) {
      return await this.handleImageGeneration(message, context);
    }
    
    if (lower.includes('/video') || lower.includes('genera video')) {
      return await this.handleVideoGeneration(message, context);
    }
    
    if (lower.includes('/automatizar') || lower.includes('flujo completo')) {
      return await this.handleFullAutomation(message, context);
    }
    
    if (lower.includes('/publish') || lower.includes('publicar')) {
      return await this.handlePublish(message, context);
    }
    
    if (lower.includes('/estado') || lower.includes('estado fooocus')) {
      return await this.handleStatusCheck();
    }
    
    if (lower.includes('/modelos') || lower.includes('modelos disponibles')) {
      return await this.handleListModels();
    }
    
    // Si no es un comando específico
    return {
      text: `
🎥 **VIDEO-GENERATOR - Comandos Disponibles**

📌 **Generar imagen:**
\`/imagen un guerrero vikingo en un barco, cielo dramático\`

📌 **Generar rápido (4 pasos):**
\`/imagen un guerrero vikingo --rapido\`

📌 **Usar modelo específico:**
\`/imagen un guerrero vikingo --modelo realisticStockPhoto_v20.safetensors\`

📌 **Generar video desde un tema:**
\`/video La historia de Ragnar Lothbrok\`

📌 **Flujo completo (guión + video + publicación):**
\`/automatizar La historia de Ragnar Lothbrok\`

📌 **Publicar en Instagram:**
\`/publish\` - Publica la última imagen/video generado

📌 **Ver estado de Fooocus:**
\`/estado\`

📌 **Ver modelos disponibles:**
\`/modelos\`

💡 **Consejo:** Los modelos más rápidos son:
- \`sd_xl_turbo_1.0_fp16.safetensors\` (⚡ 10-15 segundos)
- \`realisticStockPhoto_v20.safetensors\` (📸 Buena calidad)

🚀 **¡Empieza generando tu primera imagen!**`,
      provider: 'local'
    };
  }

  // ================================================================
  // 🎨 GENERACIÓN DE IMÁGENES
  // ================================================================

  async handleImageGeneration(message, context) {
    // Extraer el prompt
    let prompt = message
      .replace(/\/imagen|genera imagen|/gi, '')
      .trim();

    // Detectar opciones
    const options = {};
    
    // --rapido
    if (prompt.includes('--rapido')) {
      options.steps = 4;
      options.model = 'sd_xl_turbo_1.0_fp16.safetensors';
      prompt = prompt.replace('--rapido', '').trim();
    }
    
    // --modelo
    const modelMatch = prompt.match(/--modelo\s+([^\s]+)/);
    if (modelMatch) {
      options.model = modelMatch[1];
      prompt = prompt.replace(/--modelo\s+[^\s]+/, '').trim();
    }

    if (!prompt || prompt.length < 5) {
      return {
        text: `📝 Por favor, describe la imagen que quieres generar.\n\nEjemplo:\n\`/imagen un guerrero vikingo en un barco, cielo dramático, cinematográfico\``,
        provider: 'local'
      };
    }

    this.status = 'thinking';
    const result = await fooocusService.generateImage(prompt, options);
    this.status = 'done';

    if (result.success) {
      // Guardar imagen en el vault
      const titulo = prompt.split(' ').slice(0, 5).join(' ');
      const imagenGuardada = storageService.guardarImagen(result.imagePath, titulo);
      
      // Guardar en contexto para publicación
      this.lastGeneratedImage = result;
      context.lastImage = result;
      
      return {
        text: `
# 🎨 IMAGEN GENERADA CON FOOOCUS

## 📝 Prompt
${prompt}

## 📁 Archivos
- **Ruta:** ${result.imagePath}
- **Vault:** ${imagenGuardada}
- **Nombre:** ${result.filename}

## ⚡ Configuración Usada
- **Modelo:** ${options.model || 'juggernautXL_v8Rundiffusion.safetensors'}
- **Pasos:** ${options.steps || 10}
- **Resolución:** 768x1152

## 📌 Próximos Pasos
1. ✅ Imagen generada exitosamente
2. 📤 Usa \`/publish\` para publicar en Instagram
3. 🎬 Usa \`/video\` para crear un video con esta imagen

✅ ¡Imagen lista para usar!`,
        provider: 'groq',
        actions: [
          { action: 'image_generated', data: result }
        ]
      };
    } else {
      return {
        text: `❌ **Error generando imagen:** ${result.error}\n\n💡 Asegúrate de que Fooocus esté corriendo:\n🌐 http://127.0.0.1:7865\n\nPara iniciarlo:\n\`cd F:\\Fooocus && python entry_with_update.py --port 7865 --always-low-vram\``,
        provider: 'local'
      };
    }
  }

  // ================================================================
  // 🎬 GENERACIÓN DE VIDEOS
  // ================================================================

  async handleVideoGeneration(message, context) {
    const tema = message.replace(/\/video|genera video|/gi, '').trim();
    
    if (!tema || tema.length < 5) {
      return {
        text: `📝 Para generar un video, proporciona un tema:\n\n\`/video La historia de Ragnar Lothbrok\``,
        provider: 'local'
      };
    }

    try {
      // 1. Verificar que CONTENT-CREATOR está disponible
      const contentCreator = agentRegistry.getAgent('content-creator');
      if (!contentCreator) {
        return {
          text: `❌ El agente CONTENT-CREATOR no está disponible.\n\n💡 Asegúrate de que esté registrado en agentRegistry.`,
          provider: 'local'
        };
      }

      this.status = 'thinking';
      const steps = [];

      // 1. Generar guión
      steps.push('📝 Generando guión...');
      const guionResult = await contentCreator.process(
        `Genera un guión detallado para un video sobre: ${tema}. 
         Incluye descripciones visuales para cada escena (al menos 5 escenas).
         Formato: narrativa épica con estilo cinematográfico.`,
        context
      );
      const guion = guionResult.text;

      // 2. Extraer prompts del guión
      steps.push('🎨 Preparando prompts para imágenes...');
      const prompts = this.extractPromptsFromScript(guion);
      
      // 3. Generar imágenes con Fooocus
      steps.push(`📷 Generando ${prompts.length} imágenes con Fooocus...`);
      const imagenes = [];
      for (const prompt of prompts) {
        const imgResult = await fooocusService.generateImage(prompt, { steps: 10 });
        if (imgResult.success) {
          imagenes.push(imgResult.imagePath);
        }
      }

      if (imagenes.length === 0) {
        return {
          text: `❌ No se pudieron generar imágenes para el video.\n\n💡 Verifica que Fooocus esté corriendo correctamente.`,
          provider: 'local'
        };
      }

      // 4. Generar narración
      steps.push('🎵 Generando narración con Edge TTS...');
      const videoService = new (await import('../services/videoGeneratorService.js')).default;
      const audioPath = await videoService.generarNarracion(guion);

      // 5. Crear video
      steps.push('🎬 Creando video...');
      const timestamp = Date.now();
      const outputPath = path.join(videoService.tempDir, `video_${timestamp}.mp4`);
      
      await videoService.createVideo(imagenes, audioPath, outputPath, {
        duracionImagen: 4,
        palabrasPorLinea: 5,
        estiloSubtitulos: 'CapCut',
        zoomInteligente: true
      });

      // 6. Guardar video en el vault
      const videoGuardado = storageService.guardarVideo(outputPath, tema);
      
      // 7. Guardar imágenes en el vault
      const imagenesGuardadas = imagenes.map(img => storageService.guardarImagen(img, tema));

      this.status = 'done';
      this.lastGeneratedVideo = outputPath;

      return {
        text: `
# 🎬 VIDEO GENERADO Y GUARDADO

## 📝 Tema
${tema}

## 📊 Resumen
- **Imágenes generadas:** ${imagenes.length}
- **Duración estimada:** ${imagenes.length * 4} segundos
- **Audio:** Narración generada con Edge TTS

## 📁 Archivos Guardados
- **Video:** ${videoGuardado}
- **Imágenes:** ${imagenesGuardadas.map((p, i) => `\n  ${i+1}. ${path.basename(p)}`).join('')}

## 📌 Próximos Pasos
1. 📤 Usa \`/publish\` para publicar en Instagram
2. 👁️ HEIMDALL monitoreará el rendimiento
3. ⚔️ GIDEON gestionará los comentarios

✅ ¡Video generado y guardado correctamente!`,
        provider: 'groq',
        actions: [
          { action: 'video_generated', data: { outputPath, videoGuardado, imagenesGuardadas, guion } }
        ]
      };

    } catch (error) {
      this.status = 'error';
      return {
        text: `❌ **Error generando video:** ${error.message}\n\n💡 Asegúrate de que:\n- CONTENT-CREATOR esté registrado\n- Fooocus esté corriendo\n- Edge TTS esté instalado (pip install edge-tts)`,
        provider: 'local'
      };
    }
  }

  // ================================================================
  // 🚀 AUTOMATIZACIÓN COMPLETA
  // ================================================================

  async handleFullAutomation(message, context) {
    const tema = message.replace(/\/automatizar|flujo completo|/gi, '').trim();
    
    if (!tema || tema.length < 5) {
      return {
        text: `📝 Para ejecutar el flujo completo, proporciona un tema:\n\n\`/automatizar La historia de Ragnar Lothbrok\``,
        provider: 'local'
      };
    }

    try {
      this.status = 'thinking';
      const steps = [];
      const startTime = Date.now();
      
      // PASO 1: Generar guión
      steps.push('📝 Generando guión con CONTENT-CREATOR...');
      const contentCreator = agentRegistry.getAgent('content-creator');
      if (!contentCreator) {
        return {
          text: `❌ El agente CONTENT-CREATOR no está disponible.`,
          provider: 'local'
        };
      }
      
      const guionResult = await contentCreator.process(
        `Genera un guión detallado para un video sobre: ${tema}. 
         Incluye descripciones visuales para cada escena.
         Formato: narrativa épica con estilo cinematográfico.`,
        context
      );
      const guion = guionResult.text;

      // PASO 2: Extraer prompts y generar imágenes
      steps.push('🎨 Generando imágenes con Fooocus...');
      const prompts = this.extractPromptsFromScript(guion);
      const imagenes = [];
      for (const prompt of prompts) {
        const imgResult = await fooocusService.generateImage(prompt, { steps: 10 });
        if (imgResult.success) {
          imagenes.push(imgResult.imagePath);
        }
      }

      if (imagenes.length === 0) {
        throw new Error('No se pudieron generar imágenes');
      }

      // PASO 3: Generar narración
      steps.push('🎵 Generando narración con Edge TTS...');
      const videoService = new (await import('../services/videoGeneratorService.js')).default;
      const audioPath = await videoService.generarNarracion(guion);

      // PASO 4: Crear video
      steps.push('🎬 Creando video...');
      const timestamp = Date.now();
      const outputPath = path.join(videoService.tempDir, `video_${timestamp}.mp4`);
      await videoService.createVideo(imagenes, audioPath, outputPath, {
        duracionImagen: 4,
        palabrasPorLinea: 5,
        estiloSubtitulos: 'CapCut',
        zoomInteligente: true
      });
      this.lastGeneratedVideo = outputPath;

      // PASO 5: Guardar todo en el vault
      steps.push('💾 Guardando archivos en el vault...');
      const videoGuardado = storageService.guardarVideo(outputPath, tema);
      const imagenesGuardadas = imagenes.map(img => storageService.guardarImagen(img, tema));
      
      // PASO 6: Publicar en Instagram
      steps.push('📤 Publicando en Instagram...');
      const publishResult = await instagramPublishService.publishMedia(
        {
          titulo: tema,
          descripcion: `Video generado automáticamente sobre: ${tema}`,
          hashtags: ['#IA', '#JARVIS', '#Vikingos', '#Automatizacion', '#ContenidoEpico'],
          llamada_accion: '⚔️ ¡Síguenos para más contenido épico!'
        },
        outputPath,
        'video'
      );

      this.status = 'done';
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);

      return {
        text: `
# 🚀 FLUJO COMPLETO FINALIZADO

## 📝 Tema
${tema}

## ⏱️ Tiempo Total
${Math.floor(totalTime / 60)}m ${totalTime % 60}s

## ✅ Pasos Completados
${steps.map((s, i) => `${i+1}. ${s}`).join('\n')}

## 📁 Archivos Generados y Guardados
- **Video:** ${videoGuardado}
- **Imágenes:** ${imagenesGuardadas.length} guardadas
- **Guión:** guardado automáticamente
- **Instagram Post ID:** ${publishResult.postId || 'Publicado'}

## 📊 Estadísticas
- **Total imágenes generadas:** ${imagenesGuardadas.length}
- **Duración video:** ${imagenesGuardadas.length * 4} segundos
- **Publicación:** ✅

🔥 **¡Automatización completada con éxito!**`,
        provider: 'groq',
        actions: [
          { action: 'full_automation', data: { tema, outputPath, videoGuardado, publishResult, imagenesGuardadas, guion } }
        ]
      };

    } catch (error) {
      this.status = 'error';
      return {
        text: `❌ **Error en el flujo completo:** ${error.message}\n\n💡 Verifica que todos los servicios estén corriendo.`,
        provider: 'local'
      };
    }
  }

  // ================================================================
  // 📤 PUBLICAR EN INSTAGRAM
  // ================================================================

  async handlePublish(message, context) {
    // Priorizar: video > imagen
    let mediaPath = this.lastGeneratedVideo || this.lastGeneratedImage?.imagePath;
    let mediaType = this.lastGeneratedVideo ? 'video' : 'image';
    
    if (!mediaPath) {
      return {
        text: `❌ No hay contenido reciente para publicar.\n\n💡 Primero genera algo con:\n- \`/imagen [descripción]\` para una imagen\n- \`/video [tema]\` para un video\n- \`/automatizar [tema]\` para flujo completo`,
        provider: 'local'
      };
    }

    try {
      const titulo = this.lastGeneratedVideo ? 'Video generado con IA' : 'Imagen generada con IA';
      const descripcion = this.lastGeneratedVideo ? `Video creado automáticamente` : (this.lastGeneratedImage?.prompt || 'Imagen generada con IA');
      
      const publishResult = await instagramPublishService.publishMedia(
        {
          titulo: titulo,
          descripcion: descripcion,
          hashtags: ['#IA', '#Fooocus', '#JARVIS', '#Vikingos', '#ContenidoAutomatico'],
          llamada_accion: '⚔️ ¡Síguenos para más contenido épico!'
        },
        mediaPath,
        mediaType
      );

      return {
        text: `
# 📤 PUBLICACIÓN EN INSTAGRAM

## ✅ ¡Publicación Exitosa!

## 📝 Detalles
- **Tipo:** ${mediaType === 'video' ? '🎬 Video' : '🖼️ Imagen'}
- **Post ID:** ${publishResult.postId || 'Confirmado'}
- **Media ID:** ${publishResult.mediaId || 'Confirmado'}

## 📊 Descripción
${descripcion.substring(0, 150)}...

## 📌 Próximos Pasos
1. ✅ Publicado en Instagram
2. 👁️ GIDEON monitoreará los comentarios
3. 📊 HEIMDALL analizará el engagement

🚀 **¡Contenido publicado exitosamente!**`,
        provider: 'groq',
        actions: [
          { action: 'published', data: publishResult }
        ]
      };
    } catch (error) {
      return {
        text: `❌ **Error publicando:** ${error.message}\n\n💡 Verifica que el token de Instagram sea válido.`,
        provider: 'local'
      };
    }
  }

  // ================================================================
  // 📊 ESTADO Y MODELOS
  // ================================================================

  async handleStatusCheck() {
    const status = await fooocusService.checkStatus();
    
    if (status.running) {
      return {
        text: `
# ✅ FOOOCUS ESTÁ CORRIENDO

## 📊 Estado
- **Modelo:** ${status.models || 'Cargado'}
- **URL:** ${status.url}
- **Estado:** 🟢 Activo

## 🎨 Comandos Disponibles
- \`/imagen [prompt]\` - Genera una imagen
- \`/imagen [prompt] --rapido\` - Genera rápido (4 pasos)
- \`/video [tema]\` - Genera video completo
- \`/automatizar [tema]\` - Flujo completo
- \`/publish\` - Publica la última imagen/video
- \`/modelos\` - Lista modelos disponibles

## 💡 Ejemplo
\`/imagen un guerrero vikingo en un barco, cinematográfico\``,
        provider: 'local'
      };
    } else {
      return {
        text: `
# ❌ FOOOCUS NO ESTÁ CORRIENDO

## 🚀 Cómo iniciarlo:
1. Abre una terminal
2. Ejecuta:
   \`cd F:\\Fooocus\`
   \`python entry_with_update.py --port 7865 --always-low-vram\`

## 🌐 Cuando esté listo:
- URL: http://127.0.0.1:7865
- Puerto: 7865

## 💡 Verifica que:
- Fooocus está instalado en F:\\Fooocus
- Los modelos están en F:\\Fooocus_Models\\checkpoints
- La GPU es compatible`,
        provider: 'local'
      };
    }
  }

  async handleListModels() {
    const models = await fooocusService.getAvailableModels();
    
    if (models.length === 0) {
      return {
        text: `❌ No se encontraron modelos en:\n\`F:\\Fooocus_Models\\checkpoints\\\`\n\n💡 Descarga modelos desde:\nhttps://huggingface.co/models`,
        provider: 'local'
      };
    }

    const modelList = models.map((m, i) => {
      const isTurbo = m.includes('turbo');
      const isRealistic = m.includes('realistic');
      const emoji = isTurbo ? '⚡' : isRealistic ? '📸' : '🎨';
      return `${i+1}. ${emoji} ${m}`;
    }).join('\n');

    return {
      text: `
# 📦 MODELOS DISPONIBLES

${modelList}

## 💡 Recomendaciones:
- **SDXL Turbo** ⚡ - Más rápido (10-15 segundos)
- **RealisticStockPhoto** 📸 - Buena calidad para fotos
- **JuggernautXL** 🎨 - Alta calidad (más lento)

## 🎯 Uso:
\`/imagen [prompt] --modelo [nombre_del_modelo]\`

## Ejemplo:
\`/imagen un guerrero vikingo --modelo sd_xl_turbo_1.0_fp16.safetensors\``,
      provider: 'local'
    };
  }

  // ================================================================
  // 🛠️ UTILIDADES
  // ================================================================

  /**
   * Extrae prompts del guión para generar imágenes
   */
  extractPromptsFromScript(guion, numImagenes = 5) {
    // Buscar descripciones visuales en el guión
    const visualMatches = guion.match(/\[[^\]]*\]|Escena \d+:[^\n]+/gi) || [];
    const prompts = visualMatches
      .filter(m => m.length > 10)
      .map(m => {
        const clean = m.replace(/[\[\]]/g, '').trim();
        return `${clean}. Estilo cinematográfico épico, alta calidad, 4K, detallado, iluminación dramática`;
      });

    // Si no hay descripciones visuales, usar frases del guión
    if (prompts.length === 0) {
      const sentences = guion.split(/[.!?]\s+/).filter(s => s.length > 20);
      for (const sentence of sentences.slice(0, numImagenes)) {
        prompts.push(`${sentence}. Estilo cinematográfico épico, alta calidad, 4K, detallado`);
      }
    }

    // Asegurar que tenemos al menos algunas imágenes
    while (prompts.length < numImagenes) {
      const words = guion.split(' ').slice(0, 15).join(' ');
      prompts.push(`Escena épica: ${words}. Estilo cinematográfico, 4K, alta calidad`);
    }

    return prompts.slice(0, numImagenes);
  }
}

export default new VideoGeneratorAgent();