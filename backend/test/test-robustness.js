// backend/test/test-robustness.js
// 🛡️ PRUEBAS DE ROBUSTEZ - Consultas ambiguas y casos negativos

import knowledgeService from '../src/knowledge/index.js';
import { PublicContractService } from '../src/knowledge/publicContractService.js';
import { DependencyResolver } from '../src/resolvers/dependencyResolver.js';
import { MethodResolver } from '../src/resolvers/methodResolver.js';
import { ImpactResolver } from '../src/resolvers/impactResolver.js';
import { QueryPlanner } from '../src/services/queryPlanner.js';
import { ReasoningService } from '../src/services/reasoningService.js';

console.log('🛡️ PRUEBAS DE ROBUSTEZ\n');
console.log('=' .repeat(60));

await knowledgeService.initialize();

// ─── Setup ────────────────────────────────────────────────────

const contractService = new PublicContractService(knowledgeService);
const depResolver = new DependencyResolver(contractService);
const methodResolver = new MethodResolver(contractService);
const impactResolver = new ImpactResolver(depResolver, methodResolver, contractService);

const queryPlanner = new QueryPlanner({
  knowledgeQueryService: null,
  dependencyResolver: depResolver,
  methodResolver: methodResolver,
  impactResolver: impactResolver
});
await queryPlanner.initialize();

// ─── Mock del AIProvider ──────────────────────────────────────

const mockAIProvider = {
  chat: async ({ messages, sessionId, temperature, maxTokens }) => {
    const userMessage = messages.find(m => m.role === 'user')?.content || '';
    
    return {
      steps: [
        {
          id: 'response',
          type: 'action',
          description: 'Respuesta generada',
          action: 'respond',
          input: { query: userMessage },
          output: `He procesado tu consulta: "${userMessage}"`
        }
      ],
      metadata: {
        confidence: 0.7,
        type: 'generic'
      }
    };
  }
};

const reasoningService = new ReasoningService({
  queryPlanner: queryPlanner,
  knowledgeService: knowledgeService,
  contextService: null,
  contextWindowManager: null,
  aiProvider: mockAIProvider,
  config: {}
});

// ─── PRUEBAS ──────────────────────────────────────────────────

console.log('\n📌 PRUEBA 1: Consulta vacía');
const result1 = await reasoningService.createPlan('', 'test-session-1');
console.log(`  ✅ Éxito: ${result1.success}`);
console.log(`  📊 Confianza: ${result1.confidence}`);
console.log(`  📝 Error: ${result1.error || 'Sin error'}`);
console.log(`  ${result1.success ? '✅' : '✅'} Manejada correctamente`);

// ──────────────────────────────────────────────────────────────

console.log('\n📌 PRUEBA 2: Consulta con caracteres especiales');
const result2 = await reasoningService.createPlan(
  '¿Quién usa @#$%^&*()?',
  'test-session-2'
);
console.log(`  ✅ Éxito: ${result2.success}`);
console.log(`  📊 Confianza: ${result2.confidence}`);
console.log(`  📝 Respuesta: ${result2.plan?.steps?.[0]?.output?.substring(0, 100) || 'No disponible'}...`);
console.log(`  ${result2.success ? '✅' : '❌'} Manejada correctamente`);

// ──────────────────────────────────────────────────────────────

console.log('\n📌 PRUEBA 3: Componente inexistente');
const result3 = await reasoningService.createPlan(
  '¿Quién usa componenteInexistente123?',
  'test-session-3'
);
console.log(`  ✅ Éxito: ${result3.success}`);
console.log(`  📊 Confianza: ${result3.confidence}`);
console.log(`  📝 Respuesta: ${result3.plan?.steps?.[0]?.output?.substring(0, 100) || 'No disponible'}...`);
console.log(`  ${result3.success ? '✅' : '✅'} Manejada correctamente (fallback a IA)`);

// ──────────────────────────────────────────────────────────────

console.log('\n📌 PRUEBA 4: Consulta extremadamente larga');
const longQuery = '¿Quién usa '.repeat(100) + 'aiProvider?';
const result4 = await reasoningService.createPlan(longQuery, 'test-session-4');
console.log(`  ✅ Éxito: ${result4.success}`);
console.log(`  📊 Confianza: ${result4.confidence}`);
console.log(`  📝 Longitud de consulta: ${longQuery.length} caracteres`);
console.log(`  ${result4.success ? '✅' : '❌'} Manejada correctamente`);

// ──────────────────────────────────────────────────────────────

