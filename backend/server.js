// backend/server.js - VERSIÓN ACTUALIZADA

import 'dotenv/config';
import { server } from './src/app.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;

// Servir el centro de comando
server.listen(PORT, () => {
  console.log(`⚡ Centro de Comando disponible en http://localhost:${PORT}/command-center.html`);
  console.log(`🤖 Agentes activos:`);
  console.log(`   🧠 JARVIS - Planificador estratégico`);
  console.log(`   ⚔️ GIDEON - Ejecutor de comunidad`);
  console.log(`   👁️ HEIMDALL - Vigilante de métricas`);
});