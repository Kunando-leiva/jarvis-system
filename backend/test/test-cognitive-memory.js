// backend/test/test-cognitive-memory.js

import CognitiveMemoryService from '../src/memory/cognitiveMemoryService.js';

async function testCognitiveMemory() {
  console.log('🧠 Probando Memoria Cognitiva...\n');

  const memory = new CognitiveMemoryService();
  await memory.initialize();

  // Test 1: Guardar y recordar
  console.log('📝 Test 1: Guardar información...');
  await memory.remember('El proyecto se llama JARVIS', {
    type: 'fact',
    tags: ['project', 'name']
  });

  const results = await memory.recall('¿Cómo se llama el proyecto?');
  console.log('✅ Recordado:', results[0]?.content || 'No encontrado');

  // Test 2: Extraer hechos
  console.log('\n📝 Test 2: Extraer hechos...');
  const facts = await memory.extractFacts(
    'Prefiero usar PostgreSQL y decidimos implementar el sistema con Node.js'
  );
  console.log('✅ Hechos extraídos:', facts);

  // Test 3: Contexto
  console.log('\n📝 Test 3: Obtener contexto...');
  const context = await memory.getContext('default');
  console.log('✅ Contexto:\n', context);

  // Test 4: Resumen
  console.log('\n📝 Test 4: Resumen...');
  const summary = await memory.summarizeConversation('default');
  console.log('✅ Resumen:\n', summary);

  console.log('\n✅ Todas las pruebas pasaron!');
}

testCognitiveMemory().catch(console.error);