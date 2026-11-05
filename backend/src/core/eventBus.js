// backend/src/core/eventBus.js
// Sistema de eventos para auditoría, aprendizaje y métricas
// REGLA DE ORO: Solo para eventos que YA OCURRIERON.
// NO usar para el flujo principal de razonamiento.

import { logger } from './logger.js';

/**
 * Event Bus - Sistema de eventos desacoplado
 * 
 * Uso:
 *   eventBus.on('response_sent', (data) => { ... });
 *   eventBus.emit('response_sent', { sessionId, query, response });
 */
export class EventBus {
  constructor() {
    this.handlers = new Map();
    this.history = [];
    this.maxHistory = 1000;
    this.isReady = true;
  }

  /**
   * Suscribe un manejador a un evento
   * @param {string} event - Nombre del evento
   * @param {Function} handler - Función a ejecutar (recibe payload)
   * @param {Object} [options] - Opciones
   * @param {boolean} [options.once] - Ejecutar solo una vez
   * @param {number} [options.priority] - Prioridad (mayor = ejecuta primero)
   * @returns {Function} Función para cancelar la suscripción
   */
  on(event, handler, options = {}) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }

    const entry = {
      handler,
      once: options.once || false,
      priority: options.priority || 0,
      id: `${event}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    };

    this.handlers.get(event).push(entry);
    // Ordenar por prioridad (mayor primero)
    this.handlers.get(event).sort((a, b) => b.priority - a.priority);

    logger.debug(`[EventBus] Suscrito a ${event}`, { handlerId: entry.id });

    // Retornar función para cancelar la suscripción
    return () => this.off(event, entry.id);
  }

  /**
   * Cancela una suscripción
   * @param {string} event - Nombre del evento
   * @param {string} handlerId - ID del manejador (retornado por on())
   */
  off(event, handlerId) {
    if (!this.handlers.has(event)) return;
    const handlers = this.handlers.get(event);
    const index = handlers.findIndex(h => h.id === handlerId);
    if (index !== -1) {
      handlers.splice(index, 1);
      logger.debug(`[EventBus] Cancelada suscripción a ${event}`, { handlerId });
    }
    if (handlers.length === 0) {
      this.handlers.delete(event);
    }
  }

  /**
   * Emite un evento (ejecuta los manejadores de forma asíncrona)
   * @param {string} event - Nombre del evento
   * @param {*} payload - Datos del evento
   * @param {Object} [options] - Opciones
   * @param {string} [options.traceId] - ID de trazabilidad
   */
  emit(event, payload, options = {}) {
    const traceId = options.traceId || global.traceId || 'no-trace';
    const timestamp = new Date().toISOString();

    // Guardar en historial
    const eventRecord = {
      event,
      payload,
      traceId,
      timestamp,
    };

    this.history.push(eventRecord);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Si no hay manejadores, salir silenciosamente
    if (!this.handlers.has(event)) {
      logger.trace(`[EventBus] Evento ${event} emitido sin suscriptores`, { traceId });
      return;
    }

    const handlers = this.handlers.get(event);
    const handlersToRemove = [];

    logger.debug(`[EventBus] Emitiendo ${event}`, {
      traceId,
      handlers: handlers.length,
    });

    // Ejecutar manejadores de forma asíncrona (no bloqueante)
    for (const entry of handlers) {
      try {
        // Ejecutar sin esperar (fire-and-forget)
        setImmediate(() => {
          try {
            entry.handler(payload, { event, traceId, timestamp });
          } catch (error) {
            logger.error(`[EventBus] Error en manejador de ${event}`, {
              traceId,
              error: error.message,
              stack: error.stack,
              handlerId: entry.id,
            });
          }
        });

        if (entry.once) {
          handlersToRemove.push(entry.id);
        }
      } catch (error) {
        logger.error(`[EventBus] Error al ejecutar manejador de ${event}`, {
          traceId,
          error: error.message,
        });
      }
    }

    // Eliminar manejadores "once"
    for (const id of handlersToRemove) {
      this.off(event, id);
    }
  }

  /**
   * Emite un evento y espera a que los manejadores terminen (bloqueante)
   * @param {string} event - Nombre del evento
   * @param {*} payload - Datos del evento
   * @param {Object} [options] - Opciones
   * @returns {Promise<void>}
   */
  async emitSync(event, payload, options = {}) {
    const traceId = options.traceId || global.traceId || 'no-trace';
    const timestamp = new Date().toISOString();

    // Guardar en historial
    this.history.push({ event, payload, traceId, timestamp });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    if (!this.handlers.has(event)) {
      logger.trace(`[EventBus] Evento ${event} emitido sin suscriptores (sync)`, { traceId });
      return;
    }

    const handlers = this.handlers.get(event);
    const handlersToRemove = [];

    logger.debug(`[EventBus] Emitiendo ${event} (sync)`, {
      traceId,
      handlers: handlers.length,
    });

    for (const entry of handlers) {
      try {
        await entry.handler(payload, { event, traceId, timestamp });
        if (entry.once) {
          handlersToRemove.push(entry.id);
        }
      } catch (error) {
        logger.error(`[EventBus] Error en manejador de ${event} (sync)`, {
          traceId,
          error: error.message,
          handlerId: entry.id,
        });
      }
    }

    for (const id of handlersToRemove) {
      this.off(event, id);
    }
  }

  /**
   * Obtiene el historial de eventos
   * @param {number} [limit] - Límite de eventos
   * @returns {Array} Historial de eventos
   */
  getHistory(limit = 50) {
    return this.history.slice(-limit);
  }

  /**
   * Limpia el historial de eventos
   */
  clearHistory() {
    this.history = [];
    logger.info('[EventBus] Historial limpiado');
  }

  /**
   * Obtiene el estado del event bus
   */
  getStatus() {
    return {
      status: 'online',
      events: Array.from(this.handlers.keys()),
      totalHandlers: Array.from(this.handlers.values()).reduce((sum, h) => sum + h.length, 0),
      historySize: this.history.length,
    };
  }
}

// Instancia por defecto (singleton)
export const eventBus = new EventBus();

export default eventBus;