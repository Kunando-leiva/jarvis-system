// test/debug-queryplanner.js
import { KnowledgeService } from '../src/knowledge/index.js';
import { QueryPlanner } from '../src/services/queryPlanner.js';
import { DependencyResolver } from '../src/resolvers/dependencyResolver.js';
import { MethodResolver } from '../src/resolvers/methodResolver.js';
import { ImpactResolver } from '../src/resolvers/impactResolver.js';
import { PublicContractService } from '../src/knowledge/publicContractService.js';
import { KnowledgeQueryService } from '../src/services/knowledgeQueryService.js';

console.log('🔍 DEBUG - QueryPlanner Test\n');

// Inicializar servicios
const knowledgeService = new KnowledgeService();
await knowledgeService.initialize();

const contractService = new PublicContractService(knowledgeService);
const methodResolver = new MethodResolver(contractService);
const dependencyResolver = new DependencyResolver(knowledgeService);
const impactResolver = new ImpactResolver(dependencyResolver, methodResolver, contractService);
const knowledgeQuery = new KnowledgeQueryService(knowledgeService, contractService);

const queryPlanner = new QueryPlanner({
  knowledgeService,
  knowledgeQueryService: knowledgeQuery,
  dependencyResolver,
  methodResolver,
  impactResolver
});
await queryPlanner.initialize();

console.log('📊 Testing _extractEntities with "reasoningService":\n');

// Probar _extractEntities directamente
const testQueries = [
  '¿Qué métodos tiene reasoningService?',
  'reasoningService',
  'contextService',
  '¿Quién usa aiProvider?'
];

for (const query of testQueries) {
  console.log(`\n--- Query: "${query}" ---`);
  const entities = queryPlanner._extractEntities(query);
  console.log('Entities found:', JSON.stringify(entities, null, 2));
}