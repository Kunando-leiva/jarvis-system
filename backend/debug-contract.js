import knowledgeService from './src/knowledge/index.js';
import { PublicContractService } from './src/knowledge/publicContractService.js';

await knowledgeService.initialize();

const contractService = new PublicContractService(knowledgeService);

console.log('🔍 Verificando contratos de varios componentes:\n');

const testComponents = ['memoryService', 'aiProvider', 'reasoningService', 'queryPlanner'];

for (const name of testComponents) {
  const contract = contractService.getContract(name);
  console.log(`📌 ${name}:`);
  console.log(`  exists: ${contract.exists}`);
  console.log(`  type: ${contract.type || 'unknown'}`);
  console.log(`  methods: ${contract.publicMethods?.length || 0}`);
  if (contract.publicMethods?.length > 0) {
    console.log(`  list: ${contract.publicMethods.map(m => m.name).join(', ')}`);
  }
  console.log('');
}
