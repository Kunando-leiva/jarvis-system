// backend/test/test-parse-params.js
// Prueba específica de parsing de parámetros

import { SignatureExtractor } from '../src/knowledge/signatureExtractor.js';

const extractor = new SignatureExtractor(null);

// Casos de prueba
const testCases = [
  {
    input: 'sessionId, query, options = {}',
    expected: ['sessionId', 'query', 'options']
  },
  {
    input: '{ sessionId, query, options }',
    expected: ['sessionId', 'query', 'options']
  },
  {
    input: 'options = {}',
    expected: ['options']
  },
  {
    input: 'sessionId',
    expected: ['sessionId']
  },
  {
    input: '{ sessionId, query }',
    expected: ['sessionId', 'query']
  }
];

console.log('🧪 PRUEBA DE PARSING DE PARÁMETROS\n');

for (const testCase of testCases) {
  const result = extractor._parseParams(testCase.input);
  const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);
  console.log(`📌 "${testCase.input}"`);
  console.log(`  Resultado: [${result.join(', ')}]`);
  console.log(`  Esperado: [${testCase.expected.join(', ')}]`);
  console.log(`  ${passed ? '✅' : '❌'} ${passed ? 'PASADA' : 'FALLADA'}\n`);
}