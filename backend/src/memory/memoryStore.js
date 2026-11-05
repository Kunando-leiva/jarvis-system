// backend/src/memory/memoryStore.js
// 🗄️ ALMACENAMIENTO DE MEMORIA (SQLite) - CON userId PERSISTENTE

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { logger } from '../core/logger.js';
import { MEMORY_STATUS } from './memoryTypes.js';

class MemoryStore {
  constructor(dbPath = './data/memory.db') {
    this.dbPath = dbPath;
    this.db = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      await this.createTables();
      this.initialized = true;
      logger.info('[MemoryStore] Inicializado', { dbPath: this.dbPath });
    } catch (error) {
      logger.error('[MemoryStore] Error inicializando', {
        error: error.message
      });
      throw error;
    }
  }

  async createTables() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        importance INTEGER DEFAULT 3,
        confidence REAL DEFAULT 1.0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_accessed_at TEXT NOT NULL,
        tags TEXT,
        user_id TEXT NOT NULL DEFAULT 'anonymous',
        session_id TEXT NOT NULL,
        metadata TEXT,
        status TEXT DEFAULT 'active'
      );

      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
      CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id);
      CREATE INDEX IF NOT EXISTS idx_memories_user_session ON memories(user_id, session_id);
      CREATE INDEX IF NOT EXISTS idx_memories_type_user ON memories(type, user_id);
      CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);
      CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
    `);

    // Crear tabla para embeddings (Fase 4.3)
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_embeddings (
        memory_id TEXT PRIMARY KEY,
        embedding TEXT NOT NULL,
        model TEXT DEFAULT 'default',
        created_at TEXT NOT NULL,
        FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
      );
    `);
  }

  async save(memory) {
    if (!this.initialized) await this.init();

    // ✅ userId es obligatorio
    if (!memory.userId) {
      throw new Error('userId es requerido para guardar memoria');
    }

    // ✅ sessionId es obligatorio
    if (!memory.sessionId) {
      throw new Error('sessionId es requerido para guardar memoria');
    }

    const now = new Date().toISOString();

    await this.db.run(`
      INSERT OR REPLACE INTO memories (
        id, type, content, source, importance, confidence,
        created_at, updated_at, last_accessed_at, tags,
        user_id, session_id, metadata, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      memory.id,
      memory.type,
      memory.content,
      memory.source || 'system',
      memory.importance || 3,
      memory.confidence || 1.0,
      memory.createdAt || now,
      memory.updatedAt || now,
      memory.lastAccessedAt || now,
      JSON.stringify(memory.tags || []),
      memory.userId,
      memory.sessionId,
      JSON.stringify(memory.metadata || {}),
      memory.status || 'active'
    ]);

    return memory;
  }

  async get(id) {
    if (!this.initialized) await this.init();

    const row = await this.db.get(
      'SELECT * FROM memories WHERE id = ?',
      [id]
    );
    return this.rowToMemory(row);
  }

  async search(query, options = {}) {
    if (!this.initialized) await this.init();

    const { limit = 20, type = null, userId = null, sessionId = null } = options;

    let sql = `SELECT * FROM memories WHERE status = 'active'`;
    const params = [];

    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }

    if (sessionId) {
      sql += ` AND session_id = ?`;
      params.push(sessionId);
    }

    if (query && query.trim()) {
      sql += ` AND content LIKE ?`;
      params.push(`%${query}%`);
    }

    if (type) {
      sql += ` AND type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY last_accessed_at DESC LIMIT ?`;
    params.push(limit);

    const rows = await this.db.all(sql, params);
    return rows.map(this.rowToMemory);
  }

  async list(filters = {}) {
    if (!this.initialized) await this.init();

    const {
      limit = 50,
      offset = 0,
      type = null,
      userId = null,
      sessionId = null,
      status = 'active',
      minImportance = 0
    } = filters;

    // ✅ userId es obligatorio para listar
    if (!userId) {
      throw new Error('userId es requerido para listar memorias');
    }

    let sql = `SELECT * FROM memories WHERE user_id = ?`;
    const params = [userId];

    if (sessionId) {
      sql += ` AND session_id = ?`;
      params.push(sessionId);
    }

    if (type) {
      sql += ` AND type = ?`;
      params.push(type);
    }

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (minImportance > 0) {
      sql += ` AND importance >= ?`;
      params.push(minImportance);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = await this.db.all(sql, params);
    return rows.map(this.rowToMemory);
  }

  // ✅ NUEVO: Recuperación determinista por userId + key
  async getByKey(key, userId, sessionId = null) {
    if (!this.initialized) await this.init();

    if (!userId) {
      throw new Error('userId es requerido para getByKey');
    }

    let sql = `SELECT * FROM memories WHERE user_id = ? AND type = ? AND status = 'active'`;
    const params = [userId, key];

    if (sessionId) {
      sql += ` AND session_id = ?`;
      params.push(sessionId);
    }

    sql += ` ORDER BY created_at DESC LIMIT 1`;

    const row = await this.db.get(sql, params);
    return this.rowToMemory(row);
  }

  // ✅ NUEVO: Obtener toda la información personal de un usuario
  async getPersonalInfo(userId) {
    if (!this.initialized) await this.init();

    if (!userId) {
      throw new Error('userId es requerido para getPersonalInfo');
    }

    const personalTypes = [
      'user_name', 'favorite_color', 'favorite_food', 'favorite_music',
      'occupation', 'location', 'project_name', 'tech_stack', 'birthday'
    ];

    const placeholders = personalTypes.map(() => '?').join(',');
    const sql = `
      SELECT * FROM memories 
      WHERE user_id = ? AND type IN (${placeholders}) AND status = 'active'
      ORDER BY created_at DESC
    `;

    const rows = await this.db.all(sql, [userId, ...personalTypes]);
    return rows.map(this.rowToMemory);
  }

  async update(id, data) {
    if (!this.initialized) await this.init();

    const now = new Date().toISOString();
    const updates = [];
    const params = [];

    for (const [key, value] of Object.entries(data)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updates.push(`${dbKey} = ?`);

      if (key === 'tags' || key === 'metadata') {
        params.push(JSON.stringify(value));
      } else {
        params.push(value);
      }
    }

    updates.push('updated_at = ?');
    params.push(now);

    params.push(id);

    await this.db.run(`
      UPDATE memories SET ${updates.join(', ')} WHERE id = ?
    `, params);

    return this.get(id);
  }

  async delete(id, soft = true) {
    if (!this.initialized) await this.init();

    if (soft) {
      await this.db.run(
        `UPDATE memories SET status = 'deprecated', updated_at = ? WHERE id = ?`,
        [new Date().toISOString(), id]
      );
    } else {
      await this.db.run(`DELETE FROM memories WHERE id = ?`, [id]);
    }

    return true;
  }

  async count(filters = {}) {
    if (!this.initialized) await this.init();

    const { type = null, userId = null, sessionId = null, status = 'active' } = filters;

    let sql = `SELECT COUNT(*) as count FROM memories WHERE 1=1`;
    const params = [];

    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }

    if (sessionId) {
      sql += ` AND session_id = ?`;
      params.push(sessionId);
    }

    if (type) {
      sql += ` AND type = ?`;
      params.push(type);
    }

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    const result = await this.db.get(sql, params);
    return result ? result.count : 0;
  }

  async getBySession(sessionId, userId, limit = 50) {
    if (!this.initialized) await this.init();

    const rows = await this.db.all(
      `SELECT * FROM memories 
       WHERE session_id = ? AND user_id = ? AND status = 'active'
       ORDER BY created_at DESC LIMIT ?`,
      [sessionId, userId, limit]
    );
    return rows.map(this.rowToMemory);
  }

  rowToMemory(row) {
    if (!row) return null;
    return {
      id: row.id,
      type: row.type,
      content: row.content,
      source: row.source,
      importance: row.importance,
      confidence: row.confidence,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastAccessedAt: row.last_accessed_at,
      tags: JSON.parse(row.tags || '[]'),
      userId: row.user_id,
      sessionId: row.session_id,
      metadata: JSON.parse(row.metadata || '{}'),
      status: row.status
    };
  }

  async close() {
    if (this.db) {
      await this.db.close();
      this.initialized = false;
    }
  }
}

export default MemoryStore;