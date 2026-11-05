// backend/test/test-component-analyzer.js
// Prueba del Component Analyzer - VERSIÓN REFINADA

import knowledgeService from '../src/knowledge/index.js';
import { ComponentAnalyzer } from '../src/knowledge/componentAnalyzer.js';

console.log('🧪 PRUEBA DE COMPONENT ANALYZER (REFINADO)\n');
console.log('=' .repeat(60));

await knowledgeService.initialize();

const analyzer = new ComponentAnalyzer(knowledgeService);

// ─── PRUEBA A: MÉTODOS PRIVADOS EXCLUIDOS ────────────────────

console.log('\n📌 PRUEBA A: Métodos privados excluidos');
console.log('   contextService:');

const contextInfo = analyzer.analyze('contextService');

const hasGetContext = contextInfo.publicMethods.includes('getContext');
const hasGetHistory = contextInfo.publicMethods.includes('_getHistory');
const hasBuildRecovery = contextInfo.publicMethods.includes('_buildRecoveryTasks');
const hasConstructor = contextInfo.publicMethods.includes('constructor');

console.log(`  ✅ getContext presente: ${hasGetContext}`);
console.log(`  ❌ _getHistory ausente: ${!hasGetHistory}`);
console.log(`  ❌ _buildRecoveryTasks ausente: ${!hasBuildRecovery}`);
console.log(`  ❌ constructor ausente: ${!hasConstructor}`);

const testAPassed = hasGetContext && !hasGetHistory && !hasBuildRecovery && !hasConstructor;
console.log(`  ${testAPassed ? '✅' : '❌'} PRUEBA A: ${testAPassed ? 'PASADA' : 'FALLADA'}`);

// ─── PRUEBA B: SIN DUPLICADOS ──────────────────────────────────

console.log('\n📌 PRUEBA B: Sin duplicados');

const hasInitialize = contextInfo.publicMethods.includes('initialize');
const hasAsyncInitialize = contextInfo.publicMethods.includes('async initialize');

console.log(`  initialize presente: ${hasInitialize}`);
console.log(`  async initialize ausente: ${!hasAsyncInitialize}`);

const testBPassed = hasInitialize && !hasAsyncInitialize;
console.log(`  ${testBPassed ? '✅' : '❌'} PRUEBA B: ${testBPassed ? 'PASADA' : 'FALLADA'}`);

// ─── PRUEBA C: CLASIFICACIÓN DE DEPENDENCIAS ──────────────────

console.log('\n📌 PRUEBA C: Clasificación de dependencias');
console.log('   memoryService:');

const memoryInfo = analyzer.analyze('memoryService');

console.log(`  Internal: ${memoryInfo.internalDependencies.join(', ')}`);
console.log(`  External: ${memoryInfo.externalDependencies.join(', ')}`);
console.log(`  Node: ${memoryInfo.nodeDependencies.join(', ')}`);

const hasFs = memoryInfo.nodeDependencies.includes('fs');
const hasPath = memoryInfo.nodeDependencies.includes('path');
const hasUrl = memoryInfo.nodeDependencies.includes('url');
const hasBetterSqlite3 = memoryInfo.externalDependencies.includes('better-sqlite3');
const hasLogger = memoryInfo.internalDependencies.includes('logger');
const hasEventBus = memoryInfo.internalDependencies.includes('eventBus');
const hasServiceInterface = memoryInfo.internalDependencies.includes('serviceInterface');

const testCPassed = hasFs && hasPath && hasUrl && hasBetterSqlite3 && hasLogger && hasEventBus && hasServiceInterface;
console.log(`  ${testCPassed ? '✅' : '❌'} PRUEBA C: ${testCPassed ? 'PASADA' : 'FALLADA'}`);

// ─── PRUEBA D: MÉTODOS PÚBLICOS CORRECTOS ────────────────────

console.log('\n📌 PRUEBA D: Métodos públicos correctos');
console.log(`  publicMethods (${contextInfo.publicMethods.length}):`);
console.log(`    ${contextInfo.publicMethods.slice(0, 6).join(', ')}${contextInfo.publicMethods.length > 6 ? '...' : ''}`);

const testDPassed = contextInfo.publicMethods.length > 0 && !contextInfo.publicMethods.includes('constructor');
console.log(`  ${testDPassed ? '✅' : '❌'} PRUEBA D: ${testDPassed ? 'PASADA' : 'FALLADA'}`);

// ─── RESUMEN ──────────────────────────────────────────────────

console.log('\n' + '=' .repeat(60));
console.log('\n📊 RESUMEN DE PRUEBAS:');
console.log(`  ${testAPassed ? '✅' : '❌'} PRUEBA A: Métodos privados excluidos`);
console.log(`  ${testBPassed ? '✅' : '❌'} PRUEBA B: Sin duplicados`);
console.log(`  ${testCPassed ? '✅' : '❌'} PRUEBA C: Clasificación de dependencias`);
console.log(`  ${testDPassed ? '✅' : '❌'} PRUEBA D: Métodos públicos correctos`);

const allPassed = testAPassed && testBPassed && testCPassed && testDPassed;

if (allPassed) {
  console.log('\n✅ ¡TODAS LAS PRUEBAS PASARON!');
  console.log('   Component Analyzer refinado correctamente.');
} else {
  console.log('\n⚠️ Algunas pruebas fallaron. Revisar la implementación.');
}

console.log('\n✅ Prueba completada');

await knowledgeService.shutdown();