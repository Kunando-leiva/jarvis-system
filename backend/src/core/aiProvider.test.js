// backend/src/core/aiProvider.test.js
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { AIProvider, aiProvider } from './aiProvider.js';

// Creamos una instancia separada para pruebas
let testProvider;

describe('AIProvider', () => {
  beforeEach(() => {
    // 🔥 Crear una nueva instancia para cada prueba con configuración de prueba
    testProvider = new AIProvider({
      timeout: 5000,
      maxRetries: 2,
      taskConfig: {
        execution: {
          primary: 'groq',
          fallbacks: ['gemini'],
          timeout: 5000,
          maxRetries: 1,
        },
        reasoning: {
          primary: 'groq',
          fallbacks: [],
          timeout: 5000,
          maxRetries: 1,
        },
      },
    });
    
    // 🔥 Inyectar funciones mock usando el nuevo método
    testProvider.injectProviderFunctions({
      groq: async (prompt) => `Mock Groq: ${prompt}`,
      gemini: async (prompt) => `Mock Gemini: ${prompt}`,
      openrouter: async (prompt) => `Mock OpenRouter: ${prompt}`,
    });
    
    // 🔥 Inyectar lista de proveedores
    testProvider.injectProviders(['groq', 'gemini']);
  });

  it('should generate a response with the primary provider', async () => {
    const result = await testProvider.generate({
      prompt: 'Hola, mundo',
      task: 'execution',
    });

    assert.ok(result.text);
    assert.ok(result.provider);
    assert.ok(result.traceId);
    // Verificar que contiene "Mock" (debe ser el mock de Groq)
    assert.ok(result.text.includes('Mock'), `Texto recibido: "${result.text}"`);
  });

  it('should include traceId in the response', async () => {
    const result = await testProvider.generate({
      prompt: 'Test trace',
    });

    assert.ok(result.traceId);
    assert.ok(typeof result.traceId === 'string');
    assert.ok(result.traceId.length > 0);
  });

  it('should handle errors gracefully', async () => {
    // 🔥 Crear un provider que falla específicamente para esta prueba
    const failingProvider = new AIProvider({
      timeout: 1000,
      maxRetries: 1,
      taskConfig: {
        execution: {
          primary: 'groq',
          fallbacks: ['gemini'],
          timeout: 1000,
          maxRetries: 1,
        },
      },
    });
    
    // 🔥 Inyectar proveedores que fallan
    failingProvider.injectProviderFunctions({
      groq: async () => { throw new Error('Simulated error'); },
      gemini: async () => { throw new Error('Simulated error'); },
    });
    
    failingProvider.injectProviders(['groq', 'gemini']);

    const result = await failingProvider.generate({
      prompt: 'Test error',
    });

    assert.ok(result.text);
    // Debe ser local o fallback cuando todos fallan
    assert.ok(result.provider === 'local' || result.provider === 'fallback', 
      `Provider esperado: local/fallback, recibido: ${result.provider}`);
  });

  it('should respect timeout configuration', async () => {
    // 🔥 Provider lento para probar timeout
    const slowProvider = new AIProvider({
      timeout: 500,
      maxRetries: 1,
      taskConfig: {
        execution: {
          primary: 'groq',
          fallbacks: [],
          timeout: 500,
          maxRetries: 1,
        },
      },
    });
    
    slowProvider.injectProviderFunctions({
      groq: async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'Too slow';
      },
    });
    
    slowProvider.injectProviders(['groq']);

    const result = await slowProvider.generate({
      prompt: 'Test timeout',
    });

    assert.ok(result.text);
    // Debe caer en fallback o local por timeout
    assert.ok(result.provider === 'local' || result.provider === 'fallback');
  });
});