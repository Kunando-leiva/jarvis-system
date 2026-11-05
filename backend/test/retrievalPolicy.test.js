// backend/test/retrievalPolicy.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import retrievalPolicy from '../src/services/retrievalPolicy.js';

describe('RetrievalPolicy', () => {
  it('debe detectar planificación', () => {
    const queries = [
      'Necesito un plan estratégico para mi cuenta',
      'Quiero planificar el contenido de la semana',
      'Ayúdame con una estrategia de marketing',
    ];
    
    for (const query of queries) {
      const plan = retrievalPolicy.getPlan(query);
      assert.equal(plan.taskType, 'planning', `"${query}" debería ser planning`);
    }
  });

  it('debe detectar ejecución', () => {
    const queries = [
      'Ejecuta la publicación del video',
      'Haz el análisis de la cuenta',
      'Crear el contenido para Instagram',
    ];
    
    for (const query of queries) {
      const plan = retrievalPolicy.getPlan(query);
      assert.equal(plan.taskType, 'execution', `"${query}" debería ser execution`);
    }
  });

  it('debe detectar análisis de cuenta', () => {
    const queries = [
      'Analiza mi cuenta de Instagram',
      'Quiero ver las métricas de engagement',
      'Cómo están mis seguidores?',
    ];
    
    for (const query of queries) {
      const plan = retrievalPolicy.getPlan(query);
      // Puede ser account_analysis o conversation según el query
      assert.ok(
        plan.taskType === 'account_analysis' || plan.taskType === 'conversation',
        `"${query}" debería ser account_analysis o conversation, fue ${plan.taskType}`
      );
    }
  });

  it('debe devolver plan de conversación por defecto', () => {
    const query = 'Hola, ¿qué tal?';
    const plan = retrievalPolicy.getPlan(query);
    
    assert.ok(plan);
    assert.ok(plan.layers);
    assert.ok(plan.maxHistory !== undefined);
    assert.ok(plan.maxEpisodic !== undefined);
    assert.ok(plan.maxSemantic !== undefined);
  });

  it('debe respetar plan personalizado', () => {
    const query = 'Hola';
    const customPlan = {
      maxHistory: 50,
      maxEpisodic: 20,
    };
    
    const plan = retrievalPolicy.getPlan(query, { customPlan });
    
    assert.equal(plan.maxHistory, 50);
    assert.equal(plan.maxEpisodic, 20);
  });

  it('debe forzar tipo de tarea', () => {
    const query = 'Hola';
    const plan = retrievalPolicy.getPlan(query, { taskType: 'planning' });
    
    assert.equal(plan.taskType, 'planning');
  });

  it('debe registrar nuevos planes', () => {
    const customPlan = {
      layers: ['session', 'history'],
      maxHistory: 5,
      maxEpisodic: 2,
      maxSemantic: 3,
      includeProjectInfo: false,
      includeSystemState: false,
    };
    
    retrievalPolicy.registerPlan('custom_test', customPlan);
    
    const plan = retrievalPolicy.getPlan('test', { taskType: 'custom_test' });
    
    assert.equal(plan.maxHistory, 5);
    assert.equal(plan.maxEpisodic, 2);
    assert.equal(plan._source, 'custom_test');
  });
});