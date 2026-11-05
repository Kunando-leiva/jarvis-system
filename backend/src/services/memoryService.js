// backend/src/services/memoryService.js
// 🧠 SERVICIO DE MEMORIA - PERSISTENTE CON SQLITE
// 🔒 EXPONE SOLO MÉTODOS PÚBLICOS

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { logger, createTraceContext } from '../core/logger.js';
import { eventBus } from '../core/eventBus.js';
import { BaseService } from '../core/serviceInterface.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================
// 📁 CONFIGURACIÓN DE BASE DE DATOS SQLITE
// =============================================

const DB_PATH = path.join(__dirname, '../../memory.db');
let db = null;

// =============================================
// 🧠 SERVICIO DE MEMORIA
// =============================================

export class MemoryService extends BaseService {
  constructor(config = {}) {
    super(config);
    this.name = 'MemoryService';
    this.dbPath = config.dbPath || DB_PATH;
    this.db = null;
    this.initialized = false;
    this.metrics = {
      queries: 0,
      inserts: 0,
      updates: 0,
      deletes: 0,
      errors: 0,
    };
  }

  async initialize() {
    try {
      this.status = 'initializing';
      
      // Inicializar SQLite
      this.db = new Database(this.dbPath);
      
      // Crear tablas si no existen
      this.db.exec(`
        -- Tabla de sesiones
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            context TEXT,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Tabla de mensajes
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        );
        
        -- Tabla de publicaciones
        CREATE TABLE IF NOT EXISTS publications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            post_id TEXT,
            success INTEGER DEFAULT 0,
            metadata TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Tabla de estado del sistema
        CREATE TABLE IF NOT EXISTS system_state (
            key TEXT PRIMARY KEY,
            value TEXT,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Tabla de memoria episódica (Fase 1)
        CREATE TABLE IF NOT EXISTS episodic_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            summary TEXT NOT NULL,
            metadata TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        );
        
        -- Tabla de memoria semántica (Fase 1)
        CREATE TABLE IF NOT EXISTS semantic_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            confidence REAL DEFAULT 1.0,
            metadata TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(session_id, key)
        );
        
        -- Tabla de memoria procedimental (Fase 1)
        CREATE TABLE IF NOT EXISTS procedural_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            confidence REAL DEFAULT 1.0,
            metadata TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(session_id, key)
        );
        
        -- Índices para mejorar rendimiento
        CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
        CREATE INDEX IF NOT EXISTS idx_publications_timestamp ON publications(timestamp);
        CREATE INDEX IF NOT EXISTS idx_episodic_session ON episodic_memory(session_id);
        CREATE INDEX IF NOT EXISTS idx_episodic_timestamp ON episodic_memory(timestamp);
        CREATE INDEX IF NOT EXISTS idx_semantic_session ON semantic_memory(session_id);
        CREATE INDEX IF NOT EXISTS idx_procedural_session ON procedural_memory(session_id);
      `);
      
      // Verificar que funciona
      const test = this.db.prepare('SELECT 1 as test').get();
      if (!test) {
        throw new Error('No se pudo verificar la base de datos');
      }
      
      this.initialized = true;
      this.status = 'online';
      
      logger.info('[MemoryService] SQLite inicializado', {
        dbPath: this.dbPath,
        status: this.status,
      });
      
      this._emit('initialized', {
        dbPath: this.dbPath,
        tables: ['sessions', 'messages', 'publications', 'system_state', 
                 'episodic_memory', 'semantic_memory', 'procedural_memory'],
      });
      
      return true;
    } catch (error) {
      this.status = 'error';
      this.metrics.errors++;
      
      logger.error('[MemoryService] Error inicializando SQLite', {
        error: error.message,
        stack: error.stack,
      });
      
      // Fallback: base de datos en memoria
      try {
        this.db = new Database(':memory:');
        this.status = 'degraded';
        logger.warn('[MemoryService] Usando modo memoria temporal (fallback)');
        return true;
      } catch (fallbackError) {
        this.status = 'error';
        throw error;
      }
    }
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Asegura que una sesión existe en la base de datos
   * Crea la sesión si no existe, o la actualiza si ya existe
   * @param {string} sessionId - ID de la sesión
   */
  ensureSession(sessionId) {
    if (!this.db) {
      throw new Error('Base de datos no inicializada');
    }
    
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO sessions (session_id, context)
      VALUES (?, '{}')
    `);
    stmt.run(sessionId);
    
    logger.debug('[MemoryService] Sesión asegurada', { sessionId });
  }

  // ─── GUARDAR MENSAJE ──────────────────────────────────────────
  async saveMessage(sessionId, role, content, metadata = {}) {
    try {
      // 🔒 Usar método público ensureSession
      this.ensureSession(sessionId);
      
      const stmt = this.db.prepare(`
        INSERT INTO messages (session_id, role, content, metadata)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run(sessionId, role, content, JSON.stringify(metadata));
      
      this.metrics.inserts++;
      
      logger.debug('[MemoryService] Mensaje guardado', {
        sessionId,
        role,
        contentLength: content?.length || 0,
      });
      
      this._emit('message_saved', {
        sessionId,
        role,
        contentLength: content?.length || 0,
      });
      
      return true;
    } catch (error) {
      this.metrics.errors++;
      logger.error('[MemoryService] Error guardando mensaje', {
        sessionId,
        role,
        error: error.message,
      });
      return false;
    }
  }

