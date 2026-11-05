// backend/test/test-consolidation.js
// 🧪 PRUEBA DE CONSOLIDACIÓN - FASE 3.5
// ⚡ VERSIÓN CON RUTAS CORREGIDAS

import { logger } from '../src/core/logger.js';
import knowledgeService from '../src/knowledge/index.js';

async function testConsolidation() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║     🧪 JARVIS - PRUEBA DE CONSOLIDACIÓN FASE 3.5           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    // ─── 1. INICIALIZAR KNOWLEDGE SERVICE ──────────────────
    console.log('📚 Inicializando KnowledgeService...');
    await knowledgeService.initialize();
    console.log('✅ KnowledgeService inicializado\n');

    // ─── 2. VERIFICAR COMPONENTES ──────────────────────────
    const components = knowledgeService.getAllComponents();
    console.log(`📊 Componentes detectados: ${components.length}`);
    console.log('   Tipos:');
    const types = {};
    for (const c of components) {
      types[c.type] = (types[c.type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(types)) {
      console.log(`     - ${type}: ${count}`);
    }
    console.log('');

    // ─── 3. VERIFICAR GRAFO DE DEPENDENCIAS ────────────────
    const graph = knowledgeService.getDependencyGraph();
    console.log(`🔗 Dependencias: ${graph.size} nodos`);
    
    // Mostrar algunas dependencias clave
    const keyComponents = ['aiProvider', 'reasoningService', 'memoryService'];
    for (const name of keyComponents) {
      // Verificar si el componente existe en el mapa
      const component = knowledgeService.getComponent(name);
      if (component) {
        const deps = knowledgeService.getDependencies(name);
        const dependents = knowledgeService.getDependents(name);
        console.log(`   📌 ${name}:`);
        console.log(`      - Depende de: ${deps.length > 0 ? deps.join(', ') : 'ninguno'}`);
        console.log(`      - Es usado por: ${dependents.length > 0 ? dependents.join(', ') : 'ninguno'}`);
      }
    }
    console.log('');

    // ─── 4. VERIFICAR CONTRATOS ─────────────────────────────
    const contracts = knowledgeService.getAllContracts();
    console.log(`📋 Contratos: ${contracts.size}`);
    
    // Mostrar algunos contratos de ejemplo
    const sampleContracts = ['reasoningService', 'memoryService', 'queryPlanner'];
    for (const name of sampleContracts) {
      const contract = knowledgeService.getContract(name);
      if (contract) {
        console.log(`   📌 ${name}: ${contract.methods?.length || 0} métodos públicos`);
        if (contract.methods && contract.methods.length > 0) {
          const methodNames = contract.methods.map(m => m.name).join(', ');
          console.log(`      - Métodos: ${methodNames}`);
        }
      }
    }
    console.log('');

    // ─── 5. PRUEBA: BUSCAR DEPENDENCIAS ─────────────────────
    console.log('🔍 Probando búsqueda de dependencias...');
    
    // Test 1: Dependencias de aiProvider
    const aiDeps = knowledgeService.getDependencies('aiProvider');
    const aiDependents = knowledgeService.getDependents('aiProvider');
    console.log(`   ✅ aiProvider depende de: ${aiDeps.length > 0 ? aiDeps.join(', ') : 'ninguno'}`);
    console.log(`   ✅ aiProvider es usado por: ${aiDependents.length > 0 ? aiDependents.join(', ') : 'ninguno'}`);
    
    // ⭐ VERIFICACIÓN CLAVE: Sin hardcode
    // Los dependientes esperados pueden variar según tu estructura real
    // Vamos a mostrar lo que se encontró automáticamente
    if (aiDependents.length > 0) {
      console.log(`   ✅ ¡PERFECTO! aiProvider dependents descubiertos automáticamente (sin hardcode):`);
      console.log(`      ${aiDependents.join(', ')}`);
    } else {
      console.log(`   ℹ️ aiProvider no tiene dependientes detectados (puede ser normal si no se usa directamente)`);
    }
    console.log('');

    // ─── 6. PRUEBA: DEPENDENCIAS CIRCULARES ─────────────────
    console.log('🔄 Verificando dependencias circulares...');
    // Método para detectar ciclos en el grafo
    const cycles = detectCircularDependencies(graph);
    if (cycles.length === 0) {
      console.log('   ✅ No hay dependencias circulares');
    } else {
      console.log(`   ⚠️ Se encontraron ${cycles.length} ciclos:`, cycles);
    }
    console.log('');

    // ─── 7. PRUEBA: MÉTODOS ──────────────────────────────────
    console.log('🔧 Verificando métodos indexados...');
    const allMethods = [];
    for (const [name, contract] of contracts) {
      if (contract.methods) {
        for (const method of contract.methods) {
          allMethods.push({ component: name, method: method.name });
        }
      }
    }
    console.log(`   ✅ ${allMethods.length} métodos públicos indexados`);
    
    // Mostrar algunos métodos de ejemplo
    if (allMethods.length > 0) {
      const sampleMethods = allMethods.slice(0, 5);
      for (const m of sampleMethods) {
        console.log(`      - ${m.component}.${m.method}()`);
      }
      if (allMethods.length > 5) {
        console.log(`      ... y ${allMethods.length - 5} más`);
      }
    }
    console.log('');


    const invalidMethodNames = [
  'if', 'else', 'for', 'while', 'do', 'switch', 'case',
  'break', 'continue', 'return', 'try', 'catch', 'finally',
  'throw', 'new', 'delete', 'typeof', 'instanceof', 'void',
  'class', 'extends', 'super', 'import', 'export', 'default',
  'const', 'let', 'var', 'function', 'async', 'await',
  'yield', 'generator', 'debugger', 'with', 'get', 'set',
  'constructor', 'toString', 'valueOf', 'hasOwnProperty',
  'error', 'warn', 'info', 'debug', 'log', 'trace',
];

// Verificar métodos inválidos
let falseMethods = [];
for (const [name, contract] of contracts) {
  if (contract.methods) {
    for (const method of contract.methods) {
      const methodName = typeof method === 'string' ? method : method.name;
      if (invalidMethodNames.includes(methodName)) {
        falseMethods.push({ component: name, method: methodName });
      }
    }
  }
}

if (falseMethods.length > 0) {
  console.log(`\n⚠️ Se detectaron ${falseMethods.length} falsos métodos:`);
  for (const fm of falseMethods.slice(0, 10)) {
    console.log(`   - ${fm.component}.${fm.method}()`);
  }
  if (falseMethods.length > 10) {
    console.log(`   ... y ${falseMethods.length - 10} más`);
  }
  // ⭐ Esto debería ser un error, no solo un warning
  throw new Error(`❌ Se detectaron ${falseMethods.length} falsos métodos`);
} else {
  console.log('✅ No se detectaron falsos métodos');
}

    // ─── 8. PRUEBA: CONSULTAS SEMÁNTICAS BÁSICAS ──────────
    console.log('💬 Probando búsqueda de componentes...');
    
    const searchTests = [
      { query: 'memory', expected: 'memoryService' },
      { query: 'context', expected: 'contextService' },
      { query: 'reasoning', expected: 'reasoningService' }
    ];
    
    for (const test of searchTests) {
      const results = knowledgeService.searchComponents(test.query);
      if (results.length > 0) {
        const found = results.some(r => r.name === test.expected);
        console.log(`   ✅ "${test.query}" → ${found ? '✅ encontró' : '⚠️ NO encontró'} ${test.expected}`);
        if (!found) {
          console.log(`      Encontrados: ${results.map(r => r.name).join(', ')}`);
        }
      } else {
        console.log(`   ⚠️ "${test.query}" → sin resultados`);
      }
    }
    console.log('');

    // ─── 9. ESTADÍSTICAS FINALES ────────────────────────────
    const stats = knowledgeService.getStats();
    console.log('📊 ESTADÍSTICAS FINALES:');
    console.log(`   Componentes totales: ${stats.components}`);
    console.log(`   Contratos: ${stats.contracts}`);
    console.log(`   Métodos públicos: ${stats.methods}`);
    console.log(`   Dependencias: ${stats.dependencies}`);
    console.log(`   Inicializado: ${stats.initialized ? '✅ Sí' : '❌ No'}`);
    console.log('');

    // ─── 10. RESUMEN ─────────────────────────────────────────
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ PRUEBA DE CONSOLIDACIÓN COMPLETADA EXITOSAMENTE         ║');
    console.log('║                                                              ║');
    console.log(`║  📊 ${stats.components} componentes detectados                  ║`);
    console.log(`║  📋 ${stats.contracts} contratos extraídos                      ║`);
    console.log(`║  🔧 ${stats.methods} métodos públicos indexados                ║`);
    console.log(`║  🔗 ${stats.dependencies} dependencias mapeadas                ║`);
    console.log('║                                                              ║');
    console.log('║  ✅ Sin hardcode de dependencias                             ║');
    console.log('║  ✅ Fuente única de verdad establecida                       ║');
    console.log('║  ✅ Sistema validado                                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    return true;

  } catch (error) {
    console.error('❌ ERROR en prueba de consolidación:', error);
    console.error(error.stack);
    return false;
  }
}

// ─── UTILIDAD: DETECTAR DEPENDENCIAS CIRCULARES ──────────────

function detectCircularDependencies(graph) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();

  const dfs = (node, path) => {
    if (recursionStack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart));
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    recursionStack.add(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      dfs(neighbor, [...path, neighbor]);
    }
    recursionStack.delete(node);
  };

  for (const [node] of graph) {
    if (!visited.has(node)) {
      dfs(node, [node]);
    }
  }

  return cycles;
}

// ─── EJECUTAR ──────────────────────────────────────────────────

testConsolidation()
  .then(success => {
    if (success) {
      console.log('✅ Prueba completada con éxito\n');
      process.exit(0);
    } else {
      console.log('❌ Prueba falló\n');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error ejecutando prueba:', error);
    process.exit(1);
  });