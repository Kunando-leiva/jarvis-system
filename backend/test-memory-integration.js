// backend/test-memory-integration.js
// 🧠 TEST DE INTEGRACIÓN CON REASONING SERVICE

import CognitiveMemoryService from './src/memory/cognitiveMemoryService.js';
import { ReasoningService } from './src/services/reasoningService.js';

// Mock de AI Provider para pruebas
const mockAIProvider = {
  chat: async ({ messages }) => {
    const userMessage = messages.find(m => m.role === 'user')?.content || '';
    return `Respuesta simulada para: "${userMessage}"`;
  }
};

// Mock de QueryPlanner
const mockQueryPlanner = {
  processQuery: async (query) => ({
    query,
    response: `Respuesta arquitectónica para: "${query}"`
  }),
  contractService: {
    getAllContracts: () => ({}),
    getContract: () => null
  },
  methodResolver: {
    findByName: () => null
  }
};

async function testIntegration() {
  console.log('\n🧠 =========================================');
  console.log('   TEST DE INTEGRACIÓN CON REASONING');
  console.log('   =========================================\n');

  try {
    // 1. Inicializar memoria cognitiva
    console.log('📦 1. Inicializando memoria cognitiva...');
    const cognitiveMemory = new CognitiveMemoryService({
      dbPath: './data/integration-memory.db'
    });
    await cognitiveMemory.initialize();
    console.log('   ✅ Memoria inicializada\n');

    // 2. Crear ReasoningService con memoria
    console.log('🔧 2. Creando ReasoningService con memoria...');
    const reasoning = new ReasoningService({
      aiProvider: mockAIProvider,
      queryPlanner: mockQueryPlanner,
      cognitiveMemoryService: cognitiveMemory,
      config: {
        enableCognitiveMemory: true,
        maxMemoriesPerQuery: 5,
        minMemoryImportance: 2
      }
    });
    await reasoning.initialize();
    console.log('   ✅ ReasoningService inicializado\n');

    // 3. Primera conversación - Guardar información
    console.log('💬 3. Primera conversación (guardando memoria)...');
    console.log('   👤 Usuario: "Mi proyecto se llama JARVIS"');
    
    const result1 = await reasoning.createPlan(
      'Mi proyecto se llama JARVIS',
      'session-123'
    );
    console.log('   ✅ Respuesta generada');
    console.log(`   📌 Memoria usada: ${result1.metadata.memoriesCount || 0}\n`);

    // 4. Segunda conversación - Recordar
    console.log('💬 4. Segunda conversación (recordando)...');
    console.log('   👤 Usuario: "¿Cómo se llama mi proyecto?"');
    
    const result2 = await reasoning.createPlan(
      '¿Cómo se llama mi proyecto?',
      'session-123'
    );
    console.log('   ✅ Respuesta generada');
    console.log(`   📌 Memoria usada: ${result2.metadata.memoriesCount || 0}\n`);

    // 5. Tercera conversación - Verificar que recuerda
    console.log('💬 5. Tercera conversación (verificación)...');
    console.log('   👤 Usuario: "¿Qué recuerdas sobre mi proyecto?"');
    
    const result3 = await reasoning.createPlan(
      '¿Qué recuerdas sobre mi proyecto?',
      'session-123'
    );
    console.log('   ✅ Respuesta generada');
    console.log(`   📌 Memoria usada: ${result3.metadata.memoriesCount || 0}\n`);

    // 6. Mostrar resumen
    console.log('📊 6. Resumen de la sesión:');
    const summary = await reasoning.summarizeConversation('session-123');
    console.log(summary);
    console.log('');

    // 7. Métricas
    console.log('📈 7. Métricas finales:');
    console.log(`   📌 Memoria cognitiva: ${cognitiveMemory.getMetrics().memoriesCount} registros`);
    console.log(`   📌 Estado: ${reasoning.getStatus().status}`);
    console.log(`   📌 Memoria disponible: ${reasoning.memoryInitialized}`);
    console.log('');

    console.log('✅ =========================================');
    console.log('   ¡INTEGRACIÓN EXITOSA! 🎉');
    console.log('   =========================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testIntegration();