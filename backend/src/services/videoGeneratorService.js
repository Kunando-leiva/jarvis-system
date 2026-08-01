// backend/src/services/videoGeneratorService.js
// Servicio que conecta JARVIS con el editor de videos Python
// Soporte para: Automatic1111, InvokeAI, Edge TTS

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VideoGeneratorService {
  constructor() {
    // Ruta al script Python del editor
    this.editorScript = path.join(__dirname, '../../video_editor/editor_pro.py');
    this.tempDir = path.join(__dirname, '../../temp_videos');
    this.vaultPath = process.env.VAULT_PATH || 'C:/Users/Soledad/Desktop/MiCerebroDigital';
    
    // Configuración de InvokeAI
    this.invokeAIUrl = process.env.INVOKEAI_URL || 'http://127.0.0.1:9090/api';
    this.invokeAIModelKey = 'b9aacf53-1913-4e04-a8fd-030ec4c28398'; // Dreamshaper 8
    
    // Configuración de Automatic1111 (fallback)
    this.automatic1111Url = process.env.AUTOMATIC1111_URL || 'http://127.0.0.1:7860/sdapi/v1';
    
    // Crear directorios necesarios
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    // Verificar disponibilidad
    this.invokeAIDisponible = false;
    this.automatic1111Disponible = false;
    this.verificarDisponibilidad();
  }

  /**
   * Verifica qué servicios de IA están disponibles
   */
 async verificarDisponibilidad() {
  try {
    // Verificar InvokeAI - usar /api/ sin v1
    const response = await fetch(`${this.invokeAIUrl}/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      this.invokeAIDisponible = true;
      console.log('[VideoGenerator] ✅ InvokeAI disponible en:', this.invokeAIUrl);
    }
  } catch (error) {
    console.log('[VideoGenerator] ⚠️ InvokeAI no disponible');
  }
  }

  // ================================================================
  // 🎨 GENERACIÓN DE IMÁGENES CON INVOKEAI
  // ================================================================

  /**
   * Genera una imagen con InvokeAI (usando workflow completo)
   */
  async generarImagenInvokeAI(prompt, options = {}) {
    if (!this.invokeAIDisponible) {
      throw new Error('InvokeAI no está disponible. Asegúrate de que esté corriendo en http://127.0.0.1:9090');
    }

    console.log('[InvokeAI] 🎨 Generando imagen...');
    console.log('[InvokeAI] 📝 Prompt:', prompt.substring(0, 100) + '...');
    
    const timestamp = Date.now();
    const modelKey = options.modelKey || this.invokeAIModelKey;
    
    // Workflow completo para SD 1.5 (Dreamshaper 8)
    const payload = {
      batch: {
        graph: {
          nodes: {
            "1": {
              id: "1",
              type: "main_model_loader",
              data: {
                model: { key: modelKey }
              }
            },
            "2": {
              id: "2",
              type: "sdxl_compel_prompt",
              data: {
                prompt: prompt,
                negative_prompt: options.negativePrompt || 'blurry, bad anatomy, deformed, low quality, ugly'
              }
            },
            "3": {
              id: "3",
              type: "denoise_latents",
              data: {
                steps: options.steps || 25,
                cfg_scale: options.cfgScale || 7.5,
                scheduler: options.scheduler || 'euler',
                width: options.width || 768,
                height: options.height || 1230
              }
            }
          },
          edges: [
            { source: { node_id: "1", field: "unet" }, destination: { node_id: "3", field: "unet" } },
            { source: { node_id: "2", field: "positive_conditioning" }, destination: { node_id: "3", field: "positive_conditioning" } },
            { source: { node_id: "2", field: "negative_conditioning" }, destination: { node_id: "3", field: "negative_conditioning" } },
            { source: { node_id: "1", field: "clip" }, destination: { node_id: "2", field: "clip" } }
          ],
          name: options.name || `Generacion_${timestamp}`,
          author: 'JARVIS',
          description: options.description || 'Generado automaticamente por JARVIS',
          version: '1.0',
          contact: 'jarvis@system.local',
          tags: 'IA,automatico,vikingo',
          notes: `Generado automaticamente por JARVIS en ${new Date().toISOString()}`,
          exposedFields: [],
          meta: {
            version: '1.0',
            category: 'generacion'
          }
        }
      }
    };

    try {
      console.log('[InvokeAI] 📤 Encolando tarea...');
      const response = await fetch(`${this.invokeAIUrl}/queue/default/enqueue_batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Error encolando: ${error}`);
      }

      const data = await response.json();
      console.log('[InvokeAI] ✅ Tarea encolada:', data);
      
      // Esperar a que la tarea se complete
      console.log('[InvokeAI] ⏳ Esperando generación...');
      let imageName = null;
      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        const statusResponse = await fetch(`${this.invokeAIUrl}/queue/default/status`);
        const statusData = await statusResponse.json();
        
        if (statusData.queue && statusData.queue.pending === 0 && statusData.queue.in_progress === 0) {
          const imagesResponse = await fetch(`${this.invokeAIUrl}/images/`);
          const imagesData = await imagesResponse.json();
          
          if (imagesData.items && imagesData.items.length > 0) {
            const lastImage = imagesData.items[imagesData.items.length - 1];
            imageName = lastImage.image_name;
            console.log('[InvokeAI] 🖼️ Imagen encontrada:', imageName);
            break;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }

      if (!imageName) {
        throw new Error('No se generó ninguna imagen después de 120 segundos');
      }

      // Descargar la imagen
      console.log('[InvokeAI] 📥 Descargando imagen:', imageName);
      const imageResponse = await fetch(`${this.invokeAIUrl}/images/i/${imageName}/full`);
      
      if (!imageResponse.ok) {
        throw new Error('Error descargando la imagen');
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const imagePath = path.join(this.tempDir, `imagen_${timestamp}.png`);
      
      fs.writeFileSync(imagePath, Buffer.from(imageBuffer));
      
      console.log('[InvokeAI] ✅ Imagen guardada en:', imagePath);
      return imagePath;

    } catch (error) {
      console.error('[InvokeAI] ❌ Error:', error.message);
      throw error;
    }
  }

  /**
   * Genera múltiples imágenes con InvokeAI
   */
  async generarImagenesInvokeAI(prompts, options = {}) {
    const results = [];
    
    for (const prompt of prompts) {
      try {
        const imagePath = await this.generarImagenInvokeAI(prompt, options);
        results.push(imagePath);
      } catch (error) {
        console.error('[InvokeAI] ❌ Error generando imagen:', error.message);
        results.push(null);
      }
    }
    
    return results.filter(r => r !== null);
  }

  // ================================================================
  // 🎨 GENERACIÓN DE IMÁGENES CON AUTOMATIC1111 (FALLBACK)
  // ================================================================

  /**
   * Genera una imagen con Automatic1111 (fallback)
   */
  async generarImagenAutomatic1111(prompt, options = {}) {
    if (!this.automatic1111Disponible) {
      throw new Error('Automatic1111 no está disponible');
    }

    console.log('[Automatic1111] 🎨 Generando imagen...');
    console.log('[Automatic1111] 📝 Prompt:', prompt.substring(0, 100) + '...');
    
    const payload = {
      prompt: prompt,
      negative_prompt: options.negativePrompt || 'blurry, bad anatomy, deformed, low quality, ugly',
      steps: options.steps || 30,
      cfg_scale: options.cfgScale || 7,
      width: options.width || 768,
      height: options.height || 1230,
      sampler_index: options.sampler || 'Euler a',
      seed: -1
    };

    try {
      const response = await fetch(`${this.automatic1111Url}/txt2img`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Automatic1111 error: ${response.status}`);
      }

      const data = await response.json();
      
      const timestamp = Date.now();
      const imagePath = path.join(this.tempDir, `imagen_${timestamp}.png`);
      
      fs.writeFileSync(imagePath, Buffer.from(data.images[0], 'base64'));
      
      console.log('[Automatic1111] ✅ Imagen guardada en:', imagePath);
      return imagePath;

    } catch (error) {
      console.error('[Automatic1111] ❌ Error:', error.message);
      throw error;
    }
  }

  // ================================================================
  // 🎨 GENERACIÓN DE IMÁGENES (AUTO-SELECCIÓN)
  // ================================================================

  /**
   * Genera imágenes usando el mejor servicio disponible
   * Prioridad: InvokeAI > Automatic1111
   */
  async generarImagenes(prompts, options = {}) {
    console.log('[VideoGenerator] 📷 Generando imágenes...');
    
    if (this.invokeAIDisponible) {
      console.log('[VideoGenerator] 🎯 Usando InvokeAI');
      return await this.generarImagenesInvokeAI(prompts, options);
    } else if (this.automatic1111Disponible) {
      console.log('[VideoGenerator] 🎯 Usando Automatic1111 (fallback)');
      const results = [];
      for (const prompt of prompts) {
        try {
          const imagePath = await this.generarImagenAutomatic1111(prompt, options);
          results.push(imagePath);
        } catch (error) {
          console.error('[VideoGenerator] ❌ Error:', error.message);
          results.push(null);
        }
      }
      return results.filter(r => r !== null);
    } else {
      console.warn('[VideoGenerator] ⚠️ No hay servicios de IA disponibles');
      return [];
    }
  }

  // ================================================================
  // 🎵 GENERACIÓN DE NARRACIÓN CON EDGE TTS
  // ================================================================

  /**
   * Genera narración con Edge TTS (local y gratuito)
   */
  async generarNarracion(texto, voz = 'es-ES-ElviraNeural') {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      const audioPath = path.join(this.tempDir, `narracion_${timestamp}.mp3`);
      
      const cmd = `edge-tts --voice "${voz}" --text "${texto.replace(/"/g, '\\"')}" --write-media "${audioPath}"`;
      
      console.log('[VideoGenerator] 🎵 Generando narración...');
      
      exec(cmd, (error) => {
        if (error) {
          reject(error);
          return;
        }
        
        if (fs.existsSync(audioPath)) {
          console.log('[VideoGenerator] ✅ Narración guardada en:', audioPath);
          resolve(audioPath);
        } else {
          reject(new Error('No se generó el archivo de audio'));
        }
      });
    });
  }

  // ================================================================
  // 📝 GENERACIÓN DE VIDEO
  // ================================================================

  /**
   * Genera un video completo a partir de un guión y audio
   */
  async generarVideo(params) {
    const {
      guion,
      audioPath,
      imagenes = [],
      titulo = 'Video Automatizado',
      config = {}
    } = params;

    console.log('[VideoGenerator] 🎬 Generando video...');
    console.log(`  📝 Guión: ${guion.substring(0, 100)}...`);
    console.log(`  🎵 Audio: ${audioPath}`);
    console.log(`  📷 Imágenes: ${imagenes.length}`);

    // Crear archivo de configuración JSON para el editor
    const configPath = path.join(this.tempDir, `config_${Date.now()}.json`);
    
    const configData = {
      titulo: titulo,
      guion: guion,
      audio: audioPath,
      imagenes: imagenes,
      duracion_imagen: config.duracionImagen || 4,
      palabras_por_linea: config.palabrasPorLinea || 5,
      estilo_subtitulos: config.estiloSubtitulos || 'CapCut',
      zoom_inteligente: config.zoomInteligente !== false,
      portada: {
        imagen: config.portadaImagen || imagenes[0] || '',
        texto: config.portadaTexto || titulo,
        duracion: config.portadaDuracion || 1.0
      }
    };

    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

    try {
      // Ejecutar el editor Python
      const outputPath = await this.ejecutarEditor(configPath);
      
      // Limpiar archivo temporal
      fs.unlinkSync(configPath);
      
      return {
        success: true,
        videoPath: outputPath,
        mensaje: '✅ Video generado exitosamente'
      };
    } catch (error) {
      console.error('[VideoGenerator] ❌ Error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ejecuta el editor Python con la configuración
   */
  ejecutarEditor(configPath) {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      const outputPath = path.join(this.tempDir, `video_${timestamp}.mp4`);
      
      const cmd = `python "${this.editorScript}" --config "${configPath}" --output "${outputPath}"`;
      
      console.log('[VideoGenerator] 🚀 Ejecutando:', cmd);
      
      const process = exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
        if (error) {
          console.error('[VideoGenerator] ❌ Error:', stderr || error.message);
          reject(new Error(stderr || error.message));
          return;
        }
        
        console.log('[VideoGenerator] ✅ Proceso completado');
        console.log('[VideoGenerator] 📤 Output:', stdout);
        
        if (fs.existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          reject(new Error('No se generó el archivo de video'));
        }
      });
    });
  }

  // ================================================================
  // 🚀 ORQUESTACIÓN COMPLETA
  // ================================================================

  /**
   * Genera un video completo desde un guión (orquestación completa)
   */
  async generarVideoCompleto(guion, imagenes = [], audioPath = null, titulo = null) {
    console.log('[VideoGenerator] 🎬 Generando video completo...');
    
    // 1. Si no hay imágenes, generarlas con IA
    let imagenesFinales = imagenes;
    if (!imagenesFinales || imagenesFinales.length === 0) {
      console.log('[VideoGenerator] 📷 Generando imágenes con IA...');
      const prompts = this.extraerPromptsDelGuion(guion);
      imagenesFinales = await this.generarImagenes(prompts);
      
      if (imagenesFinales.length === 0) {
        throw new Error('No se pudieron generar imágenes');
      }
      console.log(`[VideoGenerator] ✅ ${imagenesFinales.length} imágenes generadas`);
    }
    
    // 2. Si no hay audio, generarlo
    let audioFinal = audioPath;
    if (!audioFinal) {
      console.log('[VideoGenerator] 🎵 Generando narración...');
      audioFinal = await this.generarNarracion(guion);
    }
    
    // 3. Generar el video
    const resultado = await this.generarVideo({
      guion: guion,
      audioPath: audioFinal,
      imagenes: imagenesFinales,
      titulo: titulo || 'Video Automatizado'
    });
    
    return resultado;
  }

  // ================================================================
  // 🛠️ UTILIDADES
  // ================================================================

  /**
   * Extrae prompts del guión para generar imágenes
   */
  extraerPromptsDelGuion(guion, numImagenes = 5) {
    const secciones = guion.split(/Escena \d+:|\[[^\]]+\]|\n\n/i);
    const prompts = [];
    const estiloBase = 'Estilo cinematográfico épico, alta calidad, 4K, detallado, composición profesional, iluminación dramática';
    
    let contador = 0;
    for (const seccion of secciones) {
      if (seccion.trim().length > 20 && contador < numImagenes) {
        const prompt = `${seccion.trim().substring(0, 250)}. ${estiloBase}`;
        prompts.push(prompt);
        contador++;
      }
    }
    
    while (prompts.length < numImagenes) {
      const tema = guion.split(' ').slice(0, 10).join(' ');
      prompts.push(`Escena épica: ${tema}. ${estiloBase}`);
    }
    
    return prompts;
  }

  /**
   * Estado del servicio
   */
  getStatus() {
    return {
      ready: true,
      tempDir: this.tempDir,
      editorScript: this.editorScript,
      invokeAI: {
        disponible: this.invokeAIDisponible,
        url: this.invokeAIUrl
      },
      automatic1111: {
        disponible: this.automatic1111Disponible,
        url: this.automatic1111Url
      }
    };
  }
}

export default new VideoGeneratorService();