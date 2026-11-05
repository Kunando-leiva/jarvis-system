// backend/src/core/eventBus.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EventBus, eventBus } from './eventBus.js';

describe('EventBus', () => {
  let bus;

  beforeEach(() => {
    bus = new EventBus();
  });

  /**
   * Helper: Espera a que los eventos se procesen
   * Usa setImmediate en lugar de setTimeout para ser más determinista
   */
  const waitForEvents = () => {
    return new Promise(resolve => setImmediate(resolve));
  };

  it('should subscribe and emit events', async () => {
    let called = false;
    bus.on('test', (data) => {
      called = true;
      assert.equal(data.message, 'hello');
    });
    bus.emit('test', { message: 'hello' });
    
    // Esperar a que los eventos se procesen
    await waitForEvents();
    
    assert.ok(called, 'El manejador debería haberse ejecutado');
  });

  it('should support once subscriptions', async () => {
    let count = 0;
    bus.on('once', () => { count++; }, { once: true });
    bus.emit('once', {});
    bus.emit('once', {});
    
    await waitForEvents();
    
    assert.equal(count, 1, 'Solo debería ejecutarse una vez');
  });

  it('should support priorities', async () => {
    const order = [];
    bus.on('priority', () => order.push('low'), { priority: 0 });
    bus.on('priority', () => order.push('high'), { priority: 10 });
    bus.emit('priority', {});
    
    await waitForEvents();
    
    assert.equal(order[0], 'high', 'El manejador con mayor prioridad debería ejecutarse primero');
    assert.equal(order[1], 'low', 'El manejador con menor prioridad debería ejecutarse después');
  });

  it('should return unsubscribe function', async () => {
    let called = false;
    const unsubscribe = bus.on('unsubscribe', () => { called = true; });
    unsubscribe();
    bus.emit('unsubscribe', {});
    
    await waitForEvents();
    
    assert.ok(!called, 'El manejador no debería ejecutarse después de cancelar la suscripción');
  });

  it('should keep history', async () => {
    bus.emit('test', { data: 1 });
    bus.emit('test', { data: 2 });
    
    await waitForEvents();
    
    const history = bus.getHistory();
    assert.equal(history.length, 2);
    assert.equal(history[0].event, 'test');
    assert.equal(history[0].payload.data, 1);
    assert.equal(history[1].event, 'test');
    assert.equal(history[1].payload.data, 2);
  });

  it('should handle errors in handlers gracefully', async () => {
    let handled = false;
    bus.on('error', () => {
      throw new Error('Test error');
    });
    bus.on('error', () => {
      handled = true;
    });
    
    // No debería lanzar excepción
    bus.emit('error', {});
    
    await waitForEvents();
    
    assert.ok(handled, 'El segundo manejador debería ejecutarse a pesar del error en el primero');
  });

  it('should support sync emission', async () => {
    let called = false;
    bus.on('sync', () => { called = true; });
    await bus.emitSync('sync', {});
    
    assert.ok(called, 'El manejador debería ejecutarse en modo síncrono');
  });

  it('should limit history size', async () => {
    // Crear un bus con historial limitado a 3
    const smallBus = new EventBus();
    smallBus.maxHistory = 3;
    
    for (let i = 0; i < 5; i++) {
      smallBus.emit('test', { index: i });
    }
    
    await waitForEvents();
    
    const history = smallBus.getHistory();
    assert.equal(history.length, 3, 'Solo debería guardar los últimos 3 eventos');
    assert.equal(history[0].payload.index, 2);
    assert.equal(history[1].payload.index, 3);
    assert.equal(history[2].payload.index, 4);
  });
});