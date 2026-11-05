// backend/src/tests/test-method-validation.js
// 🧪 PRUEBA DE VALIDACIÓN DE MÉTODOS

import { isValidMethodName, filterValidMethods } from '../knowledge/methodValidator.js';

const testCases = [
  // Métodos válidos
  { name: 'createPlan', expected: true },
  { name: 'getMetrics', expected: true },
  { name: 'getStatus', expected: true },
  { name: '_handleArchitectureQuery', expected: true },
  { name: '_isArchitectureQuery', expected: true },
  { name: '_enrichWithKnowledge', expected: true },
  { name: '_extractEntitiesFromQuery', expected: true },
  
  // Métodos inválidos
  { name: 'if', expected: false },
  { name: 'for', expected: false },
  { name: 'catch', expected: false },
  { name: 'switch', expected: false },
  { name: 'try', expected: false },
  { name: 'return', expected: false },
  { name: 'const', expected: false },
  { name: 'let', expected: false },
  { name: 'var', expected: false },
  { name: 'error', expected: false },
  { name: 'warn', expected: false },
  { name: 'log', expected: false },
  { name: 'toString', expected: false },
  { name: 'constructor', expected: false },
  { name: '__proto__', expected: false },
  { name: 'a', expected: false }, // Muy corto
  { name: 'ab', expected: true }, // 2 letras pero válido
];

console.log('\n🧪 PRUEBA DE VALIDACIÓN DE MÉTODOS\n');

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = isValidMethodName(test.name);
  const status = result === test.expected ? '✅' : '❌';
  
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status} "${test.name}" → ${result} (esperado: ${test.expected})`);
}

console.log(`\n📊 Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log('❌ Prueba falló');
  process.exit(1);
} else {
  console.log('✅ Prueba pasó');
  process.exit(0);
}