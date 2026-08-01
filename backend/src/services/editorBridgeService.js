// backend/src/services/editorBridgeService.js
// Puente entre JARVIS y el Editor de Videos

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

class EditorBridgeService {
  constructor() {
    this.editorPath = path.join(__dirname, '../../editor_pro.py');
    this.tempDir = path.join(__dirname, '../../temp');
    
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // ─── EJECUTAR EDITOR CON ARGUMENTOS ────────────────────────
  async ejecutarEditor(comando, datos) {
    return new Promise((resolve, reject) => {
      const args = [this.editorPath, comando, JSON.stringify(datos)];
      const proceso = spawn('python', args);
      
      let output = '';
      let error = '';
      
      proceso.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      proceso.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      proceso.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(error));
        }
      });
    });
  }

  // ─── CREAR PROYECTO DESDE GUION ────────────────────────────
  async crearProyectoDesdeGuion(guion, tema) {
    const proyecto = {
      nombre: tema,
      guion: guion,
      fecha: new Date().toISOString()
    };
    
    const ruta = path.join(this.tempDir, `proyecto_${Date.now()}.json`);
    fs.writeFileSync(ruta, JSON.stringify(proyecto, null, 2));
    
    return {
      success: true,
      ruta: ruta,
      mensaje: '✅ Proyecto creado. Abre el Editor para continuar.'
    };
  }
}

export default new EditorBridgeService();