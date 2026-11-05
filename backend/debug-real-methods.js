import { QueryPlanner } from './src/services/queryPlanner.js';

console.log('🔍 Métodos reales de QueryPlanner:\n');

const qp = new QueryPlanner({
  knowledgeService: null,
  knowledgeQueryService: null,
  dependencyResolver: null,
  methodResolver: null,
  impactResolver: null,
  contractService: null
});

// Obtener todos los métodos del prototipo
const allMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(qp));
const publicMethods = allMethods.filter(m => m !== 'constructor' && !m.startsWith('_'));
const privateMethods = allMethods.filter(m => m !== 'constructor' && m.startsWith('_'));

console.log('📋 Métodos públicos:');
publicMethods.forEach(m => console.log(`  ✅ ${m}`));

console.log('\n🔒 Métodos privados:');
privateMethods.forEach(m => console.log(`  🔒 ${m}`));

console.log(`\n📊 Total: ${publicMethods.length} públicos, ${privateMethods.length} privados`);
