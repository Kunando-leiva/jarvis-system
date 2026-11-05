// backend/scripts/validate-contracts.js
// 🔒 VALIDACIÓN CONTINUA DE CONTRATOS - Para CI/CD

import knowledgeService from '../src/knowledge/index.js';
import { PublicContractService } from '../src/knowledge/publicContractService.js';
import { ContractValidator } from '../src/knowledge/ContractValidator.js';

console.log('🔒 VALIDACIÓN CONTINUA DE CONTRATOS\n');
console.log('=' .repeat(60));

await knowledgeService.initialize();

const contractService = new PublicContractService(knowledgeService);
const validator = new ContractValidator(contractService);

// Validar todos los contratos
const result = validator.validateAll({
  throwOnError: false,
  ignoreComponents: ['skills', 'index'] // Casos esperados
});

console.log(`\n📊 RESULTADO DE VALIDACIÓN:`);
console.log(`  Componentes: ${result.totalComponents}`);
console.log(`  ✅ Válidos: ${result.summary.valid}`);
console.log(`  ❌ Inválidos: ${result.summary.invalid}`);
console.log(`  ⚠️ Advertencias: ${result.summary.withWarnings}`);
console.log(`  📝 Errores totales: ${result.totalErrors}`);
console.log(`  ${result.passed ? '✅' : '❌'} Estado: ${result.passed ? 'PASÓ' : 'FALLÓ'}`);

if (result.errors.length > 0) {
  console.log('\n❌ ERRORES ENCONTRADOS:');
  for (const error of result.errors) {
    console.log(`  ${error.component}: ${error.errors.join(', ')}`);
  }
  process.exit(1);
}

console.log('\n✅ VALIDACIÓN COMPLETA - TODOS LOS CONTRATOS VÁLIDOS');
process.exit(0);

await knowledgeService.shutdown();