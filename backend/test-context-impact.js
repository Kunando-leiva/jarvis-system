// backend/test-context-impact.js
// Prueba explícita: el contexto cambia el plan de forma coherente

import reasoningService from './src/services/reasoningService.js';
import memoryService from './src/services/memoryService.js';

console.log('🧪 PRUEBA DE IMPACTO DEL CONTEXTO EN EL PLAN\n');
console.log('=' .repeat(60));

// Inicializar
await reasoningService.initialize();
await memoryService.initialize();

const query = '¿Qué me recomiendas?';

// ─── SESIÓN 1: SIN CONTEXTO ───────────────────────────────────

const session1 = `test_no_context_${Date.now()}`;

console.log('\n📌 SESIÓN 1: Sin contexto previo');
console.log(`  Query: "${query}"`);

const plan1 = await reasoningService.createPlan(query, session1);

console.log(`\n  📊 Plan sin contexto:`);
console.log(`    Intent: ${plan1.intent}`);
console.log(`    Confianza: ${plan1.confidence}`);
console.log(`    Pasos: ${plan1.steps?.length || 0}`);
console.log(`    Contexto: ${plan1._metadata?.contextImpact?.hasContext ? '✅' : '❌'}`);
console.log(`    Relevancia: ${plan1._metadata?.contextImpact?.relevanceScore ? (plan1._metadata?.contextImpact?.relevanceScore * 100).toFixed(0) : 'N/A'}%`);
console.log(`    Confianza clasificada: ${plan1._metadata?.confidence?.level || 'N/A'}`);
console.log(`    Acción sugerida: ${plan1._metadata?.confidence?.action || 'N/A'}`);

console.log(`\n  📋 Primer paso: ${plan1.steps?.[0]?.step?.substring(0, 60) || 'N/A'}...`);

// ─── SESIÓN 2: CON CONTEXTO (MARKETING) ──────────────────────

const session2 = `test_with_context_marketing_${Date.now()}`;

console.log('\n📌 SESIÓN 2: Con contexto de marketing');
console.log(`  Query: "${query}"`);

// Guardar contexto
await memoryService.saveMessage(session2, 'user', 'Trabajo en marketing digital');
await memoryService.saveMessage(session2, 'assistant', 'Excelente, ¿qué área te interesa más?');
await memoryService.saveMessage(session2, 'user', 'Me especializo en Instagram y creación de contenido');

console.log(`  Mensajes guardados: 3`);

// Guardar hechos semánticos
// 🔥 CORREGIDO: usar ensureSession (público) en lugar de _ensureSession (privado)
await memoryService.ensureSession(session2);
const db = memoryService.db;
db.prepare(`
  INSERT OR REPLACE INTO semantic_memory (session_id, key, value, confidence)
  VALUES (?, ?, ?, ?)
`).run(session2, 'user_industry', 'marketing_digital', 0.95);
db.prepare(`
  INSERT OR REPLACE INTO semantic_memory (session_id, key, value, confidence)
  VALUES (?, ?, ?, ?)
`).run(session2, 'user_platform', 'instagram', 0.92);
db.prepare(`
  INSERT OR REPLACE INTO semantic_memory (session_id, key, value, confidence)
  VALUES (?, ?, ?, ?)
`).run(session2, 'user_interest', 'creacion_contenido', 0.88);

console.log(`  Hechos guardados: 3`);

const plan2 = await reasoningService.createPlan(query, session2);

console.log(`\n  📊 Plan CON contexto de marketing:`);
console.log(`    Intent: ${plan2.intent}`);
console.log(`    Confianza: ${plan2.confidence}`);
console.log(`    Pasos: ${plan2.steps?.length || 0}`);
console.log(`    Contexto: ${plan2._metadata?.contextImpact?.hasContext ? '✅' : '❌'}`);
console.log(`    Relevancia: ${plan2._metadata?.contextImpact?.relevanceScore ? (plan2._metadata?.contextImpact?.relevanceScore * 100).toFixed(0) : 'N/A'}%`);
console.log(`    Confianza clasificada: ${plan2._metadata?.confidence?.level || 'N/A'}`);

console.log(`\n  📋 Primer paso: ${plan2.steps?.[0]?.step?.substring(0, 60) || 'N/A'}...`);

// ─── SESIÓN 3: CON CONTEXTO (TECNOLOGÍA) ─────────────────────

const session3 = `test_with_context_tech_${Date.now()}`;

