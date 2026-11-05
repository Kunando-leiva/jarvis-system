import knowledgeService from './src/knowledge/index.js';
import { QueryPlanner } from './src/services/queryPlanner.js';
import { PublicContractService } from './src/knowledge/publicContractService.js';

await knowledgeService.initialize();

console.log('🔍 1. Métodos reales de QueryPlanner (sin KnowledgeService):');
const qp = new QueryPlanner({
  knowledgeService: null,
  knowledgeQueryService: null,
  dependencyResolver: null,
  methodResolver: null,
  impactResolver: null,
  contractService: null
});

const allMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(qp));
const publicMethods = allMethods.filter(m => m !== 'constructor' && !m.startsWith('_'));
const privateMethods = allMethods.filter(m => m !== 'constructor' && m.startsWith('_'));

console.log('  Métodos públicos:', publicMethods.join(', ') || 'ninguno');
console.log('  Métodos privados:', privateMethods.slice(0, 10).join(', ') + (privateMethods.length > 10 ? '...' : ''));

console.log('\n🔍 2. Contrato registrado para queryPlanner:');
const contractService = new PublicContractService(knowledgeService);
const contract = contractService.getContract('queryPlanner');
console.log('  exists:', contract.exists);
console.log('  publicMethods:', contract.publicMethods?.map(m => m.name).join(', ') || 'ninguno');
console.log('  type:', contract.type);

console.log('\n🔍 3. Todos los contratos disponibles:');
const allContracts = knowledgeService.getAllContracts();
const contractNames = Object.keys(allContracts);
console.log('  Total contratos:', contractNames.length);
const qpContract = contractNames.find(n => n.toLowerCase().includes('queryplanner'));
console.log('  queryPlanner en contratos:', qpContract || 'NO ENCONTRADO');

console.log('\n🔍 4. Componentes en KnowledgeService:');
const components = knowledgeService.getAllComponents();
const qpComponent = components.find(c => c.name === 'queryPlanner');
console.log('  queryPlanner existe:', !!qpComponent);
if (qpComponent) {
  console.log('  dependencies:', qpComponent.dependencies?.length || 0);
  console.log('  methods:', qpComponent.methods?.length || 0);
  console.log('  methods list:', qpComponent.methods?.join(', ') || 'ninguno');
}
