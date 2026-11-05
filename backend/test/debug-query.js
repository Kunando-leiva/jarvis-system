// debug-query.js
import knowledgeService from './src/knowledge/index.js';
import { PublicContractService } from './src/knowledge/publicContractService.js';
import { DependencyResolver } from './src/resolvers/dependencyResolver.js';
import { MethodResolver } from './src/resolvers/methodResolver.js';
import { ImpactResolver } from './src/resolvers/impactResolver.js';
import { QueryPlanner } from './src/services/queryPlanner.js';

console.log('🔍 DEBUG COMPLETO DE QUERYPLANNER\n');

await knowledgeService.initialize();

const contractService = new PublicContractService(knowledgeService);
const depResolver = new DependencyResolver(knowledgeService);
depResolver.initialize();
const methodResolver = new MethodResolver(contractService);
const impactResolver = new ImpactResolver(depResolver, methodResolver, contractService);

const queryPlanner = new QueryPlanner({
  knowledgeService: knowledgeService,
  knowledgeQueryService: null,
  dependencyResolver: depResolver,
  methodResolver: methodResolver,
  impactResolver: impactResolver,
  contractService: contractService
});

console.log('✅ QueryPlanner creado');
console.log('  contractService:', queryPlanner.contractService ? '✅' : '❌');
console.log('  knowledgeService:', queryPlanner.knowledgeService ? '✅' : '❌');

// Lista de componentes para probar
const testComponents = ['queryPlanner', 'memoryService', 'aiProvider', 'reasoningService'];

for (const comp of testComponents) {
  console.log(`\n📌 Probando: ${comp}`);
  
  const contract = contractService.getContract(comp);
  console.log(`  contract.exists: ${contract.exists}`);
  
  if (contract.exists) {
    const methods = contract.publicMethods || [];
    console.log(`  métodos: ${methods.length}`);
    if (methods.length > 0) {
      console.log(`  lista: ${methods.map(m => m.name).join(', ')}`);
    }
  }
  
  // Probar _handleComponentMethods
  const result = await queryPlanner._handleComponentMethods({ components: [comp] });
  if (result.success) {
    const methods = result.data.methods || [];
    console.log(`  ✅ _handleComponentMethods: ${methods.length} métodos`);
  } else {
    console.log(`  ❌ _handleComponentMethods: ${result.error}`);
  }
}

console.log('\n✅ DEBUG COMPLETADO');