// backend/test/test-reasoning-with-knowledge.js
// 🧠 PRUEBA: REASONING CON CONOCIMIENTO DE ARQUITECTURA

import knowledgeService from '../src/knowledge/index.js';
import { PublicContractService } from '../src/knowledge/publicContractService.js';
import { DependencyResolver } from '../src/resolvers/dependencyResolver.js';
import { MethodResolver } from '../src/resolvers/methodResolver.js';
import { ImpactResolver } from '../src/resolvers/impactResolver.js';
import { QueryPlanner } from '../src/services/queryPlanner.js';
import { ReasoningService } from '../src/services/reasoningService.js';

console.log('🧠 PRUEBA: REASONING CON CONOCIMIENTO\n');
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
    
    // Respuesta simulada para consultas de Instagram
    if (userMessage.includes('Instagram') || userMessage.includes('presencia')) {
      return {
        steps: [
          {
            id: 'instagram_strategy',
            type: 'action',
            description: 'Estrategia para mejorar presencia en Instagram',
            action: 'plan',
            input: { query: userMessage },
            output: `Para mejorar tu presencia en Instagram:\n\n1. Publica contenido de calidad diariamente\n2. Usa hashtags relevantes\n3. Interactúa con tu audiencia\n4. Analiza tus métricas\n5. Colabora con otros creadores`
          }
        ],
        metadata: {
          confidence: 0.85,
          type: 'marketing_strategy'
        }
      };
    }
    
    return {
      steps: [
        {
          id: 'generic_response',
          type: 'action',
          description: 'Respuesta genérica',
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

// ─── Reasoning Service ──────────────────────────────────────

const reasoningService = new ReasoningService({
  queryPlanner: queryPlanner,
  knowledgeService: knowledgeService,
  contextService: null,
  contextWindowManager: null,
  aiProvider: mockAIProvider,  // ← Usar el mock
  config: {}
});

// ─── PRUEBA 1: ¿Quién usa aiProvider? ──────────────────────

console.log('\n📌 PRUEBA 1: ¿Quién usa aiProvider?');
const result1 = await reasoningService.createPlan(
  '¿Quién usa aiProvider?',
  'test-session-1'
);

console.log(`  ✅ Éxito: ${result1.success}`);
console.log(`  📊 Confianza: ${result1.confidence}`);
console.log(`  🧠 Contexto usado: ${result1.contextUsed}`);
console.log(`  📝 Respuesta:\n    ${result1.plan?.steps?.[0]?.output?.substring(0, 150) || result1.error || 'No disponible'}...`);

// ─── PRUEBA 2: ¿Qué métodos tiene contextService? ──────────

console.log('\n📌 PRUEBA 2: ¿Qué métodos tiene contextService?');
const result2 = await reasoningService.createPlan(
  '¿Qué métodos tiene contextService?',
  'test-session-2'
);

console.log(`  ✅ Éxito: ${result2.success}`);
console.log(`  📊 Confianza: ${result2.confidence}`);
console.log(`  🧠 Contexto usado: ${result2.contextUsed}`);
console.log(`  📝 Respuesta:\n    ${result2.plan?.steps?.[0]?.output?.substring(0, 150) || result2.error || 'No disponible'}...`);

// ─── PRUEBA 3: ¿Cuál es el impacto de cambiar memoryService? ─

console.log('\n📌 PRUEBA 3: ¿Cuál es el impacto de cambiar memoryService?');
const result3 = await reasoningService.createPlan(
  '¿Cuál es el impacto de cambiar memoryService?',
  'test-session-3'
);

console.log(`  ✅ Éxito: ${result3.success}`);
console.log(`  📊 Confianza: ${result3.confidence}`);
console.log(`  🧠 Contexto usado: ${result3.contextUsed}`);
console.log(`  📝 Respuesta:\n    ${result3.plan?.steps?.[0]?.output?.substring(0, 150) || result3.error || 'No disponible'}...`);

// ─── PRUEBA 4: Consulta normal (no arquitectura) ────────────

console.log('\n📌 PRUEBA 4: Consulta normal (no arquitectura)');
console.log('   "¿Cómo puedo mejorar mi presencia en Instagram?"');
const result4 = await reasoningService.createPlan(
  '¿Cómo puedo mejorar mi presencia en Instagram?',
  'test-session-4'
);

console.log(`  ✅ Éxito: ${result4.success}`);
console.log(`  📊 Confianza: ${result4.confidence}`);
console.log(`  🧠 Contexto usado: ${result4.contextUsed}`);
console.log(`  📝 Plan generado: ${result4.plan ? 'Sí' : 'No'}`);

if (result4.plan) {
  console.log(`  📊 Pasos del plan: ${result4.plan.steps?.length || 0}`);
  if (result4.plan.steps && result4.plan.steps.length > 0) {
    console.log(`  📝 Primer paso: ${result4.plan.steps[0].description || result4.plan.steps[0].id}`);
    console.log(`  📝 Contenido: ${result4.plan.steps[0].output?.substring(0, 100) || 'No disponible'}...`);
  }
}

// ─── PRUEBA 5: ¿De qué depende reasoningService? ────────────

console.log('\n📌 PRUEBA 5: ¿De qué depende reasoningService?');
const result5 = await reasoningService.createPlan(
  '¿De qué depende reasoningService?',
  'test-session-5'
);

console.log(`  ✅ Éxito: ${result5.success}`);
console.log(`  📊 Confianza: ${result5.confidence}`);
console.log(`  🧠 Contexto usado: ${result5.contextUsed}`);
console.log(`  📝 Respuesta:\n    ${result5.plan?.steps?.[0]?.output?.substring(0, 150) || result5.error || 'No disponible'}...`);

// ─── PRUEBA 6: Compara contextService y memoryService ──────

console.log('\n📌 PRUEBA 6: Compara contextService y memoryService');
const result6 = await reasoningService.createPlan(
  'Compara contextService y memoryService',
  'test-session-6'
);

console.log(`  ✅ Éxito: ${result6.success}`);
console.log(`  📊 Confianza: ${result6.confidence}`);
console.log(`  🧠 Contexto usado: ${result6.contextUsed}`);
console.log(`  📝 Respuesta:\n    ${result6.plan?.steps?.[0]?.output?.substring(0, 150) || result6.error || 'No disponible'}...`);

// ─── RESUMEN ──────────────────────────────────────────────────

console.log('\n' + '=' .repeat(60));
console.log('\n📊 RESUMEN DE PRUEBAS:');

const tests = [
  { name: '¿Quién usa aiProvider?', result: result1 },
  { name: '¿Qué métodos tiene contextService?', result: result2 },
  { name: '¿Cuál es el impacto de cambiar memoryService?', result: result3 },
  { name: 'Consulta normal (Instagram)', result: result4 },
  { name: '¿De qué depende reasoningService?', result: result5 },
  { name: 'Compara contextService y memoryService', result: result6 }
];

let passed = 0;
for (const test of tests) {
  const success = test.result.success === true;
  console.log(`  ${success ? '✅' : '❌'} ${test.name}`);
  if (success) passed++;
}

console.log(`\n  Resultado: ${passed}/${tests.length} pruebas pasaron`);
console.log(`  ${passed === tests.length ? '✅ TODAS LAS PRUEBAS PASARON' : '⚠️ ALGUNAS PRUEBAS FALLARON'}`);

console.log('\n✅ Prueba completada');

await queryPlanner.shutdown();
await knowledgeService.shutdown();