console.log('\n📌 SESIÓN 3: Con contexto de tecnología');
console.log(`  Query: "${query}"`);

// Guardar contexto
await memoryService.saveMessage(session3, 'user', 'Soy desarrollador de software');
await memoryService.saveMessage(session3, 'assistant', '¿En qué tecnologías trabajas?');
await memoryService.saveMessage(session3, 'user', 'Uso Node.js y React para aplicaciones web');

console.log(`  Mensajes guardados: 3`);

// Guardar hechos semánticos
// 🔥 CORREGIDO: usar ensureSession (público)
await memoryService.ensureSession(session3);
db.prepare(`
  INSERT OR REPLACE INTO semantic_memory (session_id, key, value, confidence)
  VALUES (?, ?, ?, ?)
`).run(session3, 'user_role', 'developer', 0.95);
db.prepare(`
  INSERT OR REPLACE INTO semantic_memory (session_id, key, value, confidence)
  VALUES (?, ?, ?, ?)
`).run(session3, 'user_tech_stack', 'nodejs_react', 0.92);
db.prepare(`
  INSERT OR REPLACE INTO semantic_memory (session_id, key, value, confidence)
  VALUES (?, ?, ?, ?)
`).run(session3, 'user_interest', 'web_development', 0.88);

console.log(`  Hechos guardados: 3`);

const plan3 = await reasoningService.createPlan(query, session3);

console.log(`\n  📊 Plan CON contexto de tecnología:`);
console.log(`    Intent: ${plan3.intent}`);
console.log(`    Confianza: ${plan3.confidence}`);
console.log(`    Pasos: ${plan3.steps?.length || 0}`);
console.log(`    Contexto: ${plan3._metadata?.contextImpact?.hasContext ? '✅' : '❌'}`);
console.log(`    Relevancia: ${plan3._metadata?.contextImpact?.relevanceScore ? (plan3._metadata?.contextImpact?.relevanceScore * 100).toFixed(0) : 'N/A'}%`);
console.log(`    Confianza clasificada: ${plan3._metadata?.confidence?.level || 'N/A'}`);

console.log(`\n  📋 Primer paso: ${plan3.steps?.[0]?.step?.substring(0, 60) || 'N/A'}...`);

// ─── COMPARACIÓN ─────────────────────────────────────────────

console.log('\n' + '=' .repeat(60));
console.log('\n📊 COMPARACIÓN DE PLANES SEGÚN CONTEXTO:');

console.log(`\n  🔹 Sin contexto:`);
console.log(`     Intent: ${plan1.intent}`);
console.log(`     Paso 1: ${plan1.steps?.[0]?.step?.substring(0, 50) || 'N/A'}...`);

console.log(`\n  🔹 Contexto Marketing:`);
console.log(`     Intent: ${plan2.intent}`);
console.log(`     Paso 1: ${plan2.steps?.[0]?.step?.substring(0, 50) || 'N/A'}...`);

console.log(`\n  🔹 Contexto Tecnología:`);
console.log(`     Intent: ${plan3.intent}`);
console.log(`     Paso 1: ${plan3.steps?.[0]?.step?.substring(0, 50) || 'N/A'}...`);

// ─── VERIFICACIÓN ─────────────────────────────────────────────

const plansDiffer = plan1.intent !== plan2.intent || plan1.intent !== plan3.intent;
const stepsDiffer = JSON.stringify(plan1.steps?.[0]) !== JSON.stringify(plan2.steps?.[0]) ||
                     JSON.stringify(plan1.steps?.[0]) !== JSON.stringify(plan3.steps?.[0]);

console.log('\n📌 VERIFICACIÓN DE IMPACTO:');
console.log(`  Los intent difieren: ${plansDiffer ? '✅' : '❌'}`);
console.log(`  Los pasos difieren: ${stepsDiffer ? '✅' : '❌'}`);

if (plansDiffer && stepsDiffer) {
  console.log('\n✅ EL CONTEXTO IMPACTA EL PLAN DE FORMA COHERENTE');
} else {
  console.log('\n⚠️ EL CONTEXTO NO ESTÁ IMPACTANDO EL PLAN COMO SE ESPERA');
}

// ─── LIMPIEZA ─────────────────────────────────────────────────

console.log('\n🧹 Limpiando...');

await reasoningService.shutdown();
await memoryService.shutdown();

console.log('\n✅ Prueba completada');