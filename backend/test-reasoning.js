// backend/test-reasoning.js
// Prueba del Reasoning Service con el pipeline completo

import reasoningService from './src/services/reasoningService.js';
import memoryService from './src/services/memoryService.js';

console.log('🧪 Probando Reasoning Service (Pipeline completo)\n');
console.log('=' .repeat(60));

// Inicializar
await reasoningService.initialize();

const sessionId = `test_reasoning_${Date.now()}`;

// Guardar algunos mensajes de contexto
await memoryService.initialize();
await memoryService.saveMessage(sessionId, 'user', 'Hola, quiero aprender sobre marketing digital');
await memoryService.saveMessage(sessionId, 'assistant', 'Excelente, el marketing digital es un campo amplio. ¿Qué área te interesa más?');
await memoryService.saveMessage(sessionId, 'user', 'Me interesa Instagram y la creación de contenido');

console.log('\n📋 Sesión de prueba creada');
console.log(`  Session ID: ${sessionId}`);
console.log(`  Mensajes guardados: 3`);

// ─── PRUEBA 1: Consulta simple ─────────────────────────────────

console.log('\n📌 PRUEBA 1: Consulta simple');
const query1 = '¿Cómo puedo mejorar mi presencia en Instagram?';

console.log(`  Consulta: "${query1}"`);

const plan1 = await reasoningService.createPlan(query1, sessionId);

console.log(`\n  📊 Resultado:`);
console.log(`    Intent: ${plan1.intent}`);
console.log(`    Confianza: ${plan1.confidence}`);
console.log(`    Pasos: ${plan1.steps?.length || 0}`);
console.log(`    Validación: ${plan1._metadata?.validation?.valid ? '✅' : '❌'}`);
console.log(`    Tiempo: ${plan1._metadata?.generationTimeMs || 0}ms`);
console.log(`    Tokens: ${plan1._metadata?.tokensUsed || 0}`);
console.log(`    Proveedor: ${plan1._provider || 'unknown'}`);

if (plan1.steps && plan1.steps.length > 0) {
  console.log(`\n  📋 Pasos del plan:`);
  for (let i = 0; i < Math.min(plan1.steps.length, 3); i++) {
    const step = plan1.steps[i];
    console.log(`    ${i+1}. ${step.step}`);
    console.log(`       Tool: ${step.toolOrAgent || 'none'}`);
  }
  if (plan1.steps.length > 3) {
    console.log(`    ... y ${plan1.steps.length - 3} pasos más`);
  }
}

// ─── PRUEBA 2: Consulta sin contexto ──────────────────────────

console.log('\n📌 PRUEBA 2: Consulta sin contexto (nueva sesión)');
const newSessionId = `test_reasoning_new_${Date.now()}`;
const query2 = 'Hola, ¿quién eres?';

console.log(`  Consulta: "${query2}"`);

const plan2 = await reasoningService.createPlan(query2, newSessionId);

console.log(`\n  📊 Resultado:`);
console.log(`    Intent: ${plan2.intent}`);
console.log(`    Confianza: ${plan2.confidence}`);
console.log(`    Pasos: ${plan2.steps?.length || 0}`);
console.log(`    Validación: ${plan2._metadata?.validation?.valid ? '✅' : '❌'}`);
console.log(`    Tiempo: ${plan2._metadata?.generationTimeMs || 0}ms`);

// ─── PRUEBA 3: Consulta compleja ──────────────────────────────

console.log('\n📌 PRUEBA 3: Consulta compleja');
const query3 = 'Necesito un plan estratégico para crecer en Instagram, incluyendo análisis de métricas, estrategia de contenido y engagement';

console.log(`  Consulta: "${query3.substring(0, 50)}..."`);

const plan3 = await reasoningService.createPlan(query3, sessionId);

console.log(`\n  📊 Resultado:`);
console.log(`    Intent: ${plan3.intent}`);
console.log(`    Confianza: ${plan3.confidence}`);
console.log(`    Pasos: ${plan3.steps?.length || 0}`);
console.log(`    Validación: ${plan3._metadata?.validation?.valid ? '✅' : '❌'}`);
console.log(`    Tiempo: ${plan3._metadata?.generationTimeMs || 0}ms`);
console.log(`    Tokens: ${plan3._metadata?.tokensUsed || 0}`);

if (plan3.steps && plan3.steps.length > 0) {
  console.log(`\n  📋 Pasos del plan:`);
  for (let i = 0; i < Math.min(plan3.steps.length, 4); i++) {
    const step = plan3.steps[i];
    console.log(`    ${i+1}. ${step.step}`);
    console.log(`       Tool: ${step.toolOrAgent || 'none'}`);
  }
  if (plan3.steps.length > 4) {
    console.log(`    ... y ${plan3.steps.length - 4} pasos más`);
  }
}

// ─── RESUMEN ──────────────────────────────────────────────────

console.log('\n' + '=' .repeat(60));
console.log('\n📊 MÉTRICAS DEL REASONING SERVICE:');

const metrics = reasoningService.getMetrics();
console.log(`  Planes generados: ${metrics.plansGenerated}`);
console.log(`  Planes validados: ${metrics.plansValidated}`);
console.log(`  Planes rechazados: ${metrics.plansRejected}`);
console.log(`  Tiempo promedio: ${metrics.avgPlanTime.toFixed(0)}ms`);
console.log(`  Máximo de pasos: ${metrics.maxSteps}`);

console.log('\n✅ Prueba completada');

await reasoningService.shutdown();
await memoryService.shutdown();