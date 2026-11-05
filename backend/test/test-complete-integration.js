// backend/test/test-complete-integration.js - VERSIÓN FINAL

import knowledgeService from '../src/knowledge/index.js';
import { PublicContractService } from '../src/knowledge/publicContractService.js';
import { KnowledgeQueryService } from '../src/services/knowledgeQueryService.js';
import { DependencyResolver } from '../src/resolvers/dependencyResolver.js';
import { MethodResolver } from '../src/resolvers/methodResolver.js';
import { ImpactResolver } from '../src/resolvers/impactResolver.js';
import { QueryPlanner } from '../src/services/queryPlanner.js';

console.log('🧪 PRUEBA DE INTEGRACIÓN COMPLETA - FASE 3\n');
console.log('='.repeat(60));

await knowledgeService.initialize();

// ⭐ ARQUITECTURA CORRECTA
const contractService = new PublicContractService(knowledgeService);

const knowledgeQueryService = new KnowledgeQueryService(knowledgeService, contractService);
await knowledgeQueryService.initialize();

// ⭐ CREAR UNA SOLA INSTANCIA DE DEPENDENCYRESOLVER
const depResolver = new DependencyResolver(knowledgeService);

// ⭐ FORZAR CARGA DEL GRAFO
if (typeof depResolver.initialize === 'function') {
  await depResolver.initialize();
}

// ⭐ MethodResolver recibe contractService
const methodResolver = new MethodResolver(contractService);

// ⭐ ImpactResolver usa la MISMA instancia
const impactResolver = new ImpactResolver(
  depResolver,
  methodResolver,
  contractService
);

// ⭐ QueryPlanner usa la MISMA instancia
const queryPlanner = new QueryPlanner({
  knowledgeService: knowledgeService,
  knowledgeQueryService: knowledgeQueryService,
  dependencyResolver: depResolver,
  methodResolver: methodResolver,
  impactResolver: impactResolver,
  contractService: contractService
});
await queryPlanner.initialize();

// ─── PRUEBA DE VERIFICACIÓN INICIAL ─────────────────────────

console.log('\n🔍 VERIFICACIÓN INICIAL:');
console.log(`  depResolver instance: ${depResolver ? '✅' : '❌'}`);
console.log(`  impactResolver.dependencyResolver: ${impactResolver.dependencyResolver ? '✅' : '❌'}`);
console.log(`  ¿Misma instancia? ${depResolver === impactResolver.dependencyResolver ? '✅ SÍ' : '❌ NO'}`);

// Probar findDependents directamente con la instancia
console.log('\n  Probando depResolver.findDependents("memoryService"):');
const testDeps = depResolver.findDependents('memoryService');
console.log(`    Success: ${testDeps.success}`);
if (testDeps.success) {
  console.log(`    Dependents: ${testDeps.data?.dependents?.join(', ') || 'ninguno'}`);
}

// ─── PRUEBA 1: DEPENDENCIAS ──────────────────────────────────

console.log('\n📌 DEPENDENCIAS DE contextService:');
const deps = depResolver.findDependencies('contextService');
if (deps.success) {
  const depsData = deps.data.dependencies;
  if (Array.isArray(depsData)) {
    console.log(`  Dependencias: ${depsData.join(', ') || 'ninguna'}`);
  } else if (depsData && typeof depsData === 'object') {
    const internal = depsData.internal || [];
    const external = depsData.external || [];
    const node = depsData.node || [];
    console.log(`  Internas: ${internal.join(', ') || 'ninguna'}`);
    console.log(`  Externas: ${external.join(', ') || 'ninguna'}`);
    console.log(`  Node: ${node.join(', ') || 'ninguna'}`);
  } else {
    console.log(`  Dependencias: ${depsData || 'ninguna'}`);
  }
} else {
  console.log(`  ❌ Error: ${deps.error}`);
}

// ─── PRUEBA 2: DEPENDIENTES ──────────────────────────────────

