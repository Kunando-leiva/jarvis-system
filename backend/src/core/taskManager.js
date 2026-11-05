// backend/src/core/taskManager.js
// Gestión de tareas para orquestación de agentes

import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger.js';
import { eventBus } from './eventBus.js';

/**
 * Task Manager - Gestión del ciclo de vida de tareas
 * 
 * Uso:
 *   const task = taskManager.create('procesar_consulta', plan);
 *   await taskManager.start(task.id);
 *   const result = await taskManager.getResult(task.id);
 */
export class TaskManager {
  constructor() {
    this.tasks = new Map();
    this.taskHistory = [];
    this.maxHistory = 1000;
    this.status = 'idle';
    this.taskCounter = 0;
  }

  /**
   * Crea una nueva tarea
   * @param {string} type - Tipo de tarea
   * @param {Object} plan - Plan a ejecutar (estructura Plan)
   * @param {Object} [options] - Opciones
   * @param {string} [options.sessionId] - ID de sesión
   * @param {Object} [options.metadata] - Metadatos adicionales
   * @param {string} [options.parentTaskId] - ID de la tarea padre
   * @returns {Object} Tarea creada
   */
  create(type, plan, options = {}) {
    const id = `task_${++this.taskCounter}_${Date.now()}`;
    const task = {
      id,
      type,
      status: 'pending',
      plan,
      result: null,
      error: null,
      sessionId: options.sessionId || null,
      metadata: options.metadata || {},
      parentTaskId: options.parentTaskId || null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      lastUpdated: null,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
    };

    this.tasks.set(id, task);
    this.taskHistory.push(task);
    if (this.taskHistory.length > this.maxHistory) {
      this.taskHistory.shift();
    }

    logger.info(`[TaskManager] Tarea creada: ${id} (${type})`, {
      taskId: id,
      type,
      sessionId: task.sessionId,
    });

    eventBus.emit('task:created', {
      taskId: id,
      type,
      sessionId: task.sessionId,
      metadata: task.metadata,
    });

    return task;
  }

