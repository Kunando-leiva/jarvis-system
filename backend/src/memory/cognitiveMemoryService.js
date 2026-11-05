// backend/src/memory/cognitiveMemoryService.js
// 🧠 SERVICIO DE MEMORIA COGNITIVA - CON userId PERSISTENTE

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../core/logger.js';
import {
  MEMORY_TYPES,
  MEMORY_IMPORTANCE,
  MEMORY_STATUS,
  MEMORY_SOURCES,
  MEMORY_STRUCTURE
} from './memoryTypes.js';
import MemoryStore from './memoryStore.js';
import FactExtractor from './factExtractor.js';
import MemoryRetriever from './memoryRetriever.js';
import MemorySummarizer from './memorySummarizer.js';

class CognitiveMemoryService {
  constructor(config = {}) {
    this.config = {
      dbPath: config.dbPath || './data/memory.db',
      maxMemoriesPerQuery: config.maxMemoriesPerQuery || 10,
      minImportance: config.minImportance || 2,
      enableSummaries: config.enableSummaries !== false,
      ...config
    };

    this.store = new MemoryStore(this.config.dbPath);
    this.extractor = new FactExtractor();
    this.retriever = new MemoryRetriever(this.store);
    this.summarizer = new MemorySummarizer(this.config);

    this.initialized = false;
    this.status = 'initializing';
    this.metrics = {
      memoriesCount: 0,
      factsExtracted: 0,
      queriesProcessed: 0
    };
  }

  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('[CognitiveMemoryService] Inicializando...');

      await this.store.init();
      this.initialized = true;
      this.status = 'online';

      this.metrics.memoriesCount = await this.store.count();

      logger.info('[CognitiveMemoryService] Inicializado', {
        dbPath: this.config.dbPath,
        memoriesCount: this.metrics.memoriesCount
      });

      return true;
    } catch (error) {
      this.status = 'error';
      logger.error('[CognitiveMemoryService] Error inicializando', {
        error: error.message
      });
      throw error;
    }
  }

  // ──────── MÉTODOS PRINCIPALES ────────

  /**
   * Guardar un hecho o información en memoria
   * ✅ userId OBLIGATORIO
   * ✅ sessionId OBLIGATORIO
   */
  async remember(content, options = {}) {
    await this.ensureInitialized();

    // ✅ Validar userId y sessionId
    if (!options.userId) {
      throw new Error('userId es requerido para guardar memoria');
    }
    if (!options.sessionId) {
      throw new Error('sessionId es requerido para guardar memoria');
    }

    let memoryContent = content;
    let memoryType = options.type || MEMORY_TYPES.FACT;
    let tags = options.tags || [];
    let metadata = options.metadata || {};

    if (typeof content === 'object' && content.key && content.value !== undefined) {
      memoryContent = `${content.key}: ${content.value}`;
      memoryType = content.key;
      tags = [...tags, 'structured', content.key];
      metadata = {
        ...metadata,
        key: content.key,
        value: content.value,
        structure: MEMORY_STRUCTURE.KEY_VALUE
      };
    }

    const memory = {
      id: this.generateId(),
      type: memoryType,
      content: memoryContent,
      source: options.source || MEMORY_SOURCES.USER,
      importance: options.importance || this._getImportanceForType(memoryType),
      confidence: options.confidence || 1.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      tags: tags,
      userId: options.userId,      // ✅ userId persistente
      sessionId: options.sessionId, // ✅ sessionId para contexto
      metadata: metadata,
      status: MEMORY_STATUS.ACTIVE
    };

    if (metadata.key && metadata.value) {
      memory.metadata = {
        ...memory.metadata,
        key: metadata.key,
        value: metadata.value
      };
    }

    await this.store.save(memory);
    this.metrics.memoriesCount++;

    logger.debug('[CognitiveMemoryService] Memoria guardada', {
      id: memory.id,
      type: memory.type,
      key: metadata.key || 'none',
      userId: memory.userId,
      sessionId: memory.sessionId
    });

    return memory;
  }

  /**
   * Recordar información relevante para una consulta
   * ✅ userId OBLIGATORIO
   * ✅ sessionId OBLIGATORIO
   */
  async recall(query, options = {}) {
  await this.ensureInitialized();

  if (!options.userId) {
    throw new Error('userId es requerido para recall');
  }

  this.metrics.queriesProcessed++;

  try {
    // ✅ Cambiar const a let
    let memories = await this.retriever.search(query, {
      userId: options.userId,
      sessionId: options.sessionId,
      limit: this.config.maxMemoriesPerQuery * 2
    });

    const minImportance = options.minImportance || this.config.minImportance;
    memories = memories.filter(m => m.importance >= minImportance);

    memories = this.retriever.rankByRelevance(memories, query);

    const limit = options.limit || this.config.maxMemoriesPerQuery;
    memories = memories.slice(0, limit);

    for (const memory of memories) {
      await this.store.update(memory.id, {
        lastAccessedAt: new Date().toISOString()
      });
    }

    return memories;
  } catch (error) {
    logger.error('[CognitiveMemoryService] Error en recall', {
      error: error.message,
      query
    });
    return [];
  }
}

  /**
   * ✅ RECUPERACIÓN DETERMINISTA POR userId + key
   * NO usa sessionId para memoria personal
   */
  async recallByKey(key, userId, sessionId = null) {
    await this.ensureInitialized();

    if (!userId) {
      throw new Error('userId es requerido para recallByKey');
    }

    try {
      // ✅ Buscar por userId + key (NO por sessionId)
      const memory = await this.store.getByKey(key, userId);

      if (memory) {
        if (memory.metadata && memory.metadata.value) {
          return {
            exists: true,
            key: key,
            value: memory.metadata.value,
            memory: memory
          };
        }
        return {
          exists: true,
          key: key,
          value: memory.content,
          memory: memory
        };
      }

      return { exists: false, key: key, value: null };
    } catch (error) {
      logger.error('[CognitiveMemoryService] Error en recallByKey', {
        error: error.message,
        key,
        userId
      });
      return { exists: false, key: key, value: null };
    }
  }

  /**
   * ✅ Obtener toda la información personal de un usuario
   */
  async getPersonalInfo(userId) {
    await this.ensureInitialized();

    if (!userId) {
      throw new Error('userId es requerido para getPersonalInfo');
    }

    try {
      const memories = await this.store.getPersonalInfo(userId);

      // Convertir a objeto clave/valor
      const info = {};
      for (const mem of memories) {
        if (mem.metadata && mem.metadata.key && mem.metadata.value) {
          info[mem.metadata.key] = mem.metadata.value;
        } else {
          info[mem.type] = mem.content;
        }
      }
      return info;
    } catch (error) {
      logger.error('[CognitiveMemoryService] Error en getPersonalInfo', {
        error: error.message,
        userId
      });
      return {};
    }
  }

  /**
   * Extraer y guardar hechos automáticamente
   * ✅ userId OBLIGATORIO
   * ✅ sessionId OBLIGATORIO
   */
  async extractAndRemember(text, options = {}) {
    await this.ensureInitialized();

    if (!options.userId) {
      throw new Error('userId es requerido para extractAndRemember');
    }
    if (!options.sessionId) {
      throw new Error('sessionId es requerido para extractAndRemember');
    }

    const facts = this.extractor.extract(text);
    const savedFacts = [];

    for (const fact of facts) {
      try {
        const memory = await this.remember(
          {
            key: fact.key,
            value: fact.value
          },
          {
            type: fact.type,
            source: MEMORY_SOURCES.EXTRACTED,
            importance: fact.importance || MEMORY_IMPORTANCE.MEDIUM,
            confidence: fact.confidence || 0.7,
            userId: options.userId,
            sessionId: options.sessionId,
            tags: [fact.type, 'extracted', ...(options.tags || [])],
            metadata: {
              originalText: fact.original,
              extractedType: fact.type
            }
          }
        );
        savedFacts.push(memory);
        this.metrics.factsExtracted++;
      } catch (error) {
        logger.warn('[CognitiveMemoryService] Error guardando hecho extraído', {
          error: error.message,
          fact: fact.value
        });
      }
    }

    return savedFacts;
  }

  /**
   * Extraer hechos de un texto (sin guardar)
   */
  extractFacts(text) {
    return this.extractor.extract(text);
  }

  /**
   * Extraer un tipo específico
   */
  extractType(text, type) {
    return this.extractor.extractType(text, type);
  }

  /**
   * Olvidar información (marcar como deprecado)
   */
  async forget(id) {
    await this.ensureInitialized();
    await this.store.update(id, {
      status: MEMORY_STATUS.DEPRECATED,
      updatedAt: new Date().toISOString()
    });
    this.metrics.memoriesCount--;
  }

  /**
   * Generar resumen de una conversación
   */
  async summarizeConversation(userId, sessionId) {
    await this.ensureInitialized();

    if (!userId || !sessionId) {
      return 'Se requiere userId y sessionId para generar resumen.';
    }

    try {
      const memories = await this.store.list({
        userId,
        sessionId,
        limit: 100,
        status: MEMORY_STATUS.ACTIVE
      });

      return this.summarizer.summarizeConversation(memories);
    } catch (error) {
      logger.error('[CognitiveMemoryService] Error generando resumen', {
        error: error.message,
        userId,
        sessionId
      });
      return 'No se pudo generar el resumen.';
    }
  }

  /**
   * Obtener todas las memorias de un tipo
   */
  async getByType(type, userId, sessionId, limit = 20) {
    await this.ensureInitialized();

    if (!userId) {
      throw new Error('userId es requerido para getByType');
    }

    return this.retriever.getByType(type, userId, sessionId, limit);
  }

  /**
   * Obtener últimas memorias
   */
  async getLatest(userId, sessionId, limit = 10) {
    await this.ensureInitialized();

    if (!userId) {
      throw new Error('userId es requerido para getLatest');
    }

    return this.retriever.getLatest(userId, sessionId, limit);
  }

  /**
   * Obtener contexto para una conversación
   */
  async getContext(userId, sessionId, limit = 10) {
    await this.ensureInitialized();

    if (!userId || !sessionId) {
      return { memories: [], context: 'Se requiere userId y sessionId para obtener contexto.' };
    }

    try {
      const memories = await this.store.list({
        userId,
        sessionId,
        limit,
        status: MEMORY_STATUS.ACTIVE
      });

      const context = this.summarizer.summarizeContext(memories);
      return { memories, context };
    } catch (error) {
      logger.error('[CognitiveMemoryService] Error obteniendo contexto', {
        error: error.message,
        userId,
        sessionId
      });
      return { memories: [], context: 'No hay contexto disponible.' };
    }
  }

  // ──────── UTILIDADES ────────

  _getImportanceForType(type) {
    const map = {
      user_name: MEMORY_IMPORTANCE.USER_NAME,
      favorite_color: MEMORY_IMPORTANCE.FAVORITE_COLOR,
      project_name: MEMORY_IMPORTANCE.PROJECT_NAME,
      tech_stack: MEMORY_IMPORTANCE.TECH_STACK,
      favorite_food: MEMORY_IMPORTANCE.HIGH,
      favorite_music: MEMORY_IMPORTANCE.HIGH,
      occupation: MEMORY_IMPORTANCE.HIGH,
      location: MEMORY_IMPORTANCE.MEDIUM,
      birthday: MEMORY_IMPORTANCE.HIGH
    };
    return map[type] || MEMORY_IMPORTANCE.MEDIUM;
  }

  // ❌ ELIMINADO _extractKeyFromQuery() - No usar regex para adivinar

  generateId() {
    return `mem_${Date.now()}_${uuidv4().substring(0, 8)}`;
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async cleanup() {
    try {
      logger.info('[CognitiveMemoryService] Cleanup ejecutado');
    } catch (error) {
      logger.error('[CognitiveMemoryService] Error en cleanup', {
        error: error.message
      });
    }
  }

  async close() {
    await this.store.close();
    this.initialized = false;
    this.status = 'offline';
    logger.info('[CognitiveMemoryService] Cerrado');
  }

  // ──────── MÉTRICAS ────────

  getMetrics() {
    return {
      initialized: this.initialized,
      status: this.status,
      memoriesCount: this.metrics.memoriesCount,
      factsExtracted: this.metrics.factsExtracted,
      queriesProcessed: this.metrics.queriesProcessed,
      config: {
        maxMemoriesPerQuery: this.config.maxMemoriesPerQuery,
        minImportance: this.config.minImportance,
        enableSummaries: this.config.enableSummaries
      }
    };
  }

  getStatus() {
    return {
      initialized: this.initialized,
      status: this.status,
      metrics: this.getMetrics()
    };
  }
}

export default CognitiveMemoryService;