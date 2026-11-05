// backend/test-context-integration.js
// Pruebas de integración para Context Service
// Valida: almacenamiento → recuperación → contexto enriquecido

import contextService from './src/services/contextService.js';
import memoryService from './src/services/memoryService.js';
import longTermMemoryService from './src/services/longTermMemoryService.js';

console.log('🧪 PRUEBAS DE INTEGRACIÓN - CONTEXT SERVICE\n');
console.log('=' .repeat(60));

// ─── INICIALIZAR ──────────────────────────────────────────────

await contextService.initialize();
await memoryService.initialize();
await longTermMemoryService.initialize();

const sessionId = `test_integration_${Date.now()}`;
let testsPassed = 0;
let testsFailed = 0;

console.log(`\n📋 Sesión de prueba: ${sessionId}\n`);

// ─── PRUEBA 1: HISTORIAL CON MENSAJES ────────────────────────

console.log('📌 PRUEBA 1: Historial con mensajes');

// Guardar varios mensajes
const messages = [
  { role: 'user', content: 'Hola, soy un usuario de prueba' },
  { role: 'assistant', content: 'Hola, ¿cómo puedo ayudarte?' },
  { role: 'user', content: 'Quiero aprender sobre marketing digital' },
  { role: 'assistant', content: 'Excelente, el marketing digital es un campo amplio. ¿Qué área te interesa más?' },
  { role: 'user', content: 'Me interesa Instagram y la creación de contenido' },
];

for (const msg of messages) {
  await memoryService.saveMessage(sessionId, msg.role, msg.content);
}

// Recuperar contexto
const context1 = await contextService.getContext({ sessionId, query: 'Cuéntame sobre marketing' });

console.log(`  Mensajes guardados: ${messages.length}`);
console.log(`  Mensajes recuperados: ${context1.history.length}`);

if (context1.history.length === messages.length) {
  console.log('  ✅ PRUEBA 1 PASADA: Historial recuperado correctamente');
  testsPassed++;
} else {
  console.log(`  ❌ PRUEBA 1 FALLADA: Esperado ${messages.length}, obtenido ${context1.history.length}`);
  testsFailed++;
}

// ─── PRUEBA 2: EVENTO EPISÓDICO ──────────────────────────────

console.log('\n📌 PRUEBA 2: Evento episódico');

// Guardar evento episódico
await longTermMemoryService.saveEpisodicEvent(
  sessionId,
  'test_interaction',
  'Usuario preguntó sobre marketing digital',
  { source: 'integration_test' }
);

// Guardar otro evento
await longTermMemoryService.saveEpisodicEvent(
  sessionId,
  'test_preference',
  'Usuario mostró interés en Instagram',
  { source: 'integration_test', confidence: 0.9 }
);

// Recuperar contexto
const context2 = await contextService.getContext({ sessionId, query: 'Intereses del usuario' });

console.log(`  Eventos guardados: 2`);
console.log(`  Eventos recuperados: ${context2.memory.episodic.length}`);

if (context2.memory.episodic.length >= 2) {
  console.log('  ✅ PRUEBA 2 PASADA: Eventos episódicos recuperados correctamente');
  testsPassed++;
} else {
  console.log(`  ❌ PRUEBA 2 FALLADA: Esperado al menos 2, obtenido ${context2.memory.episodic.length}`);
  testsFailed++;
}

// ─── PRUEBA 3: HECHO SEMÁNTICO ────────────────────────────────

console.log('\n📌 PRUEBA 3: Hecho semántico');

// Guardar hechos semánticos
await longTermMemoryService.saveSemanticFact(
  sessionId,
  'user_interest',
  'marketing digital',
  0.9,
  { source: 'integration_test' }
);

await longTermMemoryService.saveSemanticFact(
  sessionId,
  'user_platform',
  'Instagram',
  0.85,
  { source: 'integration_test' }
);

