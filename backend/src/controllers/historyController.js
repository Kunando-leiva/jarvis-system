// backend/src/controllers/historyController.js
// 🎯 Lógica de búsqueda de historias de personajes

import fs from 'fs';
import path from 'path';

const personajesMap = {
  'thor': 'Thor.md',
  'odin': 'Odin.md',
  'loki': 'Loki.md',
  'ymir': 'Ymir.md',
  'fenrir': 'Fenrir.md',
  'jörmungandr': 'Jörmungandr.md',
  'sleipnir': 'Sleipnir.md',
  'buri': 'Buri.md',
  'audhumbla': 'Audhumbla.md'
};

export function buscarHistoriaPersonaje(nombre) {
  const nombreLower = nombre.toLowerCase();
  const archivo = personajesMap[nombreLower];
  if (!archivo) {
    console.log(`[Historia] ❌ No hay archivo para: ${nombre}`);
    return null;
  }

  const rutaHistoria = path.join('C:', 'Users', 'Soledad', 'Desktop', 'MiCerebroDigital', 'Plan Vikingo - Temporada 1', 'Personajes', 'EL ORIGEN DEL MUNDO (MITOLOGÍA)', archivo);
  console.log(`[Historia] 📂 Buscando: ${rutaHistoria}`);
  
  if (!fs.existsSync(rutaHistoria)) {
    console.log(`[Historia] ❌ Archivo NO encontrado`);
    return null;
  }

  try {
    const contenido = fs.readFileSync(rutaHistoria, 'utf-8');
    console.log(`[Historia] ✅ Archivo leído (${contenido.length} caracteres)`);
    
    const tituloMatch = contenido.match(/^# (.+)$/m);
    const titulo = tituloMatch ? tituloMatch[1] : nombre;
    
    const resumenMatch = contenido.match(/## 📜 Resumen\n\n([\s\S]*?)(?=\n##|$)/);
    const resumen = resumenMatch ? resumenMatch[1].trim() : '';
    
    const ragnarokMatch = contenido.match(/## 🏛️ Rol en el Ragnarok\n\n([\s\S]*?)(?=\n##|$)/);
    const ragnarok = ragnarokMatch ? ragnarokMatch[1].trim() : '';
    
    const fraseMatch = contenido.match(/\*\*Frase icónica:\*\* (.+?)(?=\n|$)/);
    const frase = fraseMatch ? fraseMatch[1] : '';
    
    console.log(`[Historia] ✅ Título: ${titulo}`);
    console.log(`[Historia] ✅ Resumen: ${resumen ? 'SI' : 'NO'}`);
    
    return { titulo, resumen, ragnarok, frase };
  } catch (error) {
    console.error(`[Historia] ❌ Error:`, error.message);
    return null;
  }
}

export function getPersonajesConocidos() {
  return Object.keys(personajesMap);
}