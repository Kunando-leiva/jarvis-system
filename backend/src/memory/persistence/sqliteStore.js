// backend/src/memory/persistence/sqliteStore.js

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

class SQLiteStore {
  async init(dbPath = './memory.db') {
    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await this.createTables();
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
        session_id TEXT NOT NULL,
        metadata TEXT,
        status TEXT DEFAULT 'active'
      );

      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id);
      CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);
      CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);
    `);
  }

  async save(memory) {
    await this.db.run(`
      INSERT OR REPLACE INTO memories (
        id, type, content, source, importance, confidence,
        created_at, updated_at, last_accessed_at, tags,
        session_id, metadata, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      memory.id,
      memory.type,
      memory.content,
      memory.source,
      memory.importance,
      memory.confidence,
      memory.createdAt,
      memory.updatedAt,
      memory.lastAccessedAt,
      JSON.stringify(memory.tags || []),
      memory.sessionId,
      JSON.stringify(memory.metadata || {}),
      memory.status || 'active'
    ]);
  }

  async get(id) {
    const row = await this.db.get(
      'SELECT * FROM memories WHERE id = ?',
      [id]
    );
    return this.rowToMemory(row);
  }

  async search(query, options = {}) {
    const { limit = 20 } = options;
    const rows = await this.db.all(`
      SELECT * FROM memories 
      WHERE content LIKE ? 
        AND status = 'active'
      ORDER BY last_accessed_at DESC
      LIMIT ?
    `, [`%${query}%`, limit]);

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
      sessionId: row.session_id,
      metadata: JSON.parse(row.metadata || '{}'),
      status: row.status
    };
  }
}