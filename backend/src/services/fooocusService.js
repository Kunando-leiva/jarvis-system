// backend/src/services/fooocusService.js
// Servicio para conectar JARVIS con Fooocus

import fs from 'fs';
import path from 'path';

class FooocusService {
  constructor() {
    this.fooocusUrl = process.env.FOOOCUS_URL || 'http://127.0.0.1:7865';
    this.modelsDir = process.env.FOOOCUS_MODELS || 'F:/Fooocus_Models';
    this.outputDir = process.env.FOOOCUS_OUTPUT || 'F:/Fooocus_Outputs/images';
    this.vaultPath = process.env.VAULT_PATH || 'C:/Users/Soledad/Desktop/MiCerebroDigital';
    
    // Crear directorios si no existen
    [this.outputDir, path.join(this.vaultPath, 'videos'), path.join(this.vaultPath, 'img')].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    console.log('[FooocusService] 🎨 Inicializado');
    console.log(`  🌐 URL: ${this.fooocusUrl}`);
    console.log(`  📂 Output: ${this.outputDir}`);
    console.log(`  📁 Vault: ${this.vaultPath}`);
  }

  /**
   * Verifica si Fooocus está corriendo
   */
  async checkStatus() {
    try {
      const response = await fetch(`${this.fooocusUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        return {
          running: true,
          url: this.fooocusUrl
        };
      }
      return { running: false };
    } catch {
      return { running: false, error: 'Fooocus no está corriendo' };
    }
  }

  /**
   * Genera una imagen usando Fooocus
   */
  async generateImage(prompt, options = {}) {
    const {
      negativePrompt = 'blurry, bad anatomy, deformed, low quality',
      steps = 10,
      cfgScale = 4.0,
      width = 768,
      height = 1152,
      sampler = 'euler',
      seed = -1,
      style = 'Fooocus V2',
      model = 'sd_xl_turbo_1.0_fp16.safetensors'
    } = options;

    console.log(`[FooocusService] 🎨 Generando imagen...`);
    console.log(`  📝 Prompt: ${prompt.substring(0, 100)}...`);

    try {
      const payload = {
        prompt: prompt,
        negative_prompt: negativePrompt,
        steps: steps,
        cfg_scale: cfgScale,
        width: width,
        height: height,
        sampler_index: sampler,
        seed: seed,
        styles: [style]
      };

      const response = await fetch(`${this.fooocusUrl}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.log(`[FooocusService] ⚠️ Error: ${response.status}`);
        
        // Si la API falla, generar imagen de placeholder
        return this.generateFallbackImage(prompt);
      }

      const data = await response.json();
      
      // Guardar la imagen
      const timestamp = Date.now();
      const filename = `fooocus_${timestamp}.png`;
      const filepath = path.join(this.outputDir, filename);
      
      fs.writeFileSync(filepath, Buffer.from(data.images[0], 'base64'));
      
      // Copiar al vault
      const vaultPath = path.join(this.vaultPath, 'img', filename);
      fs.copyFileSync(filepath, vaultPath);
      
      console.log(`[FooocusService] ✅ Imagen guardada: ${filepath}`);
      
      return {
        success: true,
        imagePath: filepath,
        vaultPath: vaultPath,
        filename: filename,
        prompt: prompt,
        url: `/api/media/${filename}`
      };

    } catch (error) {
      console.error(`[FooocusService] ❌ Error: ${error.message}`);
      return this.generateFallbackImage(prompt);
    }
  }

  /**
   * Genera una imagen de fallback (placeholder) SIN CANVAS
   */
  generateFallbackImage(prompt) {
    try {
      const timestamp = Date.now();
      const filename = `fallback_${timestamp}.txt`;
      const filepath = path.join(this.outputDir, filename);
      
      // Crear un archivo de texto con la información
      const content = `
========================================
🎨 IMAGEN GENERADA (FALLBACK)
========================================

📝 Prompt: ${prompt}
📅 Timestamp: ${new Date().toISOString()}
🌐 URL: ${this.fooocusUrl}

⚠️ Nota: La imagen no pudo ser generada porque Fooocus no respondió correctamente.

📌 Próximos pasos:
1. Verifica que Fooocus esté corriendo: http://127.0.0.1:7865
2. Reinicia Fooocus con: python entry_with_update.py --port 7865 --always-cpu
3. Vuelve a intentar el comando /imagen
========================================
`;
      
      fs.writeFileSync(filepath, content, 'utf-8');
      
      console.log(`[FooocusService] ✅ Fallback generado: ${filepath}`);
      
      return {
        success: true,
        imagePath: filepath,
        filename: filename,
        prompt: prompt,
        fallback: true,
        message: '⚠️ Imagen simulada (Fooocus no respondió)'
      };

    } catch (error) {
      console.error(`[FooocusService] ❌ Error en fallback: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtiene la lista de modelos disponibles
   */
  async getAvailableModels() {
    try {
      const checkpointsDir = path.join(this.modelsDir, 'checkpoints');
      if (!fs.existsSync(checkpointsDir)) {
        return [];
      }
      
      const files = fs.readdirSync(checkpointsDir);
      return files.filter(f => f.endsWith('.safetensors') || f.endsWith('.ckpt'));
    } catch (error) {
      console.error('[FooocusService] ❌ Error obteniendo modelos:', error.message);
      return [];
    }
  }
}

export default new FooocusService();