// backend/server.js - VERSIÓN REFACTORIZADA (Fase 0)
// ⚡ Punto de entrada del sistema

import 'dotenv/config';
import { logger, createTraceContext } from './src/core/logger.js';
import { app, server, initializeServices } from './src/app.js';

const PORT = process.env.PORT || 5000;

// ─── INICIALIZAR SERVICIOS Y ARRANCAR ──────────────────────────
async function startServer() {
  const traceId = createTraceContext().traceId;
  
  logger.info('[Server] Iniciando JARVIS System...', { traceId });
  logger.info('[Server] Versión: 1.0.0 (Fase 0)', { traceId });

  try {
    // Inicializar servicios (memoria, razonamiento, ejecución, etc.)
    await initializeServices();
    
    // Arrancar servidor
    server.listen(PORT, () => {
      logger.info(`[Server] ⚡ JARVIS System en ejecución`, {
        traceId,
        port: PORT,
        url: `http://localhost:${PORT}`,
        commandCenter: `http://localhost:${PORT}/command-center.html`,
        dashboard: `http://localhost:${PORT}/dashboard.html`,
      });
      
      console.log(`\n╔══════════════════════════════════════════════════════╗`);
      console.log(`║  ⚡ JARVIS SYSTEM v1.0.0 (Fase 0)                  ║`);
      console.log(`║  🧠 Cerebro y Memoria: Inicializados               ║`);
      console.log(`║  🤖 Agentes activos:                                ║`);
      console.log(`║     🧠 JARVIS - Planificador estratégico            ║`);
      console.log(`║     ⚔️ GIDEON - Ejecutor de comunidad              ║`);
      console.log(`║     👁️ HEIMDALL - Vigilante de métricas           ║`);
      console.log(`║     💀 KILL - Automatización total                 ║`);
      console.log(`║  🌐 Servidor en: http://localhost:${PORT}              ║`);
      console.log(`║  🎯 Centro de Comando: /command-center.html        ║`);
      console.log(`║  📊 Dashboard: /dashboard.html                     ║`);
      console.log(`╚══════════════════════════════════════════════════════╝\n`);
    });

    // Manejar errores del servidor
    server.on('error', (error) => {
      logger.error('[Server] Error en el servidor', {
        traceId,
        error: error.message,
        stack: error.stack,
      });
    });

  } catch (error) {
    logger.error('[Server] Error iniciando', {
      traceId,
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// ─── EJECUTAR ──────────────────────────────────────────────────
startServer();

export { app, server };