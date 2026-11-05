// backend/src/app.js - VERSIÓN COMPLETA CON MEMORIA COGNITIVA CORREGIDA
// ⚡ Configuración principal con Dependency Container, ReasoningService y CognitiveMemory

import 'dotenv/config';
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
import { getCurrentMode } from './state/appState.js';
import aiProvider from './core/aiProvider.js';

// ─── IMPORTS DE LA NUEVA ARQUITECTURA ──────────────────────────
import { logger, createTraceContext } from './core/logger.js';
import { container } from './core/dependencyContainer.js';
import { eventBus } from './core/eventBus.js';
import memoryService from './services/memoryService.js';
import { ReasoningService } from './services/reasoningService.js';
import executionService from './services/executionService.js';
import reflectionService from './services/reflectionService.js';
import knowledgeService from './knowledge/index.js';
import contextService from './services/contextService.js';
import contextWindowManager from './services/contextWindowManager.js';
import retrievalPolicy from './services/retrievalPolicy.js';
import { PublicContractService } from './knowledge/publicContractService.js';
import { DependencyResolver } from './resolvers/dependencyResolver.js';
import { MethodResolver } from './resolvers/methodResolver.js';
import { ImpactResolver } from './resolvers/impactResolver.js';
import { QueryPlanner } from './services/queryPlanner.js';
import { KnowledgeQueryService } from './services/knowledgeQueryService.js';

// ─── CONFIGURACIÓN ──────────────────────────────────────────────
const app = express();
const server = createServer(app);

app.use(express.json());

// ════════════════════════════════════════════════════════════
// 📦 SERVIR SOCKET.IO CLIENT
// ════════════════════════════════════════════════════════════

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir socket.io client desde node_modules
const socketIoClientPath = path.join(__dirname, '..', 'node_modules', 'socket.io', 'client-dist');
if (fs.existsSync(socketIoClientPath)) {
  app.get('/socket.io/socket.io.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(socketIoClientPath, 'socket.io.js'));
  });
  logger.info('[App] ✅ Socket.io client disponible en /socket.io/socket.io.js');
} else {
  logger.warn('[App] ⚠️ Socket.io client no encontrado, usando CDN en frontend');
}

// ─── VARIABLES GLOBALES ──────────────────────────────────────────

let reasoningServiceInstance = null;
let queryPlannerInstance = null;
let cognitiveMemoryInstance = null;
let io = null;

// ─── INICIALIZAR SERVICIOS ──────────────────────────────────────

