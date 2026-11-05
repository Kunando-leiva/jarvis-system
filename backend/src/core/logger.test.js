// backend/src/core/logger.test.js
import { logger, createTraceContext, withTraceContext } from './logger.js';

// Prueba simple (se ejecuta con `node --test` o `npm test`)
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Logger', () => {
  it('should create a trace context with traceId', () => {
    const context = createTraceContext();
    assert.ok(context.traceId);
    assert.ok(typeof context.traceId === 'string');
    assert.ok(context.traceId.length > 0);
  });

  it('should log messages without errors', () => {
    assert.doesNotThrow(() => {
      logger.info('Test info message', { test: true });
      logger.error('Test error message', { test: true });
      logger.debug('Test debug message', { test: true });
    });
  });

  it('should execute with trace context', async () => {
    let capturedTraceId = null;
    await withTraceContext(async (context) => {
      capturedTraceId = context.traceId;
      logger.info('Inside trace context', { test: true });
    });
    assert.ok(capturedTraceId);
  });
});