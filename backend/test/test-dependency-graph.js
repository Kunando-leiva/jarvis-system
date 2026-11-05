// backend/test/test-dependency-graph.js
// Prueba del grafo de dependencias

import knowledgeService from '../src/knowledge/index.js';
import { DependencyGraph } from '../src/knowledge/dependencyGraph.js';

console.log('🧪 PRUEBA DE DEPENDENCY GRAPH\n');
console.log('=' .repeat(60));

await knowledgeService.initialize();

const graph = new DependencyGraph(knowledgeService);
graph.build();

console.log(`\n📊 Grafo construido: ${graph.getGraph().size} nodos\n`);

// ─── COMPONENTES CLAVE ────────────────────────────────────────

const keyComponents = ['memoryService', 'contextService', 'reasoningService', 'executionService'];

for (const component of keyComponents) {
  const deps = graph.getDependencies(component);
  const dependents = graph.getDependents(component);
  
  console.log(`📦 ${component}:`);
  console.log(`  Dependencias: ${deps.length > 0 ? deps.join(', ') : 'ninguna'}`);
  console.log(`  Usado por: ${dependents.length > 0 ? dependents.join(', ') : 'ninguno'}`);
  console.log('');
}

// ─── MOSTRAR EJEMPLO DEL GRAFO ──────────────────────────────

console.log('📋 Ejemplo del grafo (formato JSON):');
const json = graph.toJSON();
const sample = Object.fromEntries(
  Object.entries(json).slice(0, 3)
);
console.log(JSON.stringify(sample, null, 2));

console.log('\n' + '=' .repeat(60));
console.log('✅ Prueba completada');

await knowledgeService.shutdown();