console.log('\n📌 DEPENDIENTES DE memoryService:');
const dependentsResult = depResolver.findDependents('memoryService');
if (dependentsResult && dependentsResult.success) {
  const data = dependentsResult.data;
  if (data && data.dependents && Array.isArray(data.dependents)) {
    console.log(`  Usado por: ${data.dependents.join(', ') || 'ninguno'}`);
  } else if (data && Array.isArray(data)) {
    console.log(`  Usado por: ${data.join(', ') || 'ninguno'}`);
  } else {
    console.log(`  Usado por: ${data || 'ninguno'}`);
  }
} else {
  console.log(`  ❌ Error: ${dependentsResult?.error || 'Respuesta inválida'}`);
}

// ─── PRUEBA 3: QUERY PLANNER ─────────────────────────────────

console.log('\n📌 QUERY PLANNER - Consultas complejas:');

const queries = [
  '¿Qué métodos tiene reasoningService?',
  '¿Quién usa aiProvider?',
  '¿Cuál es el impacto de cambiar memoryService?'
];

let allPassed = true;

for (const query of queries) {
  console.log(`\n  ▶ "${query}"`);
  try {
    const result = await queryPlanner.processQuery(query);
    
    if (!result.response || result.response.includes('❌') || result.response.includes('Error')) {
      console.log(`    ❌ FALLÓ: Respuesta inválida`);
      console.log(`    Respuesta: ${result.response}`);
      allPassed = false;
    } else {
      console.log(`    ✅ PASÓ`);
      console.log(`    Intención: ${result.intent || 'unknown'}`);
      console.log(`    Respuesta: ${result.response.substring(0, 150)}...`);
    }
  } catch (error) {
    console.log(`    ❌ FALLÓ: Excepción - ${error.message}`);
    allPassed = false;
  }
}

// ─── PRUEBA 4: IMPACT RESOLVER ──────────────────────────────

console.log('\n📌 IMPACTO DE contextService:');
const impact = impactResolver.analyzeComponentImpact('contextService', { deep: true });
if (impact && impact.success) {
  const data = impact.data?.impact || impact.data || {};
  console.log(`  Directos: ${data.directCount || 0}`);
  console.log(`  Indirectos: ${data.indirectCount || 0}`);
  console.log(`  Criticidad: ${data.criticality?.level || 'LOW'}`);
  console.log(`  Resumen: ${data.summary?.message || 'Sin resumen'}`);
  if (data.recommendations?.length > 0) {
    console.log(`  Recomendación: ${data.recommendations[0].message}`);
  }
} else {
  console.log(`  ❌ Error: ${impact?.error || 'Respuesta inválida'}`);
  allPassed = false;
}

// ─── PRUEBA 5: IMPACT DE MEMORYSERVICE (VERIFICACIÓN) ──────

console.log('\n📌 IMPACTO DE memoryService (verificación):');

// ✅ Limpiar caché para esta verificación
impactResolver.clearCache();

try {
  const memoryImpact = impactResolver.analyzeComponentImpact('memoryService', { 
    deep: true, 
    useCache: false  // ← Saltar caché
  });
  
  if (memoryImpact && memoryImpact.success) {
    const data = memoryImpact.data?.impact || memoryImpact.data || {};
    console.log(`  Directos: ${data.directCount || 0}`);
    console.log(`  Indirectos: ${data.indirectCount || 0}`);
    console.log(`  Criticidad: ${data.criticality?.level || 'LOW'}`);
    if (data.directCount > 0) {
      console.log(`  ✅ memoryService tiene ${data.directCount} dependientes directos`);
    } else {
      console.log(`  ❌ memoryService debería tener dependientes pero muestra 0`);
      allPassed = false;
    }
  } else {
    console.log(`  ❌ Error en respuesta: ${memoryImpact?.error || 'Error desconocido'}`);
    allPassed = false;
  }
} catch (error) {
  console.log(`  ❌ Excepción: ${error.message}`);
  allPassed = false;
}

// ─── RESUMEN ──────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log(`\n📊 RESULTADO FINAL: ${allPassed ? '✅ TODAS PASARON' : '❌ ALGUNAS FALLARON'}`);

if (!allPassed) {
  console.log('\n⚠️ Revisar los errores antes de continuar.');
  process.exit(1);
}

console.log('\n✅ PRUEBA COMPLETA PASADA');
console.log('🎉 FASE 3.6 COMPLETADA EXITOSAMENTE');

await queryPlanner.shutdown();
await knowledgeQueryService.shutdown();
await knowledgeService.shutdown();