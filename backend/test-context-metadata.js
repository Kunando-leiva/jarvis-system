// backend/test-context-metadata.js
// Pruebas de metadatos de contexto - VERSIÓN REFINADA

import reasoningService from './src/services/reasoningService.js';
import memoryService from './src/services/memoryService.js';

console.log('🧪 PRUEBAS DE METADATOS DE CONTEXTO (REFINADO)\n');
console.log('=' .repeat(60));

await reasoningService.initialize();
await memoryService.initialize();

// ─── PRUEBA 1: SESIÓN NUEVA (SOLO SYSTEM STATE) ─────────────

console.log('\n📌 PRUEBA 1: Sesión nueva (solo systemState)');
console.log('   Esperado: contextUsed: false, relevantSources: []');

const session1 = `test_metadata_new_${Date.now()}`;
const plan1 = await reasoningService.createPlan('Hola', session1);

const context1 = plan1._metadata?.context || {};
console.log(`  contextUsed: ${context1.used}`);
console.log(`  baseSources: ${context1.baseSources?.join(', ') || '[]'}`);
console.log(`  relevantSources: ${context1.relevantSources?.join(', ') || '[]'}`);
console.log(`  allSources: ${context1.allSources?.join(', ') || '[]'}`);
console.log(`  relevance: ${context1.relevance ?? 'null'}`);
console.log(`  confidence: ${plan1._metadata?.confidence?.level || 'N/A'}`);

const test1Passed = context1.used === false && 
                     context1.relevantSources?.length === 0 &&
                     context1.baseSources?.includes('systemState');

console.log(`  ${test1Passed ? '✅' : '❌'} PRUEBA 1: ${test1Passed ? 'PASADA' : 'FALLADA'}`);

// ─── PRUEBA 2: CON HISTORIAL ──────────────────────────────────

console.log('\n📌 PRUEBA 2: Con historial');
console.log('   Esperado: contextUsed: true, relevantSources: ["history"]');

const session2 = `test_metadata_history_${Date.now()}`;

await memoryService.saveMessage(session2, 'user', 'Hola, soy un usuario de prueba');
await memoryService.saveMessage(session2, 'assistant', 'Bienvenido, ¿cómo puedo ayudarte?');
await memoryService.saveMessage(session2, 'user', 'Quiero aprender sobre IA');

const plan2 = await reasoningService.createPlan('¿Qué me recomiendas?', session2);

const context2 = plan2._metadata?.context || {};
console.log(`  contextUsed: ${context2.used}`);
console.log(`  baseSources: ${context2.baseSources?.join(', ') || '[]'}`);
console.log(`  relevantSources: ${context2.relevantSources?.join(', ') || '[]'}`);
console.log(`  allSources: ${context2.allSources?.join(', ') || '[]'}`);
console.log(`  relevance: ${context2.relevance ?? 'null'}`);
console.log(`  confidence: ${plan2._metadata?.confidence?.level || 'N/A'}`);

const test2Passed = context2.used === true && 
                     context2.relevantSources?.includes('history');

console.log(`  ${test2Passed ? '✅' : '❌'} PRUEBA 2: ${test2Passed ? 'PASADA' : 'FALLADA'}`);

// ─── PRUEBA 3: CON MEMORIA SEMÁNTICA ──────────────────────────

console.log('\n📌 PRUEBA 3: Con memoria semántica');
console.log('   Esperado: contextUsed: true, relevantSources: ["semantic"]');

const session3 = `test_metadata_semantic_${Date.now()}`;

await memoryService.ensureSession(session3);
const db = memoryService.db;
db.prepare(`
  INSERT OR REPLACE INTO semantic_memory (session_id, key, value, confidence)
  VALUES (?, ?, ?, ?)
`).run(session3, 'user_interest', 'inteligencia_artificial', 0.95);
db.prepare(`
  INSERT OR REPLACE INTO semantic_memory (session_id, key, value, confidence)
  VALUES (?, ?, ?, ?)
`).run(session3, 'user_level', 'principiante', 0.85);

const plan3 = await reasoningService.createPlan('¿Qué me recomiendas?', session3);

const context3 = plan3._metadata?.context || {};
console.log(`  contextUsed: ${context3.used}`);
console.log(`  baseSources: ${context3.baseSources?.join(', ') || '[]'}`);
console.log(`  relevantSources: ${context3.relevantSources?.join(', ') || '[]'}`);
console.log(`  allSources: ${context3.allSources?.join(', ') || '[]'}`);
console.log(`  relevance: ${context3.relevance ?? 'null'}`);
console.log(`  confidence: ${plan3._metadata?.confidence?.level || 'N/A'}`);

const test3Passed = context3.used === true && 
                     context3.relevantSources?.includes('semantic');

console.log(`  ${test3Passed ? '✅' : '❌'} PRUEBA 3: ${test3Passed ? 'PASADA' : 'FALLADA'}`);

// ─── PRUEBA 4: CONTEXT RELEVANCE NO INVENTADO ─────────────────

console.log('\n📌 PRUEBA 4: Context Relevance no inventado');
console.log('   Esperado: relevance es null cuando no hay contexto relevante');

// Usar el plan1 (sin contexto)
const relevanceNull = plan1._metadata?.context?.relevance === null || 
                       plan1._metadata?.context?.relevance === undefined;

console.log(`  relevance en sesión nueva: ${plan1._metadata?.context?.relevance ?? 'null'}`);
console.log(`  ${relevanceNull ? '✅' : '❌'} PRUEBA 4: ${relevanceNull ? 'PASADA' : 'FALLADA'}`);

// ─── RESUMEN ──────────────────────────────────────────────────

console.log('\n' + '=' .repeat(60));
console.log('\n📊 RESUMEN DE PRUEBAS:');
console.log(`  ✅ PRUEBA 1: Sesión nueva → contextUsed: false, relevantSources: []`);
console.log(`  ${test1Passed ? '✅' : '❌'} PRUEBA 2: Con historial → contextUsed: true, relevantSources: ["history"]`);
console.log(`  ${test2Passed ? '✅' : '❌'} PRUEBA 3: Con semántica → contextUsed: true, relevantSources: ["semantic"]`);
console.log(`  ${test3Passed ? '✅' : '❌'} PRUEBA 4: relevance es null sin contexto relevante`);

const allPassed = test1Passed && test2Passed && test3Passed && relevanceNull;

if (allPassed) {
  console.log('\n✅ ¡TODAS LAS PRUEBAS DE METADATOS PASARON!');
  console.log('   Semántica de contextUsed refinada correctamente.');
} else {
  console.log('\n⚠️ Algunas pruebas fallaron. Revisar la lógica de metadatos.');
}

await reasoningService.shutdown();
await memoryService.shutdown();

console.log('\n✅ Pruebas completadas');