async function initializeServices() {
  const traceId = createTraceContext().traceId;
  
  logger.info('[App] Inicializando servicios', { traceId });

  try {
    // 1. Inicializar KnowledgeService
    await knowledgeService.initialize();
    logger.info('[App] KnowledgeService inicializado');

    // 2. Inicializar servicios de contexto
    await retrievalPolicy.initialize();
    await contextService.initialize();
    await contextWindowManager.initialize();
    logger.info('[App] Servicios de contexto inicializados');

    // 3. Inicializar servicios de memoria
    await memoryService.initialize();
    logger.info('[App] MemoryService inicializado');

    // 4. Inicializar AI Provider
    if (aiProvider && typeof aiProvider.initialize === 'function') {
      await aiProvider.initialize();
    }
    logger.info('[App] AI Provider inicializado');

    // ═══════════════════════════════════════════════════════════════
    // 5. CONSTRUIR QUERY PLANNER CON LA ARQUITECTURA CORRECTA
    // ═══════════════════════════════════════════════════════════════

    const contractService = new PublicContractService(knowledgeService);
    const depResolver = new DependencyResolver(knowledgeService);
    depResolver.initialize();
    const methodResolver = new MethodResolver(contractService);
    const impactResolver = new ImpactResolver(depResolver, methodResolver, contractService);

    const knowledgeQueryService = new KnowledgeQueryService(knowledgeService, contractService);
    await knowledgeQueryService.initialize();

    queryPlannerInstance = new QueryPlanner({
      knowledgeService: knowledgeService,
      knowledgeQueryService: knowledgeQueryService,
      dependencyResolver: depResolver,
      methodResolver: methodResolver,
      impactResolver: impactResolver,
      contractService: contractService
    });
    await queryPlannerInstance.initialize();
    logger.info('[App] QueryPlanner inicializado');

    // ═══════════════════════════════════════════════════════════════
    // 5b. INICIALIZAR MEMORIA COGNITIVA - CORREGIDO
    // ═══════════════════════════════════════════════════════════════

    try {
      // Crear directorio data si no existe
      const dataDir = path.join(__dirname, '../data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        logger.info('[App] Directorio data creado', { dataDir });
      }
      
      const dbPath = path.join(dataDir, 'memory.db');
      
      logger.info('[App] Inicializando CognitiveMemoryService', { dbPath });
      
      // ✅ Importar dinámicamente
      const { default: CognitiveMemoryService } = await import('./memory/cognitiveMemoryService.js');
      
      cognitiveMemoryInstance = new CognitiveMemoryService({
        dbPath: dbPath
      });
      
      // ✅ Inicializar y esperar
      await cognitiveMemoryInstance.initialize();
      
      // ✅ Verificar que se inicializó correctamente
      if (cognitiveMemoryInstance.initialized) {
        logger.info('[App] ✅ CognitiveMemoryService inicializado exitosamente', {
          dbPath,
          memoriesCount: cognitiveMemoryInstance.metrics?.memoriesCount || 0,
          status: cognitiveMemoryInstance.status
        });
      } else {
        logger.warn('[App] ⚠️ CognitiveMemoryService no se inicializó correctamente');
        cognitiveMemoryInstance = null;
      }
      
    } catch (memoryError) {
      logger.error('[App] ❌ Error inicializando CognitiveMemoryService', {
        error: memoryError.message,
        stack: memoryError.stack
      });
      cognitiveMemoryInstance = null;
    }

    // ═══════════════════════════════════════════════════════════════
    // ⭐ WRAPPER PARA AI PROVIDER
    // ═══════════════════════════════════════════════════════════════
    const aiProviderWrapper = {
      chat: async ({ messages, sessionId, temperature, maxTokens }) => {
        const userMessage = messages.find(m => m.role === 'user')?.content || '';
        const systemMessage = messages.find(m => m.role === 'system')?.content || '';
        const lastMessage = messages[messages.length - 1]?.content || '';
        const finalPrompt = userMessage || lastMessage;
        
        const response = await aiProvider.generate({
          prompt: systemMessage + '\n\n' + finalPrompt,
          systemPrompt: systemMessage,
          userPrompt: finalPrompt,
          sessionId,
          temperature: temperature || 0.3,
          maxTokens: maxTokens || 2000,
          task: 'reasoning'
        });
        
        return response;
      },
      initialize: async () => {
        if (typeof aiProvider.initialize === 'function') {
          await aiProvider.initialize();
        }
        return true;
      },
      getMetrics: () => {
        return aiProvider.getMetrics ? aiProvider.getMetrics() : {};
      },
      getStatus: () => {
        return aiProvider.getStatus ? aiProvider.getStatus() : { status: 'online' };
      }
    };

    // ═══════════════════════════════════════════════════════════════
    // 6. CREAR ReasoningService CON memoria cognitiva
    // ═══════════════════════════════════════════════════════════════
    reasoningServiceInstance = new ReasoningService({
      aiProvider: aiProviderWrapper,
      queryPlanner: queryPlannerInstance,
      knowledgeService: knowledgeService,
      contextService: contextService,
      contextWindowManager: contextWindowManager,
      cognitiveMemoryService: cognitiveMemoryInstance,
      config: {
        maxSteps: 10,
        minConfidence: 0.3,
        maxTokens: 8000,
        enableCognitiveMemory: true,
        maxMemoriesPerQuery: 5,
        minMemoryImportance: 2
      }
    });
    await reasoningServiceInstance.initialize();
    logger.info('[App] ReasoningService inicializado con Memoria Cognitiva', {
      memoryEnabled: !!cognitiveMemoryInstance,
      memoryInitialized: reasoningServiceInstance.memoryInitialized
    });

    // 7. Inicializar ExecutionService
    await executionService.initialize();
    logger.info('[App] ExecutionService inicializado');

    // 8. Inicializar ReflectionService
    await reflectionService.initialize();
    logger.info('[App] ReflectionService inicializado');

    // 9. Registrar servicios en el contenedor
    container.register('reasoningService', reasoningServiceInstance);
    container.register('queryPlanner', queryPlannerInstance);
    container.register('knowledgeService', knowledgeService);
    container.register('contextService', contextService);
    container.register('memoryService', memoryService);
    container.register('executionService', executionService);
    container.register('reflectionService', reflectionService);
    if (cognitiveMemoryInstance) {
      container.register('cognitiveMemoryService', cognitiveMemoryInstance);
    }

    // 10. Inicializar todos los servicios del contenedor
    await container.initializeAll();
    
    logger.info('[App] Todos los servicios inicializados', {
      traceId,
      services: container.getStatus().services.length,
      cognitiveMemoryAvailable: !!cognitiveMemoryInstance
    });
    
    return true;
  } catch (error) {
    logger.error('[App] Error inicializando servicios', {
      traceId,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

// ─── APAGAR SERVICIOS ──────────────────────────────────────────

async function shutdownServices() {
  const traceId = createTraceContext().traceId;
  
  logger.info('[App] Apagando servicios', { traceId });
  
  try {
    if (cognitiveMemoryInstance && typeof cognitiveMemoryInstance.cleanup === 'function') {
      await cognitiveMemoryInstance.cleanup();
      logger.info('[App] CognitiveMemoryService apagado');
    }
    
    if (reasoningServiceInstance && typeof reasoningServiceInstance.shutdown === 'function') {
      await reasoningServiceInstance.shutdown();
    }
    if (queryPlannerInstance && typeof queryPlannerInstance.shutdown === 'function') {
      await queryPlannerInstance.shutdown();
    }
    await container.shutdownAll();
    logger.info('[App] Todos los servicios apagados', { traceId });
    return true;
  } catch (error) {
    logger.error('[App] Error apagando servicios', {
      traceId,
      error: error.message,
    });
    return false;
  }
}

// Manejar señales de terminación
process.on('SIGTERM', async () => {
  logger.info('[App] Señal SIGTERM recibida');
  await shutdownServices();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('[App] Señal SIGINT recibida');
  await shutdownServices();
  process.exit(0);
});

// ─── FRONTEND ──────────────────────────────────────────────────

const frontendPath = path.join(__dirname, '../../frontend');
logger.info('[App] Sirviendo frontend desde', { frontendPath });

app.use(express.static(frontendPath));
app.use('/js', express.static(path.join(frontendPath, 'js')));
app.use('/css', express.static(path.join(frontendPath, 'css')));
app.use('/lib', express.static(path.join(frontendPath, 'lib')));
app.use('/assets', express.static(path.join(frontendPath, 'assets')));

app.get('/', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
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
    logger.warn('[App] Extensión no permitida', { filename, ext });
    return res.status(403).send('Tipo de archivo no permitido');
  }

  const basePaths = [
    path.join(process.env.VAULT_PATH || 'C:/Users/Soledad/Desktop/MiCerebroDigital', 'videos'),
    path.join(process.env.VAULT_PATH || 'C:/Users/Soledad/Desktop/MiCerebroDigital', 'img'),
  ];
  
  for (const basePath of basePaths) {
    const filePath = path.join(basePath, filename);
    if (fs.existsSync(filePath)) {
      logger.debug('[App] Sirviendo archivo', { filename, basePath });
      res.setHeader('ngrok-skip-browser-warning', 'true');
      res.setHeader('User-Agent', 'Instagram-API');
      return res.sendFile(filePath);
    }
  }
  
  logger.warn('[App] Archivo no encontrado', { filename });
  res.status(404).send('Archivo no encontrado');
});

// ─── RUTAS ─────────────────────────────────────────────────────

app.use('/api', routes);

// ─── HEALTH ────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  const serviceStatus = container.getStatus();
  const memoryStatus = memoryService.getStatus ? memoryService.getStatus() : { status: 'unknown' };
  const cognitiveStatus = cognitiveMemoryInstance ? {
    initialized: cognitiveMemoryInstance.initialized || false,
    status: cognitiveMemoryInstance.status || 'unknown',
    memoriesCount: cognitiveMemoryInstance.metrics?.memoriesCount || 0
  } : { initialized: false, status: 'not_available', memoriesCount: 0 };
  
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    mode: getCurrentMode(),
    services: serviceStatus,
    memory: memoryStatus,
    cognitiveMemory: cognitiveStatus,
    reasoningService: reasoningServiceInstance ? {
      initialized: reasoningServiceInstance.initialized,
      status: reasoningServiceInstance.status,
      memoryInitialized: reasoningServiceInstance.memoryInitialized || false,
      memoryEnabled: reasoningServiceInstance.config?.enableCognitiveMemory || false
    } : null,
    timestamp: new Date().toISOString(),
  });
});

