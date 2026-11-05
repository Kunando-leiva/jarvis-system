// backend/src/services/contextWindowManager.js
// 🪟 CONTEXT WINDOW MANAGER - Gestiona ventana de contexto para LLMs
// 🔒 RESPONSABILIDAD ÚNICA: Recibir contexto, optimizar para LLM, devolver ventana
// 🔒 VERSIÓN SIMPLE: Presupuesto de tokens, priorización básica, resumen de historial

import { BaseService } from '../core/serviceInterface.js';
import { logger } from '../core/logger.js';
import { eventBus } from '../core/eventBus.js';

// Estimación aproximada: 1 token ≈ 4 caracteres en español
const TOKEN_ESTIMATE = 4;

export class ContextWindowManager extends BaseService {
  constructor(config = {}) {
    super(config);
    this.name = 'ContextWindowManager';
    
    // Configuración por defecto
    this.config = {
      maxTokens: config.maxTokens || 8000,        // Presupuesto total
      historyTokens: config.historyTokens || 4000, // Presupuesto para historial
      memoryTokens: config.memoryTokens || 2000,   // Presupuesto para memorias
      systemTokens: config.systemTokens || 1000,   // Presupuesto para sistema
      queryTokens: config.queryTokens || 500,      // Presupuesto para consulta
      minHistoryForSummary: config.minHistoryForSummary || 10, // Mínimo para resumir
      maxHistoryBeforeSummary: config.maxHistoryBeforeSummary || 20, // Máximo antes de resumir
    };
    
    this.initialized = true;
    this.status = 'online';
    
    logger.info('[ContextWindowManager] Inicializado', {
      maxTokens: this.config.maxTokens,
      historyTokens: this.config.historyTokens,
      memoryTokens: this.config.memoryTokens,
    });
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Construye ventana de contexto optimizada
   * @param {Object} context - Contexto enriquecido (de Context Service)
   * @param {Object} [options] - Opciones adicionales
   * @param {number} [options.maxTokens] - Presupuesto de tokens
   * @returns {Object} Ventana de contexto optimizada
   */
  buildWindow(context, options = {}) {
    const startTime = Date.now();
    const traceId = context?.metadata?.traceId || global.traceId || 'no-trace';
    
    if (!context) {
      throw new Error('context es requerido');
    }

    const maxTokens = options.maxTokens || this.config.maxTokens;
    
    logger.debug('[ContextWindowManager] Construyendo ventana', {
      sessionId: context.session?.id,
      maxTokens,
      traceId,
    });

    // 1. Preparar componentes del contexto
    const components = this._prepareComponents(context);
    
    // 2. Calcular tokens estimados
    const estimatedTokens = this._estimateTokens(components);
    
    // 3. Si no excede el presupuesto, devolver todo
    if (estimatedTokens.total <= maxTokens) {
      const window = this._buildFullWindow(context, components, estimatedTokens);
      
      this._emit('window_built', {
        sessionId: context.session?.id,
        traceId,
        mode: 'full',
        totalTokens: estimatedTokens.total,
        maxTokens,
      });
      
      return window;
    }
    
    // 4. Si excede, optimizar
    const optimized = this._optimizeWindow(context, components, maxTokens);
    
    this._emit('window_built', {
      sessionId: context.session?.id,
      traceId,
      mode: 'optimized',
      originalTokens: estimatedTokens.total,
      optimizedTokens: optimized.metadata.optimizedLength,
      maxTokens,
      truncated: optimized.metadata.truncated,
      summaryUsed: optimized.metadata.summaryUsed,
    });
    
    return optimized;
  }

  // ─── PREPARAR COMPONENTES ────────────────────────────────────

  _prepareComponents(context) {
    const components = {};
    
    // 1. Consulta (siempre presente)
    components.query = {
      text: context.query?.text || '',
      priority: 10, // Mayor prioridad
      tokens: 0,
    };
    
    // 2. Historial (prioridad alta)
    if (context.history && context.history.length > 0) {
      components.history = {
        messages: context.history,
        priority: 8,
        tokens: 0,
      };
    }
    
    // 3. Memoria episódica (prioridad media-alta)
    if (context.memory?.episodic && context.memory.episodic.length > 0) {
      components.episodic = {
        items: context.memory.episodic,
        priority: 6,
        tokens: 0,
      };
    }
    
    // 4. Memoria semántica (prioridad media)
    if (context.memory?.semantic && context.memory.semantic.length > 0) {
      components.semantic = {
        items: context.memory.semantic,
        priority: 5,
        tokens: 0,
      };
    }
    
    // 5. Memoria procedimental (prioridad media-baja)
    if (context.memory?.procedural && context.memory.procedural.length > 0) {
      components.procedural = {
        items: context.memory.procedural,
        priority: 4,
        tokens: 0,
      };
    }
    
    // 6. Contexto de sesión (prioridad baja)
    if (context.session?.context && Object.keys(context.session.context).length > 0) {
      components.session = {
        data: context.session.context,
        priority: 3,
        tokens: 0,
      };
    }
    
    // 7. Información del proyecto (prioridad baja)
    if (context.system?.project) {
      components.project = {
        data: context.system.project,
        priority: 2,
        tokens: 0,
      };
    }
    
    // 8. Estado del sistema (prioridad baja)
    if (context.system?.state) {
      components.systemState = {
        data: context.system.state,
        priority: 1,
        tokens: 0,
      };
    }
    
    // Calcular tokens estimados para cada componente
    for (const [key, comp] of Object.entries(components)) {
      comp.tokens = this._estimateComponentTokens(comp);
    }
    
    return components;
  }

  // ─── ESTIMAR TOKENS ──────────────────────────────────────────

  _estimateComponentTokens(component) {
    if (component.text) {
      return Math.ceil(component.text.length / TOKEN_ESTIMATE);
    }
    
    if (component.messages) {
      let total = 0;
      for (const msg of component.messages) {
        total += Math.ceil((msg.content || '').length / TOKEN_ESTIMATE);
        total += 5; // Overhead por mensaje (role, timestamp)
      }
      return total;
    }
    
    if (component.items) {
      let total = 0;
      for (const item of component.items) {
        const text = item.summary || item.value || JSON.stringify(item);
        total += Math.ceil(text.length / TOKEN_ESTIMATE);
        total += 3; // Overhead
      }
      return total;
    }
    
    if (component.data) {
      const text = typeof component.data === 'string' 
        ? component.data 
        : JSON.stringify(component.data);
      return Math.ceil(text.length / TOKEN_ESTIMATE);
    }
    
    return 0;
  }

  _estimateTokens(components) {
    let total = 0;
    const details = {};
    
    for (const [key, comp] of Object.entries(components)) {
      details[key] = comp.tokens || 0;
      total += comp.tokens || 0;
    }
    
    return { total, details };
  }

  // ─── VENTANA COMPLETA (SIN OPTIMIZAR) ──────────────────────

  _buildFullWindow(context, components, estimatedTokens) {
    const messages = this._buildMessagesFromComponents(components);
    
    return {
      messages,
      summary: null,
      metadata: {
        mode: 'full',
        originalLength: estimatedTokens.total,
        optimizedLength: estimatedTokens.total,
        truncated: false,
        summaryUsed: false,
        components: Object.keys(components),
        componentTokens: estimatedTokens.details,
      },
    };
  }

  // ─── OPTIMIZAR VENTANA ──────────────────────────────────────

  _optimizeWindow(context, components, maxTokens) {
    const result = {
      messages: [],
      summary: null,
      metadata: {
        mode: 'optimized',
        originalLength: 0,
        optimizedLength: 0,
        truncated: false,
        summaryUsed: false,
        components: [],
        componentTokens: {},
      },
    };

    // 1. Calcular tokens totales
    const estimated = this._estimateTokens(components);
    result.metadata.originalLength = estimated.total;
    
    // 2. Ordenar componentes por prioridad (mayor primero)
    const sorted = Object.entries(components)
      .sort((a, b) => b[1].priority - a[1].priority);
    
    // 3. Presupuesto por componente
    const budgets = this._calculateBudgets(sorted, maxTokens);
    
    // 4. Construir mensajes respetando presupuestos
    let totalUsed = 0;
    const usedComponents = [];
    
    for (const [key, comp] of sorted) {
      const budget = budgets[key] || 0;
      if (budget <= 0) continue;
      
      const componentMessages = this._buildComponentMessages(key, comp, budget);
      if (componentMessages.length > 0) {
        result.messages.push(...componentMessages);
        totalUsed += componentMessages.reduce((sum, m) => 
          sum + Math.ceil((m.content || '').length / TOKEN_ESTIMATE), 0
        );
        usedComponents.push(key);
        result.metadata.componentTokens[key] = componentMessages.reduce((sum, m) => 
          sum + Math.ceil((m.content || '').length / TOKEN_ESTIMATE), 0
        );
      }
    }
    
    // 5. Si el historial es muy largo, resumir
    if (components.history && components.history.messages && 
        components.history.messages.length > this.config.minHistoryForSummary) {
      const historyTokens = budgets.history || 0;
      if (historyTokens < this._estimateComponentTokens(components.history) * 0.5) {
        result.summary = this._generateSummary(components.history.messages);
        result.metadata.summaryUsed = true;
        result.messages.push({
          role: 'system',
          content: `📝 Resumen de la conversación anterior: ${result.summary}`,
        });
      }
    }
    
    result.metadata.optimizedLength = totalUsed;
    result.metadata.truncated = result.metadata.originalLength > maxTokens;
    result.metadata.components = usedComponents;
    
    logger.debug('[ContextWindowManager] Ventana optimizada', {
      originalTokens: result.metadata.originalLength,
      optimizedTokens: result.metadata.optimizedLength,
      usedComponents: usedComponents.join(', '),
      summaryUsed: result.metadata.summaryUsed,
    });
    
    return result;
  }

  // ─── CALCULAR PRESUPUESTOS ──────────────────────────────────

  _calculateBudgets(sorted, maxTokens) {
    const budgets = {};
    let totalPriority = 0;
    
    // Calcular peso total de prioridades
    for (const [key, comp] of sorted) {
      totalPriority += comp.priority;
    }
    
    // Asignar presupuesto proporcional a prioridad
    let remaining = maxTokens;
    
    for (const [key, comp] of sorted) {
      const proportion = comp.priority / totalPriority;
      let budget = Math.floor(maxTokens * proportion);
      
      // Mínimo 50 tokens para componentes importantes
      if (comp.priority >= 5 && budget < 50) {
        budget = 50;
      }
      
      // No exceder el tamaño real del componente
      const actualTokens = comp.tokens || 0;
      if (budget > actualTokens) {
        budget = actualTokens;
      }
      
      budgets[key] = budget;
      remaining -= budget;
    }
    
    // Distribuir tokens restantes a los de mayor prioridad
    if (remaining > 0) {
      const sortedByPriority = sorted.filter(([k]) => budgets[k] > 0);
      for (const [key] of sortedByPriority) {
        if (remaining <= 0) break;
        const current = budgets[key] || 0;
        const actual = components[key]?.tokens || 0;
        if (current < actual) {
          const extra = Math.min(remaining, actual - current);
          budgets[key] = current + extra;
          remaining -= extra;
        }
      }
    }
    
    return budgets;
  }

  // ─── CONSTRUIR MENSAJES DE COMPONENTES ──────────────────────

  _buildComponentMessages(key, component, budget) {
    const messages = [];
    
    switch (key) {
      case 'query':
        messages.push({
          role: 'user',
          content: component.text,
        });
        break;
        
      case 'history':
        const historyMessages = this._buildHistoryMessages(component.messages, budget);
        messages.push(...historyMessages);
        break;
        
      case 'episodic':
        const episodicContent = component.items
          .slice(0, Math.max(1, Math.floor(budget / 30)))
          .map(item => `📌 ${item.event_type}: ${item.summary}`)
          .join('\n');
        if (episodicContent) {
          messages.push({
            role: 'system',
            content: `📋 Eventos recientes:\n${episodicContent}`,
          });
        }
        break;
        
      case 'semantic':
        const semanticContent = component.items
          .slice(0, Math.max(1, Math.floor(budget / 25)))
          .map(item => `• ${item.key}: ${item.value} (confianza: ${item.confidence})`)
          .join('\n');
        if (semanticContent) {
          messages.push({
            role: 'system',
            content: `🧠 Hechos conocidos:\n${semanticContent}`,
          });
        }
        break;
        
      case 'procedural':
        const proceduralContent = component.items
          .slice(0, Math.max(1, Math.floor(budget / 30)))
          .map(item => `• ${item.key}: ${item.value.substring(0, 100)}...`)
          .join('\n');
        if (proceduralContent) {
          messages.push({
            role: 'system',
            content: `⚙️ Procedimientos disponibles:\n${proceduralContent}`,
          });
        }
        break;
        
      case 'session':
        const sessionContent = JSON.stringify(component.data, null, 2);
        if (sessionContent.length < budget * TOKEN_ESTIMATE) {
          messages.push({
            role: 'system',
            content: `📝 Contexto de sesión:\n${sessionContent}`,
          });
        }
        break;
        
      case 'project':
        const projectContent = JSON.stringify(component.data, null, 2);
        if (projectContent.length < budget * TOKEN_ESTIMATE) {
          messages.push({
            role: 'system',
            content: `📁 Proyecto:\n${projectContent}`,
          });
        }
        break;
        
      case 'systemState':
        const stateContent = JSON.stringify(component.data, null, 2);
        if (stateContent.length < budget * TOKEN_ESTIMATE) {
          messages.push({
            role: 'system',
            content: `💻 Estado del sistema:\n${stateContent}`,
          });
        }
        break;
    }
    
    return messages;
  }

  // ─── CONSTRUIR MENSAJES DEL HISTORIAL ──────────────────────

  _buildHistoryMessages(messages, budget) {
    const result = [];
    let used = 0;
    
    // Ordenar de más reciente a más antiguo para priorizar
    const reversed = [...messages].reverse();
    
    for (const msg of reversed) {
      const content = msg.content || '';
      const tokens = Math.ceil(content.length / TOKEN_ESTIMATE);
      
      if (used + tokens <= budget) {
        result.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: content,
        });
        used += tokens;
      } else {
        break;
      }
    }
    
