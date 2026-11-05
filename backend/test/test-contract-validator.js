// backend/test/test-contract-validator.js

import knowledgeService from '../src/knowledge/index.js';
import { PublicContractService } from '../src/knowledge/publicContractService.js';
import { ContractValidator } from '../src/knowledge/ContractValidator.js';

console.log('🧪 PRUEBA DE CONTRACT VALIDATOR\n');

await knowledgeService.initialize();

const contractService = new PublicContractService(knowledgeService);
const validator = new ContractValidator(contractService);

// Validar todos los contratos
const result = validator.validateAll({
  ignoreComponents: ['skills', 'index'] // Ignorar los casos esperados
});

console.log('📊 RESULTADO:');
console.log(`  ✅ Válidos: ${result.summary.valid}`);
console.log(`  ❌ Inválidos: ${result.summary.invalid}`);
console.log(`  📝 Errores: ${result.totalErrors}`);
console.log(`  ${result.passed ? '✅' : '❌'} Estado: ${result.passed ? 'PASÓ' : 'FALLÓ'}`);

if (result.errors.length > 0) {
  console.log('\n❌ ERRORES:');
  for (const error of result.errors) {
    console.log(`  ${error.component}: ${error.errors.join(', ')}`);
  }
}

console.log('\n📋 INFORME:');
console.log(validator.generateReport());

await knowledgeService.shutdown();