// ─── CRON: PUBLICACIÓN AUTOMÁTICA ────────────────────────────

const publisher = new InstagramPublishService();

cron.schedule('*/5 * * * *', async () => {
  logger.info('[Cron] Revisando contenido programado...');
  
  try {
    const pendientes = await publisher.scanScheduledContent();
    
    if (pendientes.length === 0) {
      logger.debug('[Cron] No hay contenido pendiente');
      return;
    }

    const publicaciones = pendientes.filter(item => {
      return !item.metadata.usuario;
    });

    if (publicaciones.length === 0) {
      logger.debug('[Cron] No hay publicaciones pendientes');
      return;
    }

    logger.info(`[Cron] ${publicaciones.length} publicaciones pendientes`);

    for (const item of publicaciones) {
      try {
        logger.info(`[Cron] Publicando: ${item.metadata.titulo}`);
        const result = await publisher.publishMedia(
          item.metadata,
          item.mediaPath,
          item.mediaType
        );
        publisher.markAsPublished(item.filePath, result.postId, result.mediaId);
        logger.info(`[Cron] Publicado: ${item.metadata.titulo}`);
        
        if (io) {
          io.emit('ai-response', {
            text: `📹 Publicado automáticamente: ${item.metadata.titulo}`,
            provider: 'SYSTEM',
            mode: getCurrentMode(),
          });
        }
      } catch (error) {
        logger.error(`[Cron] Error publicando ${item.metadata.titulo}`, {
          error: error.message,
        });
      }
    }
  } catch (error) {
    logger.error('[Cron] Error en sistema de publicación', {
      error: error.message,
    });
  }
});

