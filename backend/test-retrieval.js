// backend/test-retrieval.js
// Prueba rápida de RetrievalPolicy

// 🔥 IMPORTACIÓN CORRECTA
import retrievalPolicy from './src/services/retrievalPolicy.js';

console.log('🧪 Probando RetrievalPolicy\n');
console.log('=' .repeat(60));

// Verificar que el objeto existe
console.log('📌 Tipo de retrievalPolicy:', typeof retrievalPolicy);
console.log('📌 Métodos disponibles:', Object.keys(retrievalPolicy));

const testQueries = [
  { query: 'Necesito un plan estratégico para mi cuenta', expected: 'planning' },
  { query: 'Ayúdame a planificar el contenido de la semana', expected: 'planning' },
  { query: 'Quiero una estrategia para Instagram', expected: 'planning' },
  { query: 'Ejecuta la publicación del video', expected: 'execution' },
  { query: 'Haz el análisis de la cuenta', expected: 'account_analysis' }, // no 'execution'
  { query: 'Crear el contenido para Instagram', expected: 'content_publishing' }, // no 'execution'
  { query: 'Analiza mi cuenta de Instagram', expected: 'account_analysis' },
  { query: 'Hola, ¿cómo estás?', expected: 'conversation' },
  { query: 'Gracias por la ayuda', expected: 'conversation' }, // no 'simple'
];

console.log('\n📋 Ejecutando pruebas...\n');

for (const test of testQueries) {
  try {
    const plan = retrievalPolicy.getPlan(test.query);
    const result = plan.taskType === test.expected ? '✅' : '⚠️';
    console.log(`${result} "${test.query}" → ${plan.taskType} (esperado: ${test.expected})`);
  } catch (error) {
    console.log(`❌ Error en "${test.query}": ${error.message}`);
  }
}

console.log('\n' + '=' .repeat(60));

try {
  const stats = retrievalPolicy.getMetrics();
  console.log('\n📊 Estadísticas:');
  console.log(`  Planes: ${stats.totalPlans}`);
  console.log(`  Tipos de tarea: ${stats.totalTaskTypes}`);
  console.log(`  Estado: ${retrievalPolicy.getStatus().status}`);
} catch (error) {
  console.log('❌ Error obteniendo estadísticas:', error.message);
}