  // ─── OBTENER HISTORIAL ──────────────────────────────────────
  async getConversationHistory(sessionId, limit = 20) {
    try {
      const stmt = this.db.prepare(`
        SELECT id, role, content, timestamp, metadata
        FROM messages
        WHERE session_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);
      
      const rows = stmt.all(sessionId, limit);
      
      this.metrics.queries++;
      
      const result = rows.map(row => ({
        ...row,
        timestamp: row.timestamp,
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      })).reverse();
      
      logger.debug('[MemoryService] Historial obtenido', {
        sessionId,
        limit,
        count: result.length,
      });
      
      return result;
    } catch (error) {
      this.metrics.errors++;
      logger.error('[MemoryService] Error obteniendo historial', {
        sessionId,
        error: error.message,
      });
      return [];
    }
  }

  // ─── GUARDAR CONTEXTO ────────────────────────────────────────
  async saveContext(sessionId, context) {
    try {
      // 🔒 Usar método público ensureSession
      this.ensureSession(sessionId);
      
      // Obtener contexto existente
      const existing = this.db
        .prepare('SELECT context FROM sessions WHERE session_id = ?')
        .get(sessionId);
      
      let mergedContext = context;
      
      if (existing && existing.context) {
        try {
          const oldContext = JSON.parse(existing.context);
          mergedContext = { ...oldContext, ...context };
        } catch (e) {
          // Si no se puede parsear, usar el nuevo
        }
      }
      
      const stmt = this.db.prepare(`
        UPDATE sessions 
        SET context = ?, last_updated = CURRENT_TIMESTAMP
        WHERE session_id = ?
      `);
      
      stmt.run(JSON.stringify(mergedContext), sessionId);
      
      this.metrics.updates++;
      
      logger.debug('[MemoryService] Contexto guardado', {
        sessionId,
        contextKeys: Object.keys(mergedContext),
      });
      
      return true;
    } catch (error) {
      this.metrics.errors++;
      logger.error('[MemoryService] Error guardando contexto', {
        sessionId,
        error: error.message,
      });
      return false;
    }
  }

  // ─── OBTENER CONTEXTO ────────────────────────────────────────
  async getContext(sessionId) {
    try {
      const stmt = this.db.prepare('SELECT context FROM sessions WHERE session_id = ?');
      const row = stmt.get(sessionId);
      
      this.metrics.queries++;
      
      if (row && row.context) {
        try {
          return JSON.parse(row.context);
        } catch (e) {
          return {};
        }
      }
      return {};
    } catch (error) {
      this.metrics.errors++;
      logger.error('[MemoryService] Error obteniendo contexto', {
        sessionId,
        error: error.message,
      });
      return {};
    }
  }

  // ─── GUARDAR PUBLICACIÓN ────────────────────────────────────
  async savePublication(publicationData) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO publications (titulo, post_id, success, metadata)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run(
        publicationData.titulo,
        publicationData.postId || null,
        publicationData.success ? 1 : 0,
        JSON.stringify(publicationData.metadata || {})
      );
      
      this.metrics.inserts++;
      
      logger.info('[MemoryService] Publicación guardada', {
        titulo: publicationData.titulo,
        postId: publicationData.postId,
        success: publicationData.success,
      });
      
      return true;
    } catch (error) {
      this.metrics.errors++;
      logger.error('[MemoryService] Error guardando publicación', {
        titulo: publicationData.titulo,
        error: error.message,
      });
      return false;
    }
  }

  // ─── OBTENER PUBLICACIONES ──────────────────────────────────
  async getPublications(limit = 50) {
    try {
      const stmt = this.db.prepare(`
        SELECT id, titulo, post_id, success, metadata, timestamp
        FROM publications
        ORDER BY timestamp DESC
        LIMIT ?
      `);
      
      const rows = stmt.all(limit);
      
      this.metrics.queries++;
      
      return rows.map(row => ({
        ...row,
        success: row.success === 1,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        timestamp: row.timestamp,
      }));
    } catch (error) {
      this.metrics.errors++;
      logger.error('[MemoryService] Error obteniendo publicaciones', {
        limit,
        error: error.message,
      });
      return [];
    }
  }

  // ─── GUARDAR ESTADO DEL SISTEMA ─────────────────────────────
  async saveSystemState(state) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO system_state (key, value, last_updated)
        VALUES ('system_state', ?, CURRENT_TIMESTAMP)
      `);
      
      stmt.run(JSON.stringify(state));
      
      this.metrics.updates++;
      
      logger.debug('[MemoryService] Estado del sistema guardado');
      return true;
    } catch (error) {
      this.metrics.errors++;
      logger.error('[MemoryService] Error guardando estado', {
        error: error.message,
      });
      return false;
    }
  }