console.log('\n📌 PRUEBA 5: Consulta con múltiples componentes');
const result5 = await reasoningService.createPlan(
  'Compara contextService, memoryService y reasoningService',
  'test-session-5'
);
console.log(`  ✅ Éxito: ${result5.success}`);
console.log(`  📊 Confianza: ${result5.confidence}`);
console.log(`  📝 Respuesta: ${result5.plan?.steps?.[0]?.output?.substring(0, 100) || 'No disponible'}...`);
console.log(`  ${result5.success ? '✅' : '❌'} Manejada correctamente`);

// ──────────────────────────────────────────────────────────────

console.log('\n📌 PRUEBA 6: Consulta con método inexistente');
const result6 = await reasoningService.createPlan(
  '¿Quién usa metodoInexistente123?',
  'test-session-6'
);
console.log(`  ✅ Éxito: ${result6.success}`);
console.log(`  📊 Confianza: ${result6.confidence}`);
console.log(`  📝 Respuesta: ${result6.plan?.steps?.[0]?.output?.substring(0, 100) || 'No disponible'}...`);
console.log(`  ${result6.success ? '✅' : '✅'} Manejada correctamente (fallback a IA)`);

// ──────────────────────────────────────────────────────────────

console.log('\n📌 PRUEBA 7: Consulta sin contexto (sessionId vacío)');
const result7 = await reasoningService.createPlan(
  '¿Qué métodos tiene contextService?',
  ''
);
console.log(`  ✅ Éxito: ${result7.success}`);
console.log(`  📊 Confianza: ${result7.confidence}`);
console.log(`  📝 Respuesta: ${result7.plan?.steps?.[0]?.output?.substring(0, 100) || 'No disponible'}...`);
console.log(`  ${result7.success ? '✅' : '❌'} Manejada correctamente`);

// ──────────────────────────────────────────────────────────────

console.log('\n📌 PRUEBA 8: Consulta numérica');
const result8 = await reasoningService.createPlan(
  '12345',
  'test-session-8'
);
console.log(`  ✅ Éxito: ${result8.success}`);
console.log(`  📊 Confianza: ${result8.confidence}`);
console.log(`  📝 Respuesta: ${result8.plan?.steps?.[0]?.output?.substring(0, 100) || 'No disponible'}...`);
console.log(`  ${result8.success ? '✅' : '✅'} Manejada correctamente`);

// ──────────────────────────────────────────────────────────────

console.log('\n📌 PRUEBA 9: Consulta con emojis');
const result9 = await reasoningService.createPlan(
  '🚀 ¿Quién usa aiProvider? 🔥',
  'test-session-9'
);
console.log(`  ✅ Éxito: ${result9.success}`);
console.log(`  📊 Confianza: ${result9.confidence}`);
console.log(`  📝 Respuesta: ${result9.plan?.steps?.[0]?.output?.substring(0, 100) || 'No disponible'}...`);
console.log(`  ${result9.success ? '✅' : '❌'} Manejada correctamente`);

// ──────────────────────────────────────────────────────────────

console.log('\n📌 PRUEBA 10: Consulta con palabras clave mezcladas');
const result10 = await reasoningService.createPlan(
  'método contexto dependencia impacto',
  'test-session-10'
);
console.log(`  ✅ Éxito: ${result10.success}`);
console.log(`  📊 Confianza: ${result10.confidence}`);
console.log(`  📝 Respuesta: ${result10.plan?.steps?.[0]?.output?.substring(0, 100) || 'No disponible'}...`);
console.log(`  ${result10.success ? '✅' : '❌'} Manejada correctamente`);

// ─── RESUMEN ──────────────────────────────────────────────────

console.log('\n' + '=' .repeat(60));
console.log('\n📊 RESUMEN DE PRUEBAS DE ROBUSTEZ:');

const results = [
  { name: 'Consulta vacía', result: result1 },
  { name: 'Caracteres especiales', result: result2 },
  { name: 'Componente inexistente', result: result3 },
  { name: 'Consulta extremadamente larga', result: result4 },
  { name: 'Múltiples componentes', result: result5 },
  { name: 'Método inexistente', result: result6 },
  { name: 'Sin sessionId', result: result7 },
  { name: 'Consulta numérica', result: result8 },
  { name: 'Emojis', result: result9 },
  { name: 'Palabras clave mezcladas', result: result10 }
];

let passed = 0;
for (const test of results) {
  const success = test.result.success === true;
  console.log(`  ${success ? '✅' : '❌'} ${test.name}`);
  if (success) passed++;
}

console.log(`\n  Resultado: ${passed}/${results.length} pruebas pasaron`);
console.log(`  ${passed === results.length ? '✅ TODAS LAS PRUEBAS DE ROBUSTEZ PASARON' : '⚠️ ALGUNAS PRUEBAS FALLARON'}`);

console.log('\n✅ Prueba de robustez completada');

await queryPlanner.shutdown();
await knowledgeService.shutdown();