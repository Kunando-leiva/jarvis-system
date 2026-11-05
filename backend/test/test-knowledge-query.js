// backend/test/test-knowledge-query.js

import knowledgeService from '../src/knowledge/index.js';
import { PublicContractService } from '../src/knowledge/publicContractService.js';
import { KnowledgeQueryService } from '../src/services/knowledgeQueryService.js';

console.log('🧠 PRUEBA DE KNOWLEDGE QUERY SERVICE\n');
console.log('=' .repeat(60));

await knowledgeService.initialize();

const contractService = new PublicContractService(knowledgeService);
const queryService = new KnowledgeQueryService(knowledgeService, contractService);
await queryService.initialize();

// ─── PRUEBAS ──────────────────────────────────────────────────

console.log('\n📌 CONSULTA 1: "¿Qué componentes tiene el sistema?"');
const result1 = queryService.query('¿Qué componentes tiene el sistema?');
console.log(`  ${result1.summary}`);
console.log(`  Total: ${result1.total} componentes`);

console.log('\n📌 CONSULTA 2: "¿Qué métodos tiene contextService?"');
const result2 = queryService.query('¿Qué métodos tiene contextService?');
console.log(`  ${result2.summary}`);
console.log(`  Métodos:`);
for (const method of result2.methods.slice(0, 5)) {
  const params = method.params.map(p => p.name || p).join(', ');
  console.log(`    ${method.async ? 'async ' : ''}${method.name}(${params})${method.inherited ? ' (heredado)' : ''}`);
}

console.log('\n📌 CONSULTA 3: "¿De qué depende memoryService?"');
const result3 = queryService.query('¿De qué depende memoryService?');
console.log(`  ${result3.summary}`);
console.log(`  Internas: ${result3.dependencies.internal.join(', ') || 'ninguna'}`);

console.log('\n📌 CONSULTA 4: "¿Cuál es la estructura del proyecto?"');
const result4 = queryService.query('¿Cuál es la estructura del proyecto?');
console.log(`  Proyecto: ${result4.project.name} v${result4.project.version}`);
console.log(`  Componentes: ${result4.statistics.totalComponents}`);
console.log(`  Métodos: ${result4.statistics.totalMethods}`);

console.log('\n📌 CONSULTA 5: "Hola" (consulta desconocida)');
const result5 = queryService.query('Hola');
console.log(`  ${result5.message}`);
console.log(`  Ejemplos: ${result5.examples.join('; ')}`);

console.log('\n✅ Prueba completada');

await queryService.shutdown();
await knowledgeService.shutdown();