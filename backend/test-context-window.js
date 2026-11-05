// backend/test-context-window.js
// Prueba simple de Context Window Manager

import contextWindowManager from './src/services/contextWindowManager.js';
import contextService from './src/services/contextService.js';

console.log('🧪 Probando Context Window Manager\n');
console.log('=' .repeat(60));

// Inicializar
await contextService.initialize();

const sessionId = `test_window_${Date.now()}`;

// Guardar algunos mensajes
import memoryService from './src/services/memoryService.js';
await memoryService.initialize();

for (let i = 0; i < 15; i++) {
  await memoryService.saveMessage(
    sessionId,
    i % 2 === 0 ? 'user' : 'assistant',
    i % 2 === 0 
      ? `Mensaje del usuario ${i+1}: ¿Cómo funciona el sistema?`
      : `Respuesta del asistente ${i+1}: El sistema funciona con múltiples agentes especializados.`
  );
}

// Obtener contexto
console.log('\n📥 Obteniendo contexto...');
const context = await contextService.getContext({ 
  sessionId, 
  query: '¿Cómo funciona el sistema?' 
});

console.log(`  Historial: ${context.history.length} mensajes`);

// Construir ventana
console.log('\n🪟 Construyendo ventana de contexto...');

// Ventana sin límite
const windowFull = contextWindowManager.buildWindow(context);
console.log(`  📊 Modo: ${windowFull.metadata.mode}`);
console.log(`  📊 Tokens estimados: ${windowFull.metadata.optimizedLength}`);
console.log(`  📊 Mensajes: ${windowFull.messages.length}`);

// Ventana con límite reducido
const windowOptimized = contextWindowManager.buildWindow(context, { maxTokens: 2000 });
console.log(`\n  📊 Modo: ${windowOptimized.metadata.mode}`);
console.log(`  📊 Original: ${windowOptimized.metadata.originalLength} tokens`);
console.log(`  📊 Optimizado: ${windowOptimized.metadata.optimizedLength} tokens`);
console.log(`  📊 Mensajes: ${windowOptimized.messages.length}`);
console.log(`  📊 Truncado: ${windowOptimized.metadata.truncated}`);
console.log(`  📊 Resumen usado: ${windowOptimized.metadata.summaryUsed}`);
console.log(`  📊 Componentes: ${windowOptimized.metadata.components.join(', ')}`);

if (windowOptimized.metadata.summaryUsed) {
  console.log(`  📝 Resumen: "${windowOptimized.summary}"`);
}

// Mostrar mensajes
console.log('\n📋 Mensajes en la ventana:');
for (const msg of windowOptimized.messages.slice(0, 5)) {
  const preview = msg.content.length > 60 
    ? msg.content.substring(0, 60) + '...' 
    : msg.content;
  console.log(`  ${msg.role}: ${preview}`);
}
if (windowOptimized.messages.length > 5) {
  console.log(`  ... y ${windowOptimized.messages.length - 5} mensajes más`);
}

console.log('\n' + '=' .repeat(60));
console.log('✅ Prueba completada');

await contextService.shutdown();
await memoryService.shutdown();