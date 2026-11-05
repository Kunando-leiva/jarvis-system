// backend/test/test-impact-resolver.js

import knowledgeService from '../src/knowledge/index.js';
import { PublicContractService } from '../src/knowledge/publicContractService.js';
import { DependencyResolver } from '../src/resolvers/dependencyResolver.js';
import { MethodResolver } from '../src/resolvers/methodResolver.js';
import { ImpactResolver } from '../src/resolvers/impactResolver.js';

console.log('💥 PRUEBA DE IMPACT RESOLVER\n');
console.log('=' .repeat(60));

await knowledgeService.initialize();

const contractService = new PublicContractService(knowledgeService);
const depResolver = new DependencyResolver(contractService);
const methodResolver = new MethodResolver(contractService);
const impactResolver = new ImpactResolver(depResolver, methodResolver, contractService);

// ─── 1. IMPACTO DE COMPONENTE ─────────────────────────────────

console.log('\n📌 IMPACTO DE COMPONENTE:');

// ContextService
console.log('\n  ▶ contextService:');
const impact1 = impactResolver.analyzeComponentImpact('contextService');
console.log(`    Directos: ${impact1.directCount}`);
console.log(`    Indirectos: ${impact1.indirectCount}`);
console.log(`    Criticidad: ${impact1.criticality.level}`);
console.log(`    Resumen: ${impact1.summary.message}`);

// memoryService
console.log('\n  ▶ memoryService:');
const impact2 = impactResolver.analyzeComponentImpact('memoryService');
console.log(`    Directos: ${impact2.directCount}`);
console.log(`    Indirectos: ${impact2.indirectCount}`);
console.log(`    Criticidad: ${impact2.criticality.level}`);
console.log(`    Resumen: ${impact2.summary.message}`);

// ─── 2. IMPACTO DE MÉTODO ─────────────────────────────────────

console.log('\n📌 IMPACTO DE MÉTODO:');

console.log('\n  ▶ getContext:');
const methodImpact = impactResolver.analyzeMethodImpact('getContext');
console.log(`    Componentes: ${methodImpact.totalComponents}`);
console.log(`    Riesgo: ${methodImpact.summary.risk}`);

// ─── 3. COMPARACIÓN ───────────────────────────────────────────

console.log('\n📌 COMPARACIÓN DE COMPONENTES:');

const comparison = impactResolver.compareImpact('contextService', 'memoryService');
console.log(`  contextService: ${comparison.comparison.componentA.directDependents} dependientes`);
console.log(`  memoryService: ${comparison.comparison.componentB.directDependents} dependientes`);
console.log(`  Más crítico: ${comparison.moreCritical || 'ninguno'}`);

// ─── 4. RECOMENDACIONES ──────────────────────────────────────

console.log('\n📌 RECOMENDACIONES:');
console.log(`  Recomendaciones para contextService:`);
for (const rec of impact1.recommendations) {
  console.log(`    [${rec.priority}] ${rec.message}`);
}

console.log('\n✅ Prueba completada');

await knowledgeService.shutdown();