  // ─── OBTENER ESTADO DEL SISTEMA ─────────────────────────────
  async getSystemState() {
    try {
      const stmt = this.db.prepare('SELECT value FROM system_state WHERE key = ?');
      const row = stmt.get('system_state');
      
      this.metrics.queries++;
      
      if (row && row.value) {
        try {
          return JSON.parse(row.value);
        } catch (e) {
          return { mode: 'JARVIS' };
        }
      }
      return { mode: 'JARVIS' };
    } catch (error) {
      this.metrics.errors++;
      logger.error('[MemoryService] Error obteniendo estado', {
        error: error.message,
      });
      return { mode: 'JARVIS' };
    }
  }

  // ─── LIMPIAR SESIÓN ──────────────────────────────────────────
  async clearSession(sessionId) {
    try {
      // Eliminar mensajes
      this.db.prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);
      // Eliminar contexto
      this.db.prepare('DELETE FROM sessions WHERE session_id = ?').run(sessionId);
      // Eliminar memoria episódica
      this.db.prepare('DELETE FROM episodic_memory WHERE session_id = ?').run(sessionId);
      // Eliminar memoria semántica
      this.db.prepare('DELETE FROM semantic_memory WHERE session_id = ?').run(sessionId);
      // Eliminar memoria procedimental
      this.db.prepare('DELETE FROM procedural_memory WHERE session_id = ?').run(sessionId);
      
      this.metrics.deletes++;
      
      logger.info('[MemoryService] Sesión limpiada', {
        sessionId,
      });
      
      return true;
    } catch (error) {
      this.metrics.errors++;
      logger.error('[MemoryService] Error limpiando sesión', {
        sessionId,
        error: error.message,
      });
      return false;
    }
  }

  // ─── OBTENER MÉTRICAS ─────────────────────────────────────────
  getMetrics() {
    try {
      const sessionCount = this.db
        .prepare('SELECT COUNT(*) as count FROM sessions')
        .get().count;
      const messageCount = this.db
        .prepare('SELECT COUNT(*) as count FROM messages')
        .get().count;
      const publicationCount = this.db
        .prepare('SELECT COUNT(*) as count FROM publications')
        .get().count;
      
      return {
        ...this.metrics,
        sessions: sessionCount,
        messages: messageCount,
        publications: publicationCount,
        dbSize: fs.existsSync(this.dbPath) 
          ? fs.statSync(this.dbPath).size 
          : 0,
      };
    } catch (error) {
      return {
        ...this.metrics,
        error: error.message,
      };
    }
  }

  // ─── OBTENER ESTADO ───────────────────────────────────────────
  getStatus() {
    return {
      name: this.name,
      status: this.status,
      initialized: this.initialized,
      dbPath: this.dbPath,
      metrics: this.getMetrics(),
    };
  }

  // ─── APAGAR ───────────────────────────────────────────────────
  async shutdown() {
    try {
      if (this.db) {
        this.db.close();
      }
      this.status = 'offline';
      this.initialized = false;
      
      logger.info('[MemoryService] Apagado correctamente');
      
      this._emit('shutdown', {
        dbPath: this.dbPath,
      });
      
      return true;
    } catch (error) {
      logger.error('[MemoryService] Error en shutdown', {
        error: error.message,
      });
      return false;
    }
  }
}

// Crear instancia por defecto (singleton)
const memoryService = new MemoryService();

export default memoryService;