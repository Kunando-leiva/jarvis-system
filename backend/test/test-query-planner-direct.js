// backend/test/test-query-planner-direct.js
// 🔍 Prueba directa del QueryPlanner

import knowledgeService from '../src/knowledge/index.js';
import { PublicContractService } from '../src/knowledge/publicContractService.js';
import { DependencyResolver } from '../src/resolvers/dependencyResolver.js';
import { MethodResolver } from '../src/resolvers/methodResolver.js';
import { ImpactResolver } from '../src/resolvers/impactResolver.js';
import { QueryPlanner } from '../src/services/queryPlanner.js';

console.log('🔍 PRUEBA DIRECTA DEL QUERY PLANNER\n');
console.log('=' .repeat(60));

await knowledgeService.initialize();

const contractService = new PublicContractService(knowledgeService);
const depResolver = new DependencyResolver(contractService);
const methodResolver = new MethodResolver(contractService);
const impactResolver = new ImpactResolver(depResolver, methodResolver, contractService);

const queryPlanner = new QueryPlanner({
  knowledgeQueryService: null,
  dependencyResolver: depResolver,
  methodResolver: methodResolver,
  impactResolver: impactResolver
});
await queryPlanner.initialize();

const queries = [
  '¿Quién usa aiProvider?',
  '¿Qué métodos tiene contextService?',
  '¿Cuál es el impacto de cambiar memoryService?'
];

for (const query of queries) {
  console.log(`\n📌 "${query}"`);
  try {
    const result = await queryPlanner.processQuery(query);
    console.log(`  Intención: ${result.intent}`);
    console.log(`  Resolver: ${result.metadata.resolverUsed}`);
    console.log(`  Success: ${result.data?.success !== undefined ? result.data.success : 'N/A'}`);
    console.log(`  Response: ${result.response ? result.response.substring(0, 150) + '...' : 'No hay respuesta'}`);
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
}

console.log('\n✅ Prueba completada');

await queryPlanner.shutdown();
await knowledgeService.shutdown();