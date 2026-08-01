import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ⚠️ AJUSTA ESTA RUTA A TU VAULT DE OBSIDIAN
const VAULT_PATH = 'C:/Users/Soledad/Desktop/MiCerebroDigital';

// Crear estructura de carpetas
const folders = [
  'Instagram_Content/Programados',
  'Instagram_Content/Publicados',
  'Instagram_Content/Plantillas',
  'videos'  // Carpeta para guardar los videos MP4
];

console.log('📁 Creando estructura de carpetas en Obsidian...');
folders.forEach(folder => {
  const fullPath = path.join(VAULT_PATH, folder);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Creada: ${fullPath}`);
  } else {
    console.log(`⏭️ Ya existe: ${fullPath}`);
  }
});

// Crear plantilla de video
const template = `---
titulo: "Título del Video"
fecha_publicacion: "2026-07-06 18:00:00"
hashtags: ["#vikingos", "#historia", "#reinoDeValhalla"]
video_path: "videos/nombre_del_video.mp4"
descripcion: "Descripción del video..."
llamada_accion: "📩 Comenta y síguenos para más historias vikingas!"
publicado: false
---

# 📹 Guión del Video

[Escribe aquí el guión completo del video]

## Notas de producción:
- Duración estimada: 
- Música de fondo:
- Efectos especiales:

## Referencias históricas:
- [Enlaces o notas]
`;

const templatePath = path.join(VAULT_PATH, 'Instagram_Content/Plantillas/video_template.md');
fs.writeFileSync(templatePath, template, 'utf-8');
console.log('✅ Plantilla creada en:', templatePath);

// Crear un ejemplo de video programado
const ejemplo = `---
titulo: "Ragnar Lothbrok - El Primer Vikingo en Inglaterra"
fecha_publicacion: "2026-07-06 18:00:00"
hashtags: ["#ragnar", "#vikingos", "#historiaVikinga", "#reinoDeValhalla"]
video_path: "videos/ragnar_inglaterra.mp4"
descripcion: "Descubre cómo Ragnar Lothbrok desafió a los reinos de Inglaterra con su legendaria valentía."
llamada_accion: "⚔️ ¿Te gustaría saber más sobre Ragnar? ¡Déjanos tu comentario!"
publicado: false
---

# 📹 Guión - Ragnar Lothbrok en Inglaterra

## Escena 1: El desembarco (0:00-0:15)
[Imagen de barcos vikingos llegando a la costa]
"En el año 793, Ragnar Lothbrok cambió la historia de Inglaterra para siempre..."

## Escena 2: La batalla (0:15-0:30)
[Montaje de batalla]
"Con solo dos barcos, Ragnar demostró que los vikingos eran invencibles..."

## Escena 3: El legado (0:30-0:45)
[Rostro de Ragnar mirando el horizonte]
"Su legado inspiró a generaciones de guerreros nórdicos..."
`;

const ejemploPath = path.join(VAULT_PATH, 'Instagram_Content/Programados/ejemplo_ragnar.md');
fs.writeFileSync(ejemploPath, ejemplo, 'utf-8');
console.log('✅ Ejemplo creado en:', ejemploPath);

console.log('\n🎉 ¡Estructura creada exitosamente!');
console.log('\n📂 Ahora puedes:');
console.log('1. Editar los archivos .md en Obsidian');
console.log('2. Colocar tus videos MP4 en la carpeta "videos"');
console.log('3. Ejecutar el servidor para publicar automáticamente');