logger.info('[Cron] Sistema de publicación automática activado');

// ─── EJECUTAR N8N AL INICIAR ──────────────────────────────────

setTimeout(async () => {
  try {
    logger.info('[N8n] Solicitando revisión de comentarios...');
    await axios.post('http://localhost:5678/webhook/trigger-comments', {
      action: 'startup',
      timestamp: new Date().toISOString(),
    });
    logger.info('[N8n] Revisión solicitada correctamente');
  } catch (error) {
    logger.warn('[N8n] Error al conectar con n8n', {
      error: error.message,
    });
  }
}, 3000);

// ════════════════════════════════════════════════════════════
// ⭐ INICIALIZAR SERVICIOS Y SOCKET - SIN LISTEN
// ════════════════════════════════════════════════════════════

// Inicializar servicios primero
await initializeServices();

// Crear Socket.io PASANDO la instancia de reasoningService
io = setupSocket(server, reasoningServiceInstance);

// ⭐ NO llamar a server.listen() aquí - server.js lo hará

// ─── EXPORTACIONES ──────────────────────────────────────────────
export { 
  app, 
  server, 
  io, 
  initializeServices, 
  shutdownServices,
  reasoningServiceInstance as reasoningService,
  queryPlannerInstance as queryPlanner,
  cognitiveMemoryInstance as cognitiveMemory
};