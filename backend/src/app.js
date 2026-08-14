// backend/src/app.js - VERSIÓN REFACTORIZADA
// ⚡ SOLO configuración principal

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer } from 'http';
import { setupSocket } from './socket/index.js';
import routes from './routes/index.js';
import cron from 'node-cron';
import axios from 'axios';
import InstagramPublishService from './services/instagramPublishService.js';
import whatsappService from './services/whatsappService.js';
import { getCurrentMode } from './state/appState.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── CONFIGURACIÓN ──────────────────────────────────────────────
const app = express();
const server = createServer(app);
const io = setupSocket(server);

app.use(express.json());

// ─── FRONTEND ──────────────────────────────────────────────────
const frontendPath = 'C:/Users/Soledad/Desktop/Nueva carpeta (2)/jarvis-system/frontend';
console.log(`[Frontend] 📂 Sirviendo desde: ${frontendPath}`);

app.use(express.static(frontendPath));

// 🆕 AGREGAR ESTO - Servir carpetas específicas del frontend
app.use('/js', express.static(path.join(frontendPath, 'js')));
app.use('/css', express.static(path.join(frontendPath, 'css')));
app.use('/lib', express.static(path.join(frontendPath, 'lib')));
app.use('/assets', express.static(path.join(frontendPath, 'assets')));

app.get('/', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  console.log(`[Frontend] 📄 Buscando: ${indexPath}`);
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`❌ index.html no encontrado en: ${indexPath}`);
  }
});

// ─── MEDIA ─────────────────────────────────────────────────────
app.get('/api/media/:filename', (req, res) => {
  const filename = req.params.filename;
  
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.jfif', '.mp4', '.mov'];
  const ext = path.extname(filename).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    console.log(`[Media] ❌ Extensión no permitida: ${ext}`);
    return res.status(403).send('Tipo de archivo no permitido');
  }

  const basePaths = [
    'C:/Users/Soledad/Desktop/MiCerebroDigital/videos',
    'C:/Users/Soledad/Desktop/MiCerebroDigital/img'
  ];
  
  for (const basePath of basePaths) {
    const filePath = path.join(basePath, filename);
    if (fs.existsSync(filePath)) {
      console.log(`[Media] ✅ Sirviendo: ${filename} desde ${basePath}`);
      res.setHeader('ngrok-skip-browser-warning', 'true');
      res.setHeader('User-Agent', 'Instagram-API');
      return res.sendFile(filePath);
    }
  }
  
  console.log(`[Media] ❌ Archivo no encontrado: ${filename}`);
  res.status(404).send('Archivo no encontrado');
});

// ─── RUTAS ─────────────────────────────────────────────────────
app.use('/api', routes);

// ─── HEALTH ────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    uptime: process.uptime(), 
    mode: getCurrentMode() 
  });
});

// ─── CRON: PUBLICACIÓN AUTOMÁTICA ────────────────────────────
const publisher = new InstagramPublishService();

cron.schedule('*/5 * * * *', async () => {
  console.log('[Cron] ⏰ Revisando contenido programado...');
  
  try {
    const pendientes = await publisher.scanScheduledContent();
    
    if (pendientes.length === 0) {
      console.log('[Cron] No hay contenido pendiente');
      return;
    }

    const publicaciones = pendientes.filter(item => {
      return !item.metadata.usuario;
    });

    if (publicaciones.length === 0) {
      console.log('[Cron] No hay publicaciones pendientes');
      return;
    }

    console.log(`[Cron] 📹 ${publicaciones.length} publicaciones pendientes`);

    for (const item of publicaciones) {
      try {
        console.log(`[Cron] Publicando: ${item.metadata.titulo}`);
        const result = await publisher.publishMedia(
          item.metadata,
          item.mediaPath,
          item.mediaType
        );
        publisher.markAsPublished(item.filePath, result.postId, result.mediaId);
        console.log(`[Cron] ✅ Publicado: ${item.metadata.titulo}`);
        
        io.emit('ai-response', {
          text: `📹 Publicado automáticamente: ${item.metadata.titulo}`,
          provider: 'SYSTEM',
          mode: getCurrentMode()
        });

      } catch (error) {
        console.error(`[Cron] ❌ Error publicando ${item.metadata.titulo}:`, error.message);
      }
    }

  } catch (error) {
    console.error('[Cron] Error en el sistema de publicación:', error.message);
  }
});

console.log('[Cron] ✅ Sistema de publicación automática activado');

// ─── EJECUTAR N8N AL INICIAR ──────────────────────────────────
setTimeout(async () => {
  try {
    console.log('[N8n] 🔄 Solicitando revisión de comentarios...');
    await axios.post('http://localhost:5678/webhook/trigger-comments', {
      action: 'startup',
      timestamp: new Date().toISOString()
    });
    console.log('[N8n] ✅ Revisión solicitada correctamente');
  } catch (error) {
    console.log('[N8n] ❌ Error al conectar con n8n:', error.message);
  }
}, 3000);

// ─── WHATSAPP ──────────────────────────────────────────────────
// setTimeout(async () => {
//   try {
//     console.log('[WhatsApp] 📱 Iniciando WhatsApp...');
//     await whatsappService.init();
//     console.log('[WhatsApp] ✅ WhatsApp listo!');
//   } catch (error) {
//     console.error('[WhatsApp] ❌ Error iniciando:', error.message);
//     console.log('[WhatsApp] ⚠️ WhatsApp no disponible. Inicia manualmente con POST /api/whatsapp/start');
//   }
// }, 5000);

export { app, server, io };