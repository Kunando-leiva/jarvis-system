// backend/test/integration.test.js
// Pruebas de integración básicas - Fase 0

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { logger } from '../src/core/logger.js';
import memoryService from '../src/services/memoryService.js';
import reasoningService from '../src/services/reasoningService.js';
import executionService from '../src/services/executionService.js';

// Configurar timeout global para todas las pruebas
const TEST_TIMEOUT = 30000;

describe('Integración - Fase 0', { timeout: TEST_TIMEOUT }, () => {
  before(async () => {
    logger.info('[Test] Inicializando servicios...');
    
    // Inicializar memoryService si no está inicializado
    if (!memoryService.initialized) {
      await memoryService.initialize();
    }
    
    if (!reasoningService.initialized) {
      await reasoningService.initialize();
    }
    
    if (!executionService.initialized) {
      await executionService.initialize();
    }
    
    logger.info('[Test] Servicios inicializados');
  });

  after(async () => {
    logger.info('[Test] Limpiando...');
  });

  it('MemoryService debe estar inicializado', () => {
    const status = memoryService.getStatus();
    assert.ok(status.initialized, `MemoryService no inicializado. Status: ${status.status}`);
    assert.equal(status.status, 'online');
  });

  it('ReasoningService debe estar inicializado', () => {
    const status = reasoningService.getStatus();
    assert.ok(status.initialized, `ReasoningService no inicializado. Status: ${status.status}`);
    assert.equal(status.status, 'online');
  });

  it('ExecutionService debe estar inicializado', () => {
    const status = executionService.getStatus();
    assert.ok(status.initialized, `ExecutionService no inicializado. Status: ${status.status}`);
    assert.equal(status.status, 'online');
  });

  it('Debe poder guardar y recuperar un mensaje', async () => {
    const sessionId = `test_session_${Date.now()}_1`;
    const message = 'Mensaje de prueba';
    
    const saved = await memoryService.saveMessage(sessionId, 'user', message);
    assert.ok(saved, 'No se pudo guardar el mensaje');
    
    const history = await memoryService.getConversationHistory(sessionId, 5);
    assert.ok(history.length > 0, 'No se recuperó historial');
    
    const lastMessage = history[history.length - 1];
    assert.equal(lastMessage.content, message, `Mensaje esperado: "${message}", recibido: "${lastMessage.content}"`);
  });

  it('Debe poder guardar y recuperar contexto', async () => {
    const sessionId = `test_session_${Date.now()}_2`;
    const context = { test: 'data', key: 'value', timestamp: Date.now() };
    
    const saved = await memoryService.saveContext(sessionId, context);
    assert.ok(saved, 'No se pudo guardar el contexto');
    
    const retrieved = await memoryService.getContext(sessionId);
    assert.equal(retrieved.test, context.test, `test: esperado "${context.test}", recibido "${retrieved.test}"`);
    assert.equal(retrieved.key, context.key, `key: esperado "${context.key}", recibido "${retrieved.key}"`);
  });

  it('Debe poder crear un plan', async () => {
    const sessionId = `test_session_${Date.now()}_3`;
    const plan = await reasoningService.createPlan('Hola, ¿cómo estás?', sessionId);
    
    assert.ok(plan, 'No se generó un plan');
    assert.ok(plan.intent, 'El plan no tiene intent');
    assert.ok(plan.steps, 'El plan no tiene steps');
    assert.ok(Array.isArray(plan.steps), 'steps debe ser un array');
    assert.ok(plan.steps.length > 0, 'El plan no tiene pasos');
  });

  it('Debe poder ejecutar un plan simple', async () => {
    const sessionId = `test_session_${Date.now()}_4`;
    const plan = {
      intent: 'test_greeting',
      confidence: 0.9,
      steps: [
        {
          step: 'Responder al usuario con un saludo',
          toolOrAgent: 'ai_response',
          params: { query: 'Hola mundo, ¿cómo estás?' },
        },
      ],
      responseDraft: '¡Hola! Soy JARVIS, tu asistente. ¿Cómo puedo ayudarte hoy?',
      needsClarification: false,
    };
    
    const result = await executionService.executePlan(plan, sessionId);
    
    assert.ok(result, 'No se obtuvo resultado de ejecución');
    assert.ok(result.response, 'No hay respuesta en el resultado');
    assert.ok(
      result.status === 'completed' || result.status === 'clarification_needed',
      `Estado inesperado: ${result.status}`
    );
  });
});