    // Revertir para orden cronológico
    return result.reverse();
  }

  // ─── CONSTRUIR MENSAJES DESDE COMPONENTES ──────────────────

  _buildMessagesFromComponents(components) {
    const messages = [];
    
    // Orden: query, history, memory, system
    if (components.query) {
      messages.push({
        role: 'user',
        content: components.query.text,
      });
    }
    
    if (components.history) {
      for (const msg of components.history.messages) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content || '',
        });
      }
    }
    
    // Sistema al final
    const systemMessages = [];
    
    if (components.episodic) {
      const content = components.episodic.items
        .map(item => `📌 ${item.event_type}: ${item.summary}`)
        .join('\n');
      if (content) {
        systemMessages.push({
          role: 'system',
          content: `📋 Eventos recientes:\n${content}`,
        });
      }
    }
    
    if (components.semantic) {
      const content = components.semantic.items
        .map(item => `• ${item.key}: ${item.value}`)
        .join('\n');
      if (content) {
        systemMessages.push({
          role: 'system',
          content: `🧠 Hechos conocidos:\n${content}`,
        });
      }
    }
    
    if (components.systemState) {
      systemMessages.push({
        role: 'system',
        content: `💻 Modo: ${components.systemState.data.mode || 'JARVIS'}`,
      });
    }
    
    messages.push(...systemMessages);
    
    return messages;
  }

  // ─── GENERAR RESUMEN ─────────────────────────────────────────

  _generateSummary(messages) {
    // Versión simple: extraer los temas principales
    const topics = [];
    const seen = new Set();
    
    for (const msg of messages) {
      const content = msg.content || '';
      const words = content.split(' ');
      for (const word of words) {
        if (word.length > 5 && !seen.has(word)) {
          seen.add(word);
          topics.push(word);
          if (topics.length >= 10) break;
        }
      }
      if (topics.length >= 10) break;
    }
    
    if (topics.length === 0) {
      return `${messages.length} mensajes intercambiados.`;
    }
    
    return `Conversación sobre ${topics.slice(0, 5).join(', ')}${topics.length > 5 ? ' y otros temas' : ''}. (${messages.length} mensajes)`;
  }

  // ─── MÉTRICAS Y ESTADO ──────────────────────────────────────

  getMetrics() {
    return {
      ...this.metrics,
      maxTokens: this.config.maxTokens,
      historyTokens: this.config.historyTokens,
      memoryTokens: this.config.memoryTokens,
    };
  }

  getStatus() {
    return {
      name: this.name,
      status: this.status,
      initialized: this.initialized,
      metrics: this.getMetrics(),
    };
  }

  async shutdown() {
    try {
      this.status = 'offline';
      this.initialized = false;
      logger.info('[ContextWindowManager] Apagado correctamente');
      return true;
    } catch (error) {
      logger.error('[ContextWindowManager] Error en shutdown', {
        error: error.message,
      });
      return false;
    }
  }
}

// Instancia por defecto
const contextWindowManager = new ContextWindowManager();

export default contextWindowManager;