  /**
   * Inicia una tarea (cambia estado a in_progress)
   * @param {string} taskId - ID de la tarea
   * @returns {Promise<Object>} Tarea actualizada
   */
  async start(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Tarea no encontrada: ${taskId}`);
    }

    if (task.status === 'completed' || task.status === 'failed') {
      throw new Error(`Tarea ya finalizada: ${taskId} (${task.status})`);
    }

    task.status = 'in_progress';
    task.startedAt = new Date().toISOString();
    task.lastUpdated = new Date().toISOString();
    task.attempts++;

    logger.info(`[TaskManager] Tarea iniciada: ${taskId}`, {
      taskId,
      type: task.type,
      attempt: task.attempts,
    });

    eventBus.emit('task:started', {
      taskId,
      type: task.type,
      startedAt: task.startedAt,
    });

    return task;
  }

  /**
   * Completa una tarea (estado completada)
   * @param {string} taskId - ID de la tarea
   * @param {*} result - Resultado de la tarea
   * @returns {Object} Tarea actualizada
   */
  complete(taskId, result) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Tarea no encontrada: ${taskId}`);
    }

    task.status = 'completed';
    task.result = result;
    task.completedAt = new Date().toISOString();
    task.lastUpdated = new Date().toISOString();

    logger.info(`[TaskManager] Tarea completada: ${taskId}`, {
      taskId,
      type: task.type,
      duration: task.completedAt && task.startedAt
        ? new Date(task.completedAt) - new Date(task.startedAt)
        : null,
    });

    eventBus.emit('task:completed', {
      taskId,
      type: task.type,
      result,
      completedAt: task.completedAt,
    });

    return task;
  }

  /**
   * Marca una tarea como fallida
   * @param {string} taskId - ID de la tarea
   * @param {Error|string} error - Error que causó el fallo
   * @returns {Object} Tarea actualizada
   */
  fail(taskId, error) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Tarea no encontrada: ${taskId}`);
    }

    task.status = 'failed';
    task.error = error instanceof Error ? error.message : String(error);
    task.completedAt = new Date().toISOString();
    task.lastUpdated = new Date().toISOString();

    logger.error(`[TaskManager] Tarea fallida: ${taskId}`, {
      taskId,
      type: task.type,
      error: task.error,
    });

    eventBus.emit('task:failed', {
      taskId,
      type: task.type,
      error: task.error,
      completedAt: task.completedAt,
    });

    return task;
  }

  /**
   * Actualiza una tarea (metadatos, estado, etc.)
   * @param {string} taskId - ID de la tarea
   * @param {Object} updates - Actualizaciones a aplicar
   * @param {Object} [options] - Opciones
   * @param {boolean} [options.force] - Forzar actualización incluso si está completada
   * @returns {Object} Tarea actualizada
   */
  update(taskId, updates, options = {}) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Tarea no encontrada: ${taskId}`);
    }

    // Verificar si la tarea ya está finalizada
    if ((task.status === 'completed' || task.status === 'failed') && !options.force) {
      throw new Error(`Tarea ya finalizada: ${taskId} (${task.status})`);
    }

    // Aplicar actualizaciones
    if (updates.metadata) {
      task.metadata = { ...task.metadata, ...updates.metadata };
    }

    if (updates.status) {
      // Si se cambia el estado, validar transición
      const validStatuses = ['pending', 'in_progress', 'completed', 'failed'];
      if (!validStatuses.includes(updates.status)) {
        throw new Error(`Estado inválido: ${updates.status}`);
      }
      task.status = updates.status;
      
      // Si se completa, establecer completedAt
      if (updates.status === 'completed' && !task.completedAt) {
        task.completedAt = new Date().toISOString();
      }
      if (updates.status === 'failed' && !task.completedAt) {
        task.completedAt = new Date().toISOString();
      }
    }

    if (updates.result !== undefined) {
      task.result = updates.result;
    }

    if (updates.error !== undefined) {
      task.error = updates.error instanceof Error ? updates.error.message : String(updates.error);
    }

    if (updates.plan) {
      task.plan = { ...task.plan, ...updates.plan };
    }

    task.lastUpdated = new Date().toISOString();

    logger.debug(`[TaskManager] Tarea actualizada: ${taskId}`, {
      taskId,
      type: task.type,
      updates: Object.keys(updates),
      status: task.status,
    });

    eventBus.emit('task:updated', {
      taskId,
      type: task.type,
      updates: Object.keys(updates),
      status: task.status,
      lastUpdated: task.lastUpdated,
    });

    return task;
  }

  /**
   * Obtiene una tarea por ID
   * @param {string} taskId - ID de la tarea
   * @returns {Object|null} Tarea
   */
  get(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Obtiene el resultado de una tarea
   * @param {string} taskId - ID de la tarea
   * @returns {*} Resultado de la tarea
   */
  getResult(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    if (task.status === 'failed') {
      throw new Error(`Tarea fallida: ${task.error}`);
    }
    return task.result;
  }

  /**
   * Lista tareas con filtros
   * @param {Object} [filters] - Filtros
   * @param {string} [filters.status] - Estado de la tarea
   * @param {string} [filters.type] - Tipo de tarea
   * @param {string} [filters.sessionId] - ID de sesión
   * @param {number} [filters.limit] - Límite de resultados
   * @returns {Array} Lista de tareas
   */
  list(filters = {}) {
    let tasks = Array.from(this.tasks.values());

    if (filters.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }
    if (filters.type) {
      tasks = tasks.filter(t => t.type === filters.type);
    }
    if (filters.sessionId) {
      tasks = tasks.filter(t => t.sessionId === filters.sessionId);
    }

    // Ordenar por creación (más reciente primero)
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (filters.limit) {
      tasks = tasks.slice(0, filters.limit);
    }

    return tasks;
  }

  /**
   * Cancela una tarea
   * @param {string} taskId - ID de la tarea
   * @param {string} [reason] - Razón de la cancelación
   * @returns {Object} Tarea actualizada
   */
  cancel(taskId, reason = 'Cancelada por el usuario') {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Tarea no encontrada: ${taskId}`);
    }

    if (task.status === 'completed' || task.status === 'failed') {
      throw new Error(`Tarea ya finalizada: ${taskId}`);
    }

    task.status = 'failed';
    task.error = reason;
    task.completedAt = new Date().toISOString();
    task.lastUpdated = new Date().toISOString();

    logger.warn(`[TaskManager] Tarea cancelada: ${taskId}`, {
      taskId,
      reason,
    });

    eventBus.emit('task:cancelled', {
      taskId,
      type: task.type,
      reason,
    });

    return task;
  }

  /**
   * Obtiene el estado del task manager
   */
  getStatus() {
    const tasks = Array.from(this.tasks.values());
    const statusCount = {
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };

    return {
      status: 'online',
      totalTasks: tasks.length,
      activeTasks: tasks.filter(t => t.status === 'in_progress').length,
      statusCount,
    };
  }

  /**
   * Obtiene métricas de tareas
   */
  getMetrics() {
    const tasks = Array.from(this.tasks.values());
    const completed = tasks.filter(t => t.status === 'completed');
    const failed = tasks.filter(t => t.status === 'failed');

    // Calcular duración promedio de tareas completadas
    let avgDuration = 0;
    const durations = completed
      .filter(t => t.startedAt && t.completedAt)
      .map(t => new Date(t.completedAt) - new Date(t.startedAt));
    if (durations.length > 0) {
      avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    }

    return {
      total: tasks.length,
      completed: completed.length,
      failed: failed.length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      avgDurationMs: Math.round(avgDuration),
      byType: tasks.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  /**
   * Limpia tareas antiguas
   * @param {number} [maxAge] - Edad máxima en ms (por defecto 7 días)
   * @returns {number} Número de tareas eliminadas
   */
  cleanOldTasks(maxAge = 7 * 24 * 60 * 60 * 1000) {
    const now = Date.now();
    let removed = 0;

    for (const [id, task] of this.tasks) {
      if (task.status === 'completed' || task.status === 'failed') {
        const age = now - new Date(task.completedAt).getTime();
        if (age > maxAge) {
          this.tasks.delete(id);
          removed++;
        }
      }
    }

    if (removed > 0) {
      logger.info(`[TaskManager] Tareas antiguas eliminadas: ${removed}`);
    }

    return removed;
  }
}

// Instancia por defecto (singleton)
export const taskManager = new TaskManager();

export default taskManager;