await longTermMemoryService.saveSemanticFact(
  sessionId,
  'user_goal',
  'crear contenido',
  0.8,
  { source: 'integration_test' }
);

// Recuperar contexto con consulta relacionada
const context3 = await contextService.getContext({ 
  sessionId, 
  query: '¿Qué le interesa al usuario sobre Instagram?' 
});

console.log(`  Hechos guardados: 3`);
console.log(`  Hechos recuperados: ${context3.memory.semantic.length}`);

// Verificar que los hechos específicos estén presentes
const facts = context3.memory.semantic;
const hasInterest = facts.some(f => f.key === 'user_interest' && f.value === 'marketing digital');
const hasPlatform = facts.some(f => f.key === 'user_platform' && f.value === 'Instagram');
const hasGoal = facts.some(f => f.key === 'user_goal' && f.value === 'crear contenido');

console.log(`  - user_interest: ${hasInterest ? '✅' : '❌'}`);
console.log(`  - user_platform: ${hasPlatform ? '✅' : '❌'}`);
console.log(`  - user_goal: ${hasGoal ? '✅' : '❌'}`);

if (hasInterest && hasPlatform && hasGoal) {
  console.log('  ✅ PRUEBA 3 PASADA: Hechos semánticos recuperados correctamente');
  testsPassed++;
} else {
  console.log('  ❌ PRUEBA 3 FALLADA: No se recuperaron todos los hechos esperados');
  testsFailed++;
}

// ─── PRUEBA 4 (EXTRA): CONTEXTO COMPLETO CON MÚLTIPLES FUENTES ──

console.log('\n📌 PRUEBA 4 (Extra): Contexto completo con múltiples fuentes');

const context4 = await contextService.getContext({ 
  sessionId, 
  query: 'Resumen de la conversación' 
});

console.log(`  Historial: ${context4.history.length} mensajes`);
console.log(`  Episódica: ${context4.memory.episodic.length} eventos`);
console.log(`  Semántica: ${context4.memory.semantic.length} hechos`);
console.log(`  Procedimental: ${context4.memory.procedural.length} procedimientos`);
console.log(`  Proyecto: ${context4.system.project ? '✅' : '❌'}`);
console.log(`  Estado: ${context4.system.state.mode}`);
console.log(`  Fuentes usadas: ${context4.metadata.sourcesUsed.join(', ')}`);
console.log(`  Tiempo de construcción: ${context4.metadata.buildTimeMs}ms`);

if (context4.history.length > 0 && context4.memory.episodic.length > 0 && context4.memory.semantic.length > 0) {
  console.log('  ✅ PRUEBA 4 PASADA: Contexto completo con múltiples fuentes');
  testsPassed++;
} else {
  console.log('  ❌ PRUEBA 4 FALLADA: Faltan algunas fuentes en el contexto');
  testsFailed++;
}

// ─── RESUMEN FINAL ─────────────────────────────────────────────

console.log('\n' + '=' .repeat(60));
console.log('\n📊 RESUMEN DE PRUEBAS:');
console.log(`  ✅ Pasadas: ${testsPassed}`);
console.log(`  ❌ Falladas: ${testsFailed}`);
console.log(`  📊 Total: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON!');
  console.log('   Context Service valida correctamente:');
  console.log('   ✅ Historial con mensajes');
  console.log('   ✅ Eventos episódicos');
  console.log('   ✅ Hechos semánticos');
  console.log('   ✅ Contexto completo con múltiples fuentes');
} else {
  console.log(`\n⚠️ ${testsFailed} prueba(s) fallaron. Revisar los logs.`);
}

// ─── LIMPIEZA ──────────────────────────────────────────────────

console.log('\n🧹 Limpiando...');
// Opcional: limpiar la sesión de prueba
// await memoryService.clearSession(sessionId);

await contextService.shutdown();
await memoryService.shutdown();
await longTermMemoryService.shutdown();

console.log('\n✅ Pruebas completadas');