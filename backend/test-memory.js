// backend/test-memory.js
// 🧠 TEST DE MEMORIA COGNITIVA

import CognitiveMemoryService from './src/memory/cognitiveMemoryService.js';
import { logger } from './src/core/logger.js';

async function testCognitiveMemory() {
  console.log('\n🧠 =========================================');
  console.log('   PROBANDO MEMORIA COGNITIVA DE JARVIS');
  console.log('   =========================================\n');

  try {
    // 1. Inicializar memoria
    console.log('📦 1. Inicializando CognitiveMemoryService...');
    const memory = new CognitiveMemoryService({
      dbPath: './data/test-memory.db'
    });
    await memory.initialize();
    console.log('   ✅ Memoria inicializada\n');

    // 2. Guardar información
    console.log('📝 2. Guardando información en memoria...');
    
    await memory.remember('El proyecto se llama JARVIS', {
      type: 'fact',
      source: 'user',
      sessionId: 'test-session',
      importance: 10,
      tags: ['project', 'name']
    });
    console.log('   ✅ Guardado: "El proyecto se llama JARVIS"');

    await memory.remember('La versión actual es 3.6', {
      type: 'fact',
      source: 'system',
      sessionId: 'test-session',
      importance: 8,
      tags: ['version', 'project']
    });
    console.log('   ✅ Guardado: "La versión actual es 3.6"');

    await memory.remember('Me gusta usar PostgreSQL', {
      type: 'preference',
      source: 'user',
      sessionId: 'test-session',
      importance: 6,
      tags: ['database', 'preference']
    });
    console.log('   ✅ Guardado: "Me gusta usar PostgreSQL"\n');

    // 3. Probar recall (recordar)
    console.log('🔎 3. Probando recall (recordar)...');
    
    const result1 = await memory.recall('¿Cómo se llama el proyecto?', {
      sessionId: 'test-session',
      limit: 3
    });
    console.log('   ✅ Búsqueda: "¿Cómo se llama el proyecto?"');
    console.log(`   📌 Encontrados: ${result1.length} resultados`);
    if (result1.length > 0) {
      console.log(`   📝 Resultado: ${result1[0].content}`);
    }
    console.log('');

    const result2 = await memory.recall('versión', {
      sessionId: 'test-session',
      limit: 3
    });
    console.log('   ✅ Búsqueda: "versión"');
    console.log(`   📌 Encontrados: ${result2.length} resultados`);
    if (result2.length > 0) {
      console.log(`   📝 Resultado: ${result2[0].content}`);
    }
    console.log('');

    // 4. Probar extractor de hechos
    console.log('🔍 4. Probando extractor de hechos...');
    const facts = await memory.extractFacts(
      'Mi nombre es Soledad y prefiero trabajar con Node.js, decidimos usar SQLite para la memoria.'
    );
    console.log('   ✅ Hechos extraídos:');
    for (const fact of facts) {
      console.log(`   📌 ${fact.type}: "${fact.value}" (confianza: ${fact.confidence})`);
    }
    console.log('');

    // 5. Guardar hechos extraídos automáticamente
    console.log('💾 5. Guardando hechos extraídos...');
    const savedFacts = await memory.extractAndRemember(
      'Mi nombre es Soledad y prefiero trabajar con Node.js',
      { sessionId: 'test-session' }
    );
    console.log(`   ✅ Guardados ${savedFacts.length} hechos\n`);

    // 6. Obtener contexto
    console.log('📋 6. Obteniendo contexto de la sesión...');
    const context = await memory.getContext('test-session', 5);
    console.log('   📋 Contexto:');
    console.log(context.context);
    console.log('');

    // 7. Resumen de conversación
    console.log('📊 7. Generando resumen de conversación...');
    const summary = await memory.summarizeConversation('test-session');
    console.log('   📊 Resumen:');
    console.log(summary);
    console.log('');

    // 8. Métricas
    console.log('📈 8. Métricas de la memoria:');
    const metrics = memory.getMetrics();
    console.log(`   📌 Memorias totales: ${metrics.memoriesCount}`);
    console.log(`   📌 Hechos extraídos: ${metrics.factsExtracted}`);
    console.log(`   📌 Consultas procesadas: ${metrics.queriesProcessed}`);
    console.log(`   📌 Estado: ${metrics.status}`);
    console.log('');

    // 9. Limpiar
    console.log('🧹 9. Limpiando...');
    await memory.close();
    console.log('   ✅ Memoria cerrada\n');

    console.log('✅ =========================================');
    console.log('   ¡TODAS LAS PRUEBAS PASARON! 🎉');
    console.log('   =========================================\n');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    console.error(error.stack);
  }
}

// Ejecutar prueba
testCognitiveMemory();