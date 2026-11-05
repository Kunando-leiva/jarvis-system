// backend/test/test-missing-methods.js
// 🔬 Diagnóstico de métodos faltantes

import knowledgeService from '../src/knowledge/index.js';
import { SignatureExtractor } from '../src/knowledge/signatureExtractor.js';
import fs from 'fs';

console.log('🔬 DIAGNÓSTICO DE MÉTODOS FALTANTES\n');
console.log('=' .repeat(70));

await knowledgeService.initialize();

const extractor = new SignatureExtractor(knowledgeService);

// Lista de componentes con métodos faltantes
const missingCases = [
  { component: 'retrievalPolicy', method: 'getPlan' },
  { component: 'memoryService', method: 'saveMessage' },
  { component: 'contextWindowManager', method: 'buildWindow' },
  { component: 'contentCreatorAgent', method: 'buildPrompt' }
];

for (const testCase of missingCases) {
  console.log(`\n📌 ${testCase.component} - ${testCase.method}`);
  console.log('-'.repeat(40));
  
  // Analizar el componente
  const result = extractor.extract(testCase.component);
  const filePath = result.path;
  
  if (!filePath) {
    console.log(`  ❌ No se encontró el archivo`);
    continue;
  }
  
  // Leer el archivo
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Buscar el método específico
  const lines = content.split('\n');
  let found = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(testCase.method) && line.includes('(')) {
      console.log(`  ✅ Encontrado en línea ${i+1}:`);
      console.log(`     ${line.trim()}`);
      
      // Mostrar contexto
      const contextLines = lines.slice(Math.max(0, i-2), Math.min(lines.length, i+3));
      console.log(`  Contexto:`);
      for (const ctx of contextLines) {
        console.log(`     ${ctx.trim()}`);
      }
      found = true;
      break;
    }
  }
  
  if (!found) {
    console.log(`  ❌ No se encontró el método en el archivo`);
  }
  
  // Verificar qué métodos detectó el extractor
  const signatures = result.signatures.map(s => s.name);
  console.log(`  Métodos detectados: ${signatures.join(', ')}`);
}

console.log('\n✅ Diagnóstico completado');

await knowledgeService.shutdown();