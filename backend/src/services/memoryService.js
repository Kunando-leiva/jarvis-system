// backend/src/services/memoryService.js
// 🧠 SERVICIO DE MEMORIA CON SQLITE - PERSISTENTE Y SIN DEPENDENCIAS EXTERNAS

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================
// 📁 CONFIGURACIÓN DE BASE DE DATOS SQLITE
// =============================================

const DB_PATH = path.join(__dirname, '../../memory.db');
let db = null;

// Inicializar SQLite
try {
    db = new Database(DB_PATH);
    console.log('[Memory] ✅ SQLite inicializado en:', DB_PATH);
    
    // Crear tablas si no existen
    db.exec(`
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
        
        -- Índices para mejorar rendimiento
        CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
        CREATE INDEX IF NOT EXISTS idx_publications_timestamp ON publications(timestamp);
    `);
    
    console.log('[Memory] ✅ Tablas creadas/verificadas');
    
    // Verificar que funciona
    const test = db.prepare('SELECT 1 as test').get();
    if (test) {
        console.log('[Memory] ✅ Base de datos funcionando correctamente');
    }
    
} catch (error) {
    console.error('[Memory] ❌ Error inicializando SQLite:', error.message);
    console.log('[Memory] ⚠️ Usando modo memoria temporal');
    // Fallback: base de datos en memoria
    db = new Database(':memory:');
}

// =============================================
// 🧠 SERVICIO DE MEMORIA
// =============================================

class MemoryService {
    
    // ─── GUARDAR MENSAJE ──────────────────────────────────────────
    async saveMessage(sessionId, role, content, metadata = {}) {
        try {
            // Asegurar que la sesión existe
            this._ensureSession(sessionId);
            
            const stmt = db.prepare(`
                INSERT INTO messages (session_id, role, content, metadata)
                VALUES (?, ?, ?, ?)
            `);
            
            stmt.run(sessionId, role, content, JSON.stringify(metadata));
            
            console.log(`[Memory] 💾 Mensaje guardado: ${sessionId} - ${role}`);
            return true;
        } catch (error) {
            console.error('[Memory] ❌ Error guardando mensaje:', error.message);
            return false;
        }
    }
    
    // ─── OBTENER HISTORIAL ──────────────────────────────────────
    async getConversationHistory(sessionId, limit = 20) {
        try {
            const stmt = db.prepare(`
                SELECT id, role, content, timestamp, metadata
                FROM messages
                WHERE session_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            `);
            
            const rows = stmt.all(sessionId, limit);
            
            // Convertir timestamps y parsear metadata
            return rows.map(row => ({
                ...row,
                timestamp: row.timestamp,
                metadata: row.metadata ? JSON.parse(row.metadata) : {}
            })).reverse();
            
        } catch (error) {
            console.error('[Memory] ❌ Error obteniendo historial:', error.message);
            return [];
        }
    }
    
    // ─── GUARDAR CONTEXTO ────────────────────────────────────────
    async saveContext(sessionId, context) {
        try {
            this._ensureSession(sessionId);
            
            // Obtener contexto existente
            const existing = db.prepare('SELECT context FROM sessions WHERE session_id = ?').get(sessionId);
            let mergedContext = context;
            
            if (existing && existing.context) {
                try {
                    const oldContext = JSON.parse(existing.context);
                    mergedContext = { ...oldContext, ...context };
                } catch (e) {
                    // Si no se puede parsear, usar el nuevo
                }
            }
            
            const stmt = db.prepare(`
                UPDATE sessions 
                SET context = ?, last_updated = CURRENT_TIMESTAMP
                WHERE session_id = ?
            `);
            
            stmt.run(JSON.stringify(mergedContext), sessionId);
            
            console.log(`[Memory] 📝 Contexto guardado para: ${sessionId}`);
            return true;
            
        } catch (error) {
            console.error('[Memory] ❌ Error guardando contexto:', error.message);
            return false;
        }
    }
    
    // ─── OBTENER CONTEXTO ────────────────────────────────────────
    async getContext(sessionId) {
        try {
            const stmt = db.prepare('SELECT context FROM sessions WHERE session_id = ?');
            const row = stmt.get(sessionId);
            
            if (row && row.context) {
                try {
                    return JSON.parse(row.context);
                } catch (e) {
                    return {};
                }
            }
            return {};
            
        } catch (error) {
            console.error('[Memory] ❌ Error obteniendo contexto:', error.message);
            return {};
        }
    }
    
    // ─── GUARDAR PUBLICACIÓN ────────────────────────────────────
    async savePublication(publicationData) {
        try {
            const stmt = db.prepare(`
                INSERT INTO publications (titulo, post_id, success, metadata)
                VALUES (?, ?, ?, ?)
            `);
            
            stmt.run(
                publicationData.titulo,
                publicationData.postId || null,
                publicationData.success ? 1 : 0,
                JSON.stringify(publicationData.metadata || {})
            );
            
            console.log(`[Memory] 📤 Publicación guardada: ${publicationData.titulo}`);
            return true;
            
        } catch (error) {
            console.error('[Memory] ❌ Error guardando publicación:', error.message);
            return false;
        }
    }
    
    // ─── OBTENER PUBLICACIONES ──────────────────────────────────
    async getPublications(limit = 50) {
        try {
            const stmt = db.prepare(`
                SELECT id, titulo, post_id, success, metadata, timestamp
                FROM publications
                ORDER BY timestamp DESC
                LIMIT ?
            `);
            
            const rows = stmt.all(limit);
            
            return rows.map(row => ({
                ...row,
                success: row.success === 1,
                metadata: row.metadata ? JSON.parse(row.metadata) : {},
                timestamp: row.timestamp
            }));
            
        } catch (error) {
            console.error('[Memory] ❌ Error obteniendo publicaciones:', error.message);
            return [];
        }
    }
    
    // ─── GUARDAR ESTADO DEL SISTEMA ─────────────────────────────
    async saveSystemState(state) {
        try {
            const stmt = db.prepare(`
                INSERT OR REPLACE INTO system_state (key, value, last_updated)
                VALUES ('system_state', ?, CURRENT_TIMESTAMP)
            `);
            
            stmt.run(JSON.stringify(state));
            
            console.log('[Memory] 💻 Estado del sistema guardado');
            return true;
            
        } catch (error) {
            console.error('[Memory] ❌ Error guardando estado:', error.message);
            return false;
        }
    }
    
    // ─── OBTENER ESTADO DEL SISTEMA ─────────────────────────────
    async getSystemState() {
        try {
            const stmt = db.prepare('SELECT value FROM system_state WHERE key = ?');
            const row = stmt.get('system_state');
            
            if (row && row.value) {
                try {
                    return JSON.parse(row.value);
                } catch (e) {
                    return { mode: 'JARVIS' };
                }
            }
            return { mode: 'JARVIS' };
            
        } catch (error) {
            console.error('[Memory] ❌ Error obteniendo estado:', error.message);
            return { mode: 'JARVIS' };
        }
    }
    
    // ─── LIMPIAR SESIÓN ──────────────────────────────────────────
    async clearSession(sessionId) {
        try {
            // Eliminar mensajes
            db.prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);
            // Eliminar contexto
            db.prepare('DELETE FROM sessions WHERE session_id = ?').run(sessionId);
            
            console.log(`[Memory] 🧹 Sesión limpiada: ${sessionId}`);
            return true;
            
        } catch (error) {
            console.error('[Memory] ❌ Error limpiando sesión:', error.message);
            return false;
        }
    }
    
    // ─── PRIVADO: Asegurar que la sesión existe ────────────────
    _ensureSession(sessionId) {
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO sessions (session_id, context)
            VALUES (?, '{}')
        `);
        stmt.run(sessionId);
    }
}

// Exportar la instancia
const memoryService = new MemoryService();
export default memoryService;