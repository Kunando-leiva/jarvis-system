// backend/test/test-knowledge-current.js
// AUDITORÍA: Qué sabe KnowledgeService actualmente?

import knowledgeService from '../src/knowledge/index.js';

console.log('📋 AUDITORÍA DE KNOWLEDGE SERVICE\n');
console.log('=' .repeat(60));

await knowledgeService.initialize();

// 1. ¿Qué información tiene?
console.log('\n📁 ESTRUCTURA DEL PROYECTO:');
console.log(`  Tamaño: ${Object.keys(knowledgeService.getProjectStructure()).length} elementos`);

// 2. ¿Qué servicios conoce?
console.log('\n📦 SERVICIOS:');
const services = knowledgeService.getServices();
console.log(`  Total: ${services.length}`);
services.slice(0, 10).forEach(s => console.log(`    - ${s.name}`));
if (services.length > 10) console.log(`    ... y ${services.length - 10} más`);

// 3. ¿Qué agentes conoce?
console.log('\n🤖 AGENTES:');
const agents = knowledgeService.getAgents();
console.log(`  Total: ${agents.length}`);
agents.forEach(a => console.log(`    - ${a.name}`));

// 4. ¿Qué información del proyecto?
console.log('\n📊 INFORMACIÓN DEL PROYECTO:');
console.log(knowledgeService.getProjectInfo());

// 5. ¿Qué métodos públicos tiene?
console.log('\n🔧 MÉTODOS PÚBLICOS:');
const methods = Object.getOwnPropertyNames(knowledgeService)
  .filter(m => typeof knowledgeService[m] === 'function' && !m.startsWith('_'));
methods.forEach(m => console.log(`    - ${m}()`));

// 6. ¿Puede encontrar archivos?
console.log('\n🔍 BÚSQUEDA DE ARCHIVOS:');
const memoryFile = knowledgeService.findFile('memoryService.js');
console.log(`  memoryService.js: ${memoryFile ? '✅ encontrado' : '❌ no encontrado'}`);
const aiFile = knowledgeService.findFile('aiController.js');
console.log(`  aiController.js: ${aiFile ? '✅ encontrado' : '❌ no encontrado'}`);
const unknownFile = knowledgeService.findFile('archivo_inexistente.js');
console.log(`  archivo_inexistente.js: ${unknownFile ? '✅ encontrado' : '❌ no encontrado (correcto)'}`);

// 7. ¿Qué información falta?
console.log('\n⚠️ INFORMACIÓN FALTANTE:');
console.log('  - Relaciones entre componentes');
console.log('  - Contratos públicos de servicios');
console.log('  - Dependencias entre módulos');
console.log('  - Información sobre archivos específicos');
console.log('  - Conexiones entre agentes y servicios');

console.log('\n' + '=' .repeat(60));
console.log('✅ Auditoría completada');

await knowledgeService.shutdown();