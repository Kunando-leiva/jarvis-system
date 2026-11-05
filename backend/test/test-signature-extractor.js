// backend/test/test-signature-extractor.js
// Prueba de extracción de firmas

import knowledgeService from '../src/knowledge/index.js';
import { SignatureExtractor } from '../src/knowledge/signatureExtractor.js';

console.log('🧪 PRUEBA DE EXTRACCIÓN DE FIRMAS\n');
console.log('=' .repeat(60));

await knowledgeService.initialize();

const extractor = new SignatureExtractor(knowledgeService);

console.log('\n🔬 PRUEBA DEBUG: Parser de parámetros');

const debugParams = extractor._parseParams(
  '{ sessionId, query, options = {} }'
);

console.log('  Resultado:', debugParams);

const debugPassed =
  debugParams.length === 3 &&
  debugParams.includes('sessionId') &&
  debugParams.includes('query') &&
  debugParams.includes('options');

console.log(
  `  ${debugPassed ? '✅' : '❌'} Parser destructuring: ${
    debugPassed ? 'PASADO' : 'FALLADO'
  }`
);

// ─── PRUEBA A: Firma de contextService.getContext ────────────

console.log('\n📌 PRUEBA A: Firma de contextService.getContext');

const contextContract = extractor.extract('contextService');
const getContext = contextContract.signatures.find(s => s.name === 'getContext');

console.log(`  Nombre: ${getContext?.name || 'NO ENCONTRADO'}`);
console.log(`  Async: ${getContext?.async || false}`);
console.log(`  Parámetros: ${getContext?.params?.join(', ') || 'ninguno'}`);

const testAPassed = getContext && 
                     getContext.name === 'getContext' &&
                     getContext.async === true &&
                     getContext.params.includes('sessionId') &&
                     getContext.params.includes('query');

console.log(`  ${testAPassed ? '✅' : '❌'} PRUEBA A: ${testAPassed ? 'PASADA' : 'FALLADA'}`);

// ─── PRUEBA B: Métodos privados excluidos ────────────────────

console.log('\n📌 PRUEBA B: Métodos privados excluidos');

const hasGetHistory = contextContract.signatures.some(s => s.name === '_getHistory');
const hasBuildRecovery = contextContract.signatures.some(s => s.name === '_buildRecoveryTasks');
const hasConstructor = contextContract.signatures.some(s => s.name === 'constructor');

console.log(`  _getHistory: ${hasGetHistory ? '❌ PRESENTE' : '✅ ausente'}`);
console.log(`  _buildRecoveryTasks: ${hasBuildRecovery ? '❌ PRESENTE' : '✅ ausente'}`);
console.log(`  constructor: ${hasConstructor ? '❌ PRESENTE' : '✅ ausente'}`);

const testBPassed = !hasGetHistory && !hasBuildRecovery && !hasConstructor;
console.log(`  ${testBPassed ? '✅' : '❌'} PRUEBA B: ${testBPassed ? 'PASADA' : 'FALLADA'}`);

// ─── PRUEBA C: Parámetros opcionales ──────────────────────────

console.log('\n📌 PRUEBA C: Detección de parámetros opcionales');

// Buscar un método con parámetro opcional (options = {})
const hasOptionsParam = getContext?.params?.includes('options') || false;
console.log(`  options en getContext: ${hasOptionsParam ? '✅ detectado' : '❌ no detectado'}`);

const testCPassed = hasOptionsParam;
console.log(`  ${testCPassed ? '✅' : '❌'} PRUEBA C: ${testCPassed ? 'PASADA' : 'FALLADA'}`);

// ─── PRUEBA D: Sin duplicados ──────────────────────────────────

console.log('\n📌 PRUEBA D: Sin duplicados');

const methodNames = contextContract.signatures.map(s => s.name);
const duplicates = methodNames.filter((name, index) => methodNames.indexOf(name) !== index);
console.log(`  Duplicados: ${duplicates.length > 0 ? duplicates.join(', ') : 'ninguno'}`);

const testDPassed = duplicates.length === 0;
console.log(`  ${testDPassed ? '✅' : '❌'} PRUEBA D: ${testDPassed ? 'PASADA' : 'FALLADA'}`);

// ─── PRUEBA E: Firmas completas ────────────────────────────────

console.log('\n📌 PRUEBA E: Firmas completas de contextService');
console.log(`  Total de métodos públicos: ${contextContract.signatures.length}`);

const methodsList = contextContract.signatures
  .map(s => `${s.async ? 'async ' : ''}${s.name}(${s.params.join(', ')})`)
  .slice(0, 5);
console.log(`  Métodos: ${methodsList.join('; ')}${contextContract.signatures.length > 5 ? '...' : ''}`);

const testEPassed = contextContract.signatures.length > 0;
console.log(`  ${testEPassed ? '✅' : '❌'} PRUEBA E: ${testEPassed ? 'PASADA' : 'FALLADA'}`);

// ─── PRUEBA F: Solo métodos públicos reales ──────────────────

console.log('\n📌 PRUEBA F: Sin falsos positivos');

const invalidSignatures = contextContract.signatures.filter(
  signature => !contextContract.publicMethods.includes(signature.name)
);

console.log(
  `  Firmas inválidas: ${
    invalidSignatures.length > 0
      ? invalidSignatures.map(s => s.name).join(', ')
      : 'ninguna'
  }`
);

const testFPassed = invalidSignatures.length === 0;

console.log(
  `  ${testFPassed ? '✅' : '❌'} PRUEBA F: ${
    testFPassed ? 'PASADA' : 'FALLADA'
  }`
);

// ─── RESUMEN ──────────────────────────────────────────────────

console.log('\n' + '=' .repeat(60));
console.log('\n📊 RESUMEN DE PRUEBAS:');
console.log(`  ${testAPassed ? '✅' : '❌'} PRUEBA A: Firma de getContext`);
console.log(`  ${testBPassed ? '✅' : '❌'} PRUEBA B: Métodos privados excluidos`);
console.log(`  ${testCPassed ? '✅' : '❌'} PRUEBA C: Parámetros opcionales`);
console.log(`  ${testDPassed ? '✅' : '❌'} PRUEBA D: Sin duplicados`);
console.log(`  ${testEPassed ? '✅' : '❌'} PRUEBA E: Firmas completas`);
console.log(`  ${testFPassed ? '✅' : '❌'} PRUEBA F: Sin falsos positivos`);

const allPassed =
  testAPassed &&
  testBPassed &&
  testCPassed &&
  testDPassed &&
  testEPassed &&
  testFPassed;

if (allPassed) {
  console.log('\n✅ ¡TODAS LAS PRUEBAS PASARON!');
  console.log('   Signature Extractor funciona correctamente.');
} else {
  console.log('\n⚠️ Algunas pruebas fallaron. Revisar la implementación.');
}

console.log('\n✅ Prueba completada');

await knowledgeService.shutdown();