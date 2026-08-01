import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================
// 📝 CREAR PLANTILLA DE RESPUESTAS PERSONALIZADAS
// =============================================

const vaultPath = 'C:/Users/Soledad/Desktop/MiCerebroDigital';
const respuestasPath = path.join(vaultPath, 'Instagram_Content', 'Respuestas_Personalizadas');

// Crear carpeta si no existe
if (!fs.existsSync(respuestasPath)) {
  fs.mkdirSync(respuestasPath, { recursive: true });
}

// Solicitar datos
const titulo = process.argv[2] || 'Nuevo Video';
const videoId = process.argv[3] || 'ID_DEL_VIDEO';
const palabra1 = process.argv[4] || 'PALABRA1';
const respuesta1 = process.argv[5] || 'Respuesta para PALABRA1';
const palabra2 = process.argv[6] || 'PALABRA2';
const respuesta2 = process.argv[7] || 'Respuesta para PALABRA2';

// Generar nombre de archivo
const nombreArchivo = titulo.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '') + '.md';
const rutaArchivo = path.join(respuestasPath, nombreArchivo);

// Generar contenido
const contenido = `---
video_titulo: "${titulo}"
video_id: "${videoId}"
fecha_publicacion: "$(date +'%Y-%m-%d %H:%M:%S')"
---

## 🗣️ RESPUESTAS PERSONALIZADAS

### Palabra clave: ${palabra1.toLowerCase()}
**Respuesta:**
${respuesta1}

### Palabra clave: ${palabra2.toLowerCase()}
**Respuesta:**
${respuesta2}

### Palabra clave: default
**Respuesta:**
"En Midgard, cada elección forja un destino. ¿Te atreves a escribir DRAGÓN o PAZ para saber qué camino te espera?"
`;

fs.writeFileSync(rutaArchivo, contenido, 'utf-8');
console.log(`✅ Archivo creado: ${rutaArchivo}`);