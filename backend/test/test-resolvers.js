// backend/test/test-resolvers.js

import knowledgeService from '../src/knowledge/index.js';
import { PublicContractService } from '../src/knowledge/publicContractService.js';
import { DependencyResolver } from '../src/resolvers/dependencyResolver.js';
import { MethodResolver } from '../src/resolvers/methodResolver.js';

console.log('🔗 PRUEBA DE RESOLVERS - CAPA 2\n');
console.log('=' .repeat(60));

await knowledgeService.initialize();

const contractService = new PublicContractService(knowledgeService);

// ─── DEPENDENCY RESOLVER ──────────────────────────────────────

console.log('\n📌 DEPENDENCY RESOLVER:');
const depResolver = new DependencyResolver(contractService);

// ¿Quién usa memoryService?
const dependents = depResolver.findDependents('memoryService');
console.log(`  "memoryService" es usado por: ${dependents.dependents.map(d => d.name).join(', ') || 'ninguno'}`);

// Dependencias de contextService
const deps = depResolver.findDependencies('contextService');
console.log(`  "contextService" depende de: ${deps.dependencies.internal.join(', ') || 'ninguna'}`);

// Dependencias circulares
const cycles = depResolver.findCircularDependencies();
console.log(`  Dependencias circulares: ${cycles.count}`);

// ─── METHOD RESOLVER ──────────────────────────────────────────

console.log('\n📌 METHOD RESOLVER:');
const methodResolver = new MethodResolver(contractService);

// Buscar métodos por nombre
const byName = methodResolver.findByName('getContext');
console.log(`  "getContext" encontrado en: ${byName.results.map(r => r.component).join(', ')}`);

// Buscar por patrón
const byPattern = methodResolver.findByPattern('^get');
console.log(`  Métodos que comienzan con "get": ${byPattern.totalMatches} en ${byPattern.count} componentes`);

// Buscar por tipo (async)
const byType = methodResolver.findByType('async');
console.log(`  Métodos async: ${byType.totalMatches} en ${byType.count} componentes`);

console.log('\n✅ Prueba completada');

await knowledgeService.shutdown();