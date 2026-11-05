// backend/src/services/longTermMemoryService.js
// 🧠 MEMORIA A LARGO PLAZO - Episódica, Semántica y Procedimental
// 🔒 EXPONE SOLO MÉTODOS PÚBLICOS

import { logger } from '../core/logger.js';
import { eventBus } from '../core/eventBus.js';
import { BaseService } from '../core/serviceInterface.js';
import memoryService from './memoryService.js';

export class LongTermMemoryService extends BaseService {
  constructor(config = {}) {
    super(config);
    this.name = 'LongTermMemoryService';
    this.memoryService = config.memoryService || memoryService;
    this.initialized = false;
    this.cache = new Map();
    this.metrics = {
      episodic: { saved: 0, retrieved: 0 },
      semantic: { saved: 0, retrieved: 0 },
      procedural: { saved: 0, retrieved: 0 },
    };
  }

  async initialize() {
    try {
      this.status = 'initializing';
      
      // Asegurar que memoryService esté inicializado
      if (!this.memoryService.initialized) {
        await this.memoryService.initialize();
      }
      
      this.initialized = true;
      this.status = 'online';
      
      logger.info('[LongTermMemoryService] Inicializado');
      
      // Suscribirse a eventos relevantes
      eventBus.on('response_sent', this._onResponseSent.bind(this));
      eventBus.on('task:completed', this._onTaskCompleted.bind(this));
      
      return true;
    } catch (error) {
      this.status = 'error';
      logger.error('[LongTermMemoryService] Error inicializando', {
        error: error.message,
      });
      return false;
    }
  }

  // ─── MEMORIA EPISÓDICA ──────────────────────────────────────

  /**
   * 🔒 MÉTODO PÚBLICO: Guarda un evento episódico
   */
  async saveEpisodicEvent(sessionId, eventType, summary, metadata = {}) {
    try {
      // 🔒 Usar método público ensureSession del MemoryService
      this.memoryService.ensureSession(sessionId);
      
      const db = this.memoryService.db;
      const stmt = db.prepare(`
        INSERT INTO episodic_memory (session_id, event_type, summary, metadata)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run(sessionId, eventType, summary, JSON.stringify(metadata));
      
      this.metrics.episodic.saved++;
      
      logger.debug('[LongTermMemory] Evento episódico guardado', {
        sessionId,
        eventType,
        summaryLength: summary?.length || 0,
      });
      
      return true;
    } catch (error) {
      logger.error('[LongTermMemory] Error guardando evento episódico', {
        sessionId,
        eventType,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Obtiene eventos episódicos recientes
   */
  async getRecentEpisodicEvents(sessionId, limit = 5) {
    try {
      const db = this.memoryService.db;
      const stmt = db.prepare(`
        SELECT id, event_type, summary, metadata, timestamp
        FROM episodic_memory
        WHERE session_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);
      
      const rows = stmt.all(sessionId, limit);
      
      this.metrics.episodic.retrieved++;
      
      return rows.map(row => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        timestamp: row.timestamp,
      }));
    } catch (error) {
      logger.error('[LongTermMemory] Error obteniendo eventos episódicos', {
        sessionId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Busca eventos episódicos por tipo
   */
  async searchEpisodicEvents(sessionId, eventType, limit = 10) {
    try {
      const db = this.memoryService.db;
      const stmt = db.prepare(`
        SELECT id, event_type, summary, metadata, timestamp
        FROM episodic_memory
        WHERE session_id = ? AND event_type = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);
      
      const rows = stmt.all(sessionId, eventType, limit);
      
      return rows.map(row => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        timestamp: row.timestamp,
      }));
    } catch (error) {
      logger.error('[LongTermMemory] Error buscando eventos episódicos', {
        sessionId,
        eventType,
        error: error.message,
      });
      return [];
    }
  }

  // ─── MEMORIA SEMÁNTICA ──────────────────────────────────────

  /**
   * 🔒 MÉTODO PÚBLICO: Guarda un hecho semántico
   */
  async saveSemanticFact(sessionId, key, value, confidence = 1.0, metadata = {}) {
    try {
      // 🔒 Usar método público ensureSession del MemoryService
      this.memoryService.ensureSession(sessionId);
      
      const db = this.memoryService.db;
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO semantic_memory (session_id, key, value, confidence, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(sessionId, key, value, confidence, JSON.stringify(metadata));
      
      this.metrics.semantic.saved++;
      
      // Actualizar caché
      const cacheKey = `${sessionId}:${key}`;
      this.cache.set(cacheKey, { value, confidence, metadata });
      
      logger.debug('[LongTermMemory] Hecho semántico guardado', {
        sessionId,
        key,
        confidence,
      });
      
      eventBus.emit('memory:semantic_fact_saved', {
        sessionId,
        key,
        confidence,
      });
      
      return true;
    } catch (error) {
      logger.error('[LongTermMemory] Error guardando hecho semántico', {
        sessionId,
        key,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Obtiene un hecho semántico
   */
  async getSemanticFact(sessionId, key) {
    try {
      // Verificar caché primero
      const cacheKey = `${sessionId}:${key}`;
      if (this.cache.has(cacheKey)) {
        this.metrics.semantic.retrieved++;
        return this.cache.get(cacheKey);
      }
      
      const db = this.memoryService.db;
      const stmt = db.prepare(`
        SELECT value, confidence, metadata
        FROM semantic_memory
        WHERE session_id = ? AND key = ?
      `);
      
      const row = stmt.get(sessionId, key);
      
      this.metrics.semantic.retrieved++;
      
      if (row) {
        const result = {
          value: row.value,
          confidence: row.confidence,
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
        };
        this.cache.set(cacheKey, result);
        return result;
      }
      
      return null;
    } catch (error) {
      logger.error('[LongTermMemory] Error obteniendo hecho semántico', {
        sessionId,
        key,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Busca hechos semánticos por clave parcial
   */
  async searchSemanticFacts(sessionId, keyPrefix, limit = 10) {
    try {
      const db = this.memoryService.db;
      const stmt = db.prepare(`
        SELECT key, value, confidence, metadata, timestamp
        FROM semantic_memory
        WHERE session_id = ? AND key LIKE ?
        ORDER BY confidence DESC
        LIMIT ?
      `);
      
      const rows = stmt.all(sessionId, `${keyPrefix}%`, limit);
      
      return rows.map(row => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        timestamp: row.timestamp,
      }));
    } catch (error) {
      logger.error('[LongTermMemory] Error buscando hechos semánticos', {
        sessionId,
        keyPrefix,
        error: error.message,
      });
      return [];
    }
  }

  // ─── MEMORIA PROCEDIMENTAL ──────────────────────────────────

  /**
   * 🔒 MÉTODO PÚBLICO: Guarda un script o procedimiento
   */
  async saveProceduralFact(sessionId, key, value, confidence = 1.0, metadata = {}) {
    try {
      // 🔒 Usar método público ensureSession del MemoryService
      this.memoryService.ensureSession(sessionId);
      
      const db = this.memoryService.db;
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO procedural_memory (session_id, key, value, confidence, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(sessionId, key, value, confidence, JSON.stringify(metadata));
      
      this.metrics.procedural.saved++;
      
      logger.debug('[LongTermMemory] Procedimiento guardado', {
        sessionId,
        key,
        confidence,
      });
      
      eventBus.emit('memory:procedural_fact_saved', {
        sessionId,
        key,
        confidence,
      });
      
      return true;
    } catch (error) {
      logger.error('[LongTermMemory] Error guardando procedimiento', {
        sessionId,
        key,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Obtiene un procedimiento
   */
  async getProceduralFact(sessionId, key) {
    try {
      const db = this.memoryService.db;
      const stmt = db.prepare(`
        SELECT value, confidence, metadata
        FROM procedural_memory
        WHERE session_id = ? AND key = ?
      `);
      
      const row = stmt.get(sessionId, key);
      
      this.metrics.procedural.retrieved++;
      
      if (row) {
        return {
          value: row.value,
          confidence: row.confidence,
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
        };
      }
      
      return null;
    } catch (error) {
      logger.error('[LongTermMemory] Error obteniendo procedimiento', {
        sessionId,
        key,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Busca procedimientos por clave parcial
   */
  async searchProceduralFacts(sessionId, keyPrefix, limit = 10) {
    try {
      const db = this.memoryService.db;
      const stmt = db.prepare(`
        SELECT key, value, confidence, metadata, timestamp
        FROM procedural_memory
        WHERE session_id = ? AND key LIKE ?
        ORDER BY confidence DESC
        LIMIT ?
      `);
      
      const rows = stmt.all(sessionId, `${keyPrefix}%`, limit);
      
      return rows.map(row => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        timestamp: row.timestamp,
      }));
    } catch (error) {
      logger.error('[LongTermMemory] Error buscando procedimientos', {
        sessionId,
        keyPrefix,
        error: error.message,
      });
      return [];
    }
  }

  // ─── CONSOLIDACIÓN DE CONOCIMIENTO ──────────────────────────

  /**
   * 🔒 MÉTODO PÚBLICO: Consolida conocimiento de una interacción
   */
  async consolidateKnowledge(sessionId, interactionData) {
    const { query, response, context, metadata = {} } = interactionData;
    
    try {
      // 1. Guardar evento episódico (siempre)
      await this.saveEpisodicEvent(
        sessionId,
        'interaction',
        `Usuario: ${query.substring(0, 100)}...`,
        { responseLength: response?.length || 0, ...metadata }
      );
      
      // 2. Extraer hechos semánticos (si hay información valiosa)
      const facts = this._extractFacts(query, response);
      for (const fact of facts) {
        if (fact.confidence > 0.7) {
          await this.saveSemanticFact(
            sessionId,
            fact.key,
            fact.value,
            fact.confidence,
            fact.metadata || {}
          );
        }
      }
      
      // 3. Extraer procedimientos (si hay un flujo repetible)
      const procedures = this._extractProcedures(query, response);
      for (const proc of procedures) {
        if (proc.confidence > 0.7) {
          await this.saveProceduralFact(
            sessionId,
            proc.key,
            proc.value,
            proc.confidence,
            proc.metadata || {}
          );
        }
      }
      
      logger.debug('[LongTermMemory] Conocimiento consolidado', {
        sessionId,
        factsFound: facts.length,
        proceduresFound: procedures.length,
      });
      
      return {
        factsSaved: facts.filter(f => f.confidence > 0.7).length,
        proceduresSaved: procedures.filter(p => p.confidence > 0.7).length,
      };
      
    } catch (error) {
      logger.error('[LongTermMemory] Error consolidando conocimiento', {
        sessionId,
        error: error.message,
      });
      return { error: error.message };
    }
  }

  // ─── EXTRACCIÓN DE HECHOS (PRIVADO) ────────────────────────

  _extractFacts(query, response) {
    const facts = [];
    
    const patterns = [
      { regex: /mi color favorito es ([\wáéíóúñ]+)/i, key: 'favorite_color' },
      { regex: /me gusta el color ([\wáéíóúñ]+)/i, key: 'favorite_color' },
      { regex: /mi nombre es ([A-Za-záéíóúñ\s]+)/i, key: 'user_name' },
      { regex: /me llamo ([A-Za-záéíóúñ\s]+)/i, key: 'user_name' },
      { regex: /soy ([A-Za-záéíóúñ\s]+)/i, key: 'user_name' },
      { regex: /me interesa ([\w\s]+)/i, key: 'interest' },
      { regex: /me gusta ([\w\s]+)/i, key: 'interest' },
    ];
    
    const fullText = `${query} ${response || ''}`;
    
    for (const pattern of patterns) {
      const match = fullText.match(pattern.regex);
      if (match) {
        facts.push({
          key: pattern.key,
          value: match[1].trim(),
          confidence: 0.8,
          metadata: { source: 'pattern_match' },
        });
      }
    }
    
    if (fullText.toLowerCase().includes('instagram') || 
        fullText.toLowerCase().includes('publicar') ||
        fullText.toLowerCase().includes('redes sociales')) {
      facts.push({
        key: 'user_interest',
        value: 'social_media',
        confidence: 0.6,
        metadata: { source: 'keyword_detection' },
      });
    }
    
    return facts;
  }

  _extractProcedures(query, response) {
    const procedures = [];
    
    if (query.toLowerCase().includes('publicar') && 
        query.toLowerCase().includes('instagram')) {
      procedures.push({
        key: 'publish_to_instagram',
        value: JSON.stringify({
          steps: [
            'Preparar contenido (imagen/video)',
            'Extraer metadata del archivo .md',
            'Publicar usando InstagramPublishService',
            'Marcar como publicado en el vault',
          ],
          tools: ['instagramPublishService'],
        }),
        confidence: 0.8,
        metadata: { source: 'detected_flow' },
      });
    }
    
    if (query.toLowerCase().includes('analizar') && 
        query.toLowerCase().includes('cuenta')) {
      procedures.push({
        key: 'analyze_instagram_account',
        value: JSON.stringify({
          steps: [
            'Obtener métricas de la cuenta',
            'Calcular engagement rate',
            'Generar recomendaciones personalizadas',
          ],
          tools: ['instagramMetricsService', 'growthMarketerAgent'],
        }),
        confidence: 0.7,
        metadata: { source: 'detected_flow' },
      });
    }
    
    return procedures;
  }

  // ─── HANDLERS DE EVENTOS (PRIVADO) ─────────────────────────

  async _onResponseSent(data) {
    const { sessionId, query, response, context } = data;
    if (sessionId && query) {
      await this.consolidateKnowledge(sessionId, {
        query,
        response,
        context,
        metadata: { source: 'response_sent_event' },
      });
    }
  }

  async _onTaskCompleted(data) {
    const { taskId, type, result } = data;
    logger.debug('[LongTermMemory] Tarea completada registrada', {
      taskId,
      type,
      hasResult: !!result,
    });
  }

  // ─── MÉTRICAS Y ESTADO ──────────────────────────────────────

  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
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
      this.cache.clear();
      this.status = 'offline';
      this.initialized = false;
      
      logger.info('[LongTermMemoryService] Apagado correctamente');
      return true;
    } catch (error) {
      logger.error('[LongTermMemoryService] Error en shutdown', {
        error: error.message,
      });
      return false;
    }
  }
}

// Instancia por defecto (singleton)
const longTermMemoryService = new LongTermMemoryService();

export default longTermMemoryService;