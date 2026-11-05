// backend/test-context.js
// Prueba rápida de ContextService

import contextService from './src/services/contextService.js';
import retrievalPolicy from './src/services/retrievalPolicy.js';

console.log('🧪 Probando ContextService\n');
console.log('=' .repeat(60));

// Inicializar
await contextService.initialize();

const sessionId = `test_session_${Date.now()}`;
const queries = [
  'Hola, ¿cómo estás?',
  'Necesito un plan estratégico para mi cuenta de Instagram',
  'Analiza mi cuenta',
  'Gracias por la ayuda',
];

for (const query of queries) {
  console.log(`\n📝 Consulta: "${query}"`);
  
  const context = await contextService.getContext({ sessionId, query });
  
  console.log(`  📌 Tipo detectado: ${context.metadata.retrievalPlan.taskType}`);
  console.log(`  📌 Fuentes usadas: ${context.metadata.sourcesUsed.join(', ')}`);
  console.log(`  📌 Errores: ${context.metadata.sourceErrors.length}`);
  console.log(`  📌 Tiempo: ${context.metadata.buildTimeMs}ms`);
  console.log(`  📌 Historial: ${context.history.length}`);
  console.log(`  📌 Episódica: ${context.memory.episodic.length}`);
  console.log(`  📌 Semántica: ${context.memory.semantic.length}`);
  console.log(`  📌 Procedimental: ${context.memory.procedural.length}`);
  console.log(`  📌 Proyecto: ${context.system.project ? '✅' : '❌'}`);
  console.log(`  📌 Estado: ${context.system.state.mode}`);
}

console.log('\n' + '=' .repeat(60));
console.log('\n📊 Métricas del ContextService:');
const metrics = contextService.getMetrics();
console.log(`  Contextos construidos: ${metrics.contextBuilds}`);
console.log(`  Tiempo promedio: ${metrics.avgBuildTime.toFixed(0)}ms`);
console.log(`  Fuentes usadas:`, metrics.sourcesUsed);
console.log(`  Errores por fuente:`, metrics.sourceErrors);

// Cerrar
await contextService.shutdown();
console.log('\n✅ Prueba completada');