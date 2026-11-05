// test/debug-impact.js
import { KnowledgeService } from '../src/knowledge/index.js';
import { DependencyResolver } from '../src/resolvers/dependencyResolver.js';
import { ImpactResolver } from '../src/resolvers/impactResolver.js';
import { PublicContractService } from '../src/knowledge/publicContractService.js';
import { MethodResolver } from '../src/resolvers/methodResolver.js';

console.log('🔍 DEBUG - Impact Resolver Test\n');

// Inicializar servicios
const knowledgeService = new KnowledgeService();
await knowledgeService.initialize();

const contractService = new PublicContractService(knowledgeService);
const methodResolver = new MethodResolver(contractService);
const dependencyResolver = new DependencyResolver(knowledgeService);
const impactResolver = new ImpactResolver(dependencyResolver, methodResolver, contractService);

console.log('📊 Testing dependencyResolver.findDependents():\n');

// Probar findDependents directamente
const testComponents = ['contextService', 'memoryService', 'aiProvider'];

for (const comp of testComponents) {
  console.log(`\n--- ${comp} ---`);
  const result = dependencyResolver.findDependents(comp);
  console.log('Success:', result.success);
  console.log('Data:', JSON.stringify(result.data, null, 2));
  console.log('Dependents:', result.data.dependents);
}

console.log('\n📊 Testing impactResolver.analyzeComponentImpact():\n');

for (const comp of testComponents) {
  console.log(`\n--- ${comp} ---`);
  const result = impactResolver.analyzeComponentImpact(comp);
  console.log('Success:', result.success);
  if (result.success) {
    console.log('Direct count:', result.data.impact.directCount);
    console.log('Dependents:', result.data.impact.dependencyTree);
  } else {
    console.log('Error:', result.error);
  }
}