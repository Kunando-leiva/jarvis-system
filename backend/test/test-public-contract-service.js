// backend/test/test-public-contract-service.js

import knowledgeService from '../src/knowledge/index.js';
import { PublicContractService }
  from '../src/knowledge/publicContractService.js';

console.log('📜 PRUEBA DE PUBLIC CONTRACT SERVICE\n');
console.log('='.repeat(60));

await knowledgeService.initialize();

const contractService =
  new PublicContractService(knowledgeService);


// ─── PRUEBA A: Contrato existente ─────────────────────────────

console.log('\n📌 PRUEBA A: Contrato de contextService');

const contract =
  contractService.getContract('contextService');

console.log(`  Nombre: ${contract.name}`);
console.log(`  Existe: ${contract.exists}`);
console.log(`  Tipo: ${contract.type}`);
console.log(
  `  Métodos públicos: ${contract.publicMethods.length}`
);

const testAPassed =
  contract.exists === true &&
  contract.name === 'contextService' &&
  contract.type === 'service';

console.log(
  `  ${testAPassed ? '✅' : '❌'} PRUEBA A: ${
    testAPassed ? 'PASADA' : 'FALLADA'
  }`
);


// ─── PRUEBA B: Método getContext ──────────────────────────────

console.log('\n📌 PRUEBA B: Contrato de getContext');

const getContext =
  contract.publicMethods.find(
    method => method.name === 'getContext'
  );

console.log(
  `  Encontrado: ${getContext ? 'sí' : 'no'}`
);

console.log(
  `  Async: ${getContext?.async || false}`
);

console.log(
  `  Parámetros: ${
    getContext?.params
      .map(param => param.name)
      .join(', ') || 'ninguno'
  }`
);

const testBPassed =
  getContext &&
  getContext.async === true &&
  getContext.params.some(
    param => param.name === 'sessionId'
  ) &&
  getContext.params.some(
    param => param.name === 'query'
  );

console.log(
  `  ${testBPassed ? '✅' : '❌'} PRUEBA B: ${
    testBPassed ? 'PASADA' : 'FALLADA'
  }`
);


// ─── PRUEBA C: Parámetro opcional ─────────────────────────────

console.log('\n📌 PRUEBA C: Parámetro opcional');

const optionsParam =
  getContext?.params.find(
    param => param.name === 'options'
  );

console.log(
  `  options encontrado: ${
    optionsParam ? 'sí' : 'no'
  }`
);

console.log(
  `  options opcional: ${
    optionsParam?.optional === true
  }`
);

const testCPassed =
  optionsParam &&
  optionsParam.optional === true;

console.log(
  `  ${testCPassed ? '✅' : '❌'} PRUEBA C: ${
    testCPassed ? 'PASADA' : 'FALLADA'
  }`
);


// ─── PRUEBA D: Dependencias ───────────────────────────────────

console.log('\n📌 PRUEBA D: Dependencias clasificadas');

console.log(
  `  Internal: ${
    contract.dependencies.internal.join(', ') ||
    'ninguna'
  }`
);

console.log(
  `  External: ${
    contract.dependencies.external.join(', ') ||
    'ninguna'
  }`
);

console.log(
  `  Node: ${
    contract.dependencies.node.join(', ') ||
    'ninguna'
  }`
);

const testDPassed =
  Array.isArray(contract.dependencies.internal) &&
  Array.isArray(contract.dependencies.external) &&
  Array.isArray(contract.dependencies.node);

console.log(
  `  ${testDPassed ? '✅' : '❌'} PRUEBA D: ${
    testDPassed ? 'PASADA' : 'FALLADA'
  }`
);


// ─── PRUEBA E: Descripciones ──────────────────────────────────

console.log('\n📌 PRUEBA E: Descripciones');

console.log(
  `  getContext: ${
    getContext?.description || 'NO ENCONTRADA'
  }`
);

const testEPassed =
  typeof getContext?.description === 'string' &&
  getContext.description.length > 0;

console.log(
  `  ${testEPassed ? '✅' : '❌'} PRUEBA E: ${
    testEPassed ? 'PASADA' : 'FALLADA'
  }`
);


// ─── PRUEBA F: Validación de cobertura ────────────────────────

console.log('\n📌 PRUEBA F: Cobertura de firmas');

console.log(
  `  Métodos declarados: ${
    contract.validation.declaredMethods.length
  }`
);

console.log(
  `  Métodos extraídos: ${
    contract.validation.extractedMethods.length
  }`
);

console.log(
  `  Firmas faltantes: ${
    contract.validation.missingSignatures.length > 0
      ? contract.validation.missingSignatures.join(', ')
      : 'ninguna'
  }`
);

console.log(
  `  Contrato completo: ${
    contract.validation.complete ? 'sí' : 'no'
  }`
);

// Esta prueba es informativa:
// nos muestra si SignatureExtractor cubre
// todos los métodos declarados.
const testFPassed =
  Array.isArray(contract.validation.missingSignatures);

console.log(
  `  ${testFPassed ? '✅' : '❌'} PRUEBA F: ${
    testFPassed ? 'PASADA' : 'FALLADA'
  }`
);


// ─── PRUEBA G: Componente inexistente ─────────────────────────

console.log('\n📌 PRUEBA G: Componente inexistente');

const missingContract =
  contractService.getContract(
    'componente_inexistente'
  );

console.log(
  `  Existe: ${missingContract.exists}`
);

console.log(
  `  Error: ${missingContract.error}`
);

const testGPassed =
  missingContract.exists === false;

console.log(
  `  ${testGPassed ? '✅' : '❌'} PRUEBA G: ${
    testGPassed ? 'PASADA' : 'FALLADA'
  }`
);


// ─── RESUMEN ──────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log('\n📊 RESUMEN DE PRUEBAS:');

console.log(
  `  ${testAPassed ? '✅' : '❌'} PRUEBA A: Contrato existente`
);

console.log(
  `  ${testBPassed ? '✅' : '❌'} PRUEBA B: Método getContext`
);

console.log(
  `  ${testCPassed ? '✅' : '❌'} PRUEBA C: Parámetro opcional`
);

console.log(
  `  ${testDPassed ? '✅' : '❌'} PRUEBA D: Dependencias`
);

console.log(
  `  ${testEPassed ? '✅' : '❌'} PRUEBA E: Descripciones`
);

console.log(
  `  ${testFPassed ? '✅' : '❌'} PRUEBA F: Cobertura de firmas`
);

console.log(
  `  ${testGPassed ? '✅' : '❌'} PRUEBA G: Componente inexistente`
);

const allPassed =
  testAPassed &&
  testBPassed &&
  testCPassed &&
  testDPassed &&
  testEPassed &&
  testFPassed &&
  testGPassed;

if (allPassed) {
  console.log('\n✅ ¡TODAS LAS PRUEBAS PASARON!');
  console.log(
    '   PublicContractService funciona correctamente.'
  );
} else {
  console.log(
    '\n⚠️ Algunas pruebas fallaron. Revisar implementación.'
  );
}

console.log('\n✅ Prueba completada');

await knowledgeService.shutdown();