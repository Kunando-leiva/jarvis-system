// backend/src/core/toolRegistry.js
// Registro centralizado de herramientas disponibles para los agentes

import { logger } from './logger.js';

/**
 * Tool Registry - Registro de herramientas ejecutables
 * 
 * Uso:
 *   toolRegistry.register({
 *     id: 'publish_instagram',
 *     name: 'Publicar en Instagram',
 *     description: 'Publica un video o imagen en Instagram',
 *     parameters: { ... },
 *     execute: async (params) => { ... }
 *   });
 *   const result = await toolRegistry.execute('publish_instagram', params);
 */
export class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.usageMetrics = new Map();
  }

  /**
   * Registra una herramienta
   * @param {Object} toolDef - Definición de la herramienta
   * @param {string} toolDef.id - ID único
   * @param {string} toolDef.name - Nombre legible
   * @param {string} toolDef.description - Descripción
   * @param {Object} toolDef.parameters - Esquema JSON de parámetros
   * @param {Function} toolDef.execute - Función de ejecución
   * @param {Object} [toolDef.metadata] - Metadatos adicionales
   */
  register(toolDef) {
    const { id, name, description, parameters, execute, metadata = {} } = toolDef;

    if (!id) throw new Error('Tool ID es requerido');
    if (!execute) throw new Error(`Tool ${id}: execute es requerido`);
    if (!name) throw new Error(`Tool ${id}: name es requerido`);

    if (this.tools.has(id)) {
      logger.warn(`[ToolRegistry] Sobrescribiendo herramienta: ${id}`);
    }

    this.tools.set(id, {
      id,
      name,
      description: description || '',
      parameters: parameters || { type: 'object', properties: {} },
      execute,
      metadata,
      registeredAt: new Date().toISOString(),
    });

    this.usageMetrics.set(id, {
      calls: 0,
      successes: 0,
      failures: 0,
      totalDuration: 0,
    });

    logger.info(`[ToolRegistry] Herramienta registrada: ${name} (${id})`);
    return this.tools.get(id);
  }

  /**
   * Obtiene una herramienta por ID
   * @param {string} id - ID de la herramienta
   * @returns {Object|null} Definición de la herramienta
   */
  get(id) {
    return this.tools.get(id) || null;
  }

  /**
   * Lista todas las herramientas
   * @param {Object} [options] - Opciones
   * @param {boolean} [options.includeMetrics] - Incluir métricas de uso
   * @returns {Array} Lista de herramientas
   */
  list(options = {}) {
    const result = [];
    for (const [id, tool] of this.tools) {
      const entry = {
        id: tool.id,
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        metadata: tool.metadata,
        registeredAt: tool.registeredAt,
      };
      if (options.includeMetrics) {
        entry.metrics = this.usageMetrics.get(id) || { calls: 0, successes: 0, failures: 0 };
      }
      result.push(entry);
    }
    return result;
  }

  /**
   * Ejecuta una herramienta
   * @param {string} id - ID de la herramienta
   * @param {Object} params - Parámetros para la ejecución
   * @param {Object} [options] - Opciones
   * @param {string} [options.traceId] - ID de trazabilidad
   * @returns {Promise<*>} Resultado de la ejecución
   */
  async execute(id, params, options = {}) {
    const tool = this.tools.get(id);
    if (!tool) {
      throw new Error(`Herramienta no encontrada: ${id}`);
    }

    const traceId = options.traceId || global.traceId || 'no-trace';
    const startTime = Date.now();

    // Actualizar métricas
    const metrics = this.usageMetrics.get(id) || { calls: 0, successes: 0, failures: 0, totalDuration: 0 };
    metrics.calls++;
    this.usageMetrics.set(id, metrics);

    logger.debug(`[ToolRegistry] Ejecutando herramienta: ${tool.name}`, {
      traceId,
      toolId: id,
      params: Object.keys(params || {}),
    });

    try {
      const result = await tool.execute(params, { traceId });
      const duration = Date.now() - startTime;

      // Actualizar métricas
      metrics.successes++;
      metrics.totalDuration += duration;
      this.usageMetrics.set(id, metrics);

      logger.debug(`[ToolRegistry] Herramienta ejecutada: ${tool.name}`, {
        traceId,
        toolId: id,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.failures++;
      this.usageMetrics.set(id, metrics);

      logger.error(`[ToolRegistry] Error ejecutando herramienta: ${tool.name}`, {
        traceId,
        toolId: id,
        duration,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Obtiene las métricas de una herramienta
   * @param {string} id - ID de la herramienta
   * @returns {Object|null} Métricas de uso
   */
  getMetrics(id) {
    return this.usageMetrics.get(id) || null;
  }

  /**
   * Obtiene el estado del registry
   */
  getStatus() {
    return {
      status: 'online',
      totalTools: this.tools.size,
      tools: Array.from(this.tools.keys()),
    };
  }
}

// Instancia por defecto (singleton)
export const toolRegistry = new ToolRegistry();

export default toolRegistry;