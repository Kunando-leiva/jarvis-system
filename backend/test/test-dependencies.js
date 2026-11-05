// backend/test/test-dependencies.js
// Prueba de análisis de dependencias

import knowledgeService from '../src/knowledge/index.js';

console.log('🧪 PRUEBA DE ANÁLISIS DE DEPENDENCIAS\n');
console.log('=' .repeat(60));

await knowledgeService.initialize();

// Verificar que el analizador está disponible
const graph = knowledgeService.getDependencyGraph();
console.log(`\n📊 Grafo de dependencias: ${graph ? `${graph.size} nodos` : '❌ no disponible'}`);

if (graph) {
  // Mostrar dependencias de servicios clave
  const keyServices = ['memoryService', 'contextService', 'reasoningService'];
  
  for (const service of keyServices) {
    const deps = knowledgeService.getDependencies(service);
    const dependents = knowledgeService.getDependents(service);
    
    console.log(`\n📦 ${service}:`);
    if (deps) {
      console.log(`  Importa: ${deps.imports.length > 0 ? deps.imports.join(', ') : 'ninguno'}`);
    }
    console.log(`  Usado por: ${dependents.length > 0 ? dependents.join(', ') : 'ninguno'}`);
  }
}

console.log('\n' + '=' .repeat(60));
console.log('✅ Prueba completada');

await knowledgeService.shutdown();