// backend/scripts/migrate_memory_db.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../data/memory.db');

async function migrate() {
  console.log('📂 Base de datos:', DB_PATH);

  if (!fs.existsSync(DB_PATH)) {
    console.log('⚠️ La base de datos no existe. Creando nueva...');
    return;
  }

  console.log('🔄 Migrando base de datos...');

  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  try {
    const tableInfo = await db.all(`PRAGMA table_info(memories)`);
    const hasUserId = tableInfo.some(col => col.name === 'user_id');

    if (hasUserId) {
      console.log('✅ user_id ya existe.');
      await db.close();
      return;
    }

    console.log('📝 Agregando user_id...');

    await db.exec(`
      CREATE TABLE memories_new (
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
    `);

    await db.exec(`
      INSERT INTO memories_new (
        id, type, content, source, importance, confidence,
        created_at, updated_at, last_accessed_at, tags,
        user_id, session_id, metadata, status
      )
      SELECT 
        id, type, content, source, importance, confidence,
        created_at, updated_at, last_accessed_at, tags,
        'anonymous' as user_id,
        session_id,
        metadata,
        status
      FROM memories;
    `);

    await db.exec(`DROP TABLE memories`);
    await db.exec(`ALTER TABLE memories_new RENAME TO memories`);

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
      CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id);
      CREATE INDEX IF NOT EXISTS idx_memories_user_session ON memories(user_id, session_id);
      CREATE INDEX IF NOT EXISTS idx_memories_type_user ON memories(type, user_id);
    `);

    console.log('✅ Migración completada');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.close();
  }
}

migrate();
