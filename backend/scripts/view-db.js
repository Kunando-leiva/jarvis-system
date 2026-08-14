// backend/scripts/view-db.js
// 📊 Script para ver el contenido de la base de datos SQLite

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = path.join(__dirname, '../memory.db');

console.log('\n' + '='.repeat(60));
console.log('📊 JARVIS - BASE DE DATOS SQLITE');
console.log('='.repeat(60) + '\n');

try {
    const db = new Database(DB_PATH);
    
    // ─── SESIONES ──────────────────────────────────────────────
    console.log('📋 SESIONES ACTIVAS:');
    const sessions = db.prepare(`
        SELECT session_id, context, last_updated 
        FROM sessions 
        ORDER BY last_updated DESC
    `).all();
    
    if (sessions.length === 0) {
        console.log('  ⚠️ No hay sesiones guardadas');
    } else {
        sessions.forEach(s => {
            console.log(`  🆔 ${s.session_id}`);
            console.log(`     📅 ${s.last_updated}`);
            try {
                const context = JSON.parse(s.context);
                console.log(`     📝 Contexto: ${Object.keys(context).join(', ') || 'vacío'}`);
            } catch (e) {
                console.log(`     📝 Contexto: ${s.context?.substring(0, 50)}...`);
            }
            console.log('');
        });
    }
    
    // ─── MENSAJES ──────────────────────────────────────────────
    console.log('\n💬 ÚLTIMOS MENSAJES:');
    const messages = db.prepare(`
        SELECT session_id, role, content, timestamp 
        FROM messages 
        ORDER BY timestamp DESC 
        LIMIT 10
    `).all();
    
    if (messages.length === 0) {
        console.log('  ⚠️ No hay mensajes guardados');
    } else {
        messages.forEach(m => {
            const preview = m.content?.substring(0, 60) || '';
            console.log(`  ${m.role === 'user' ? '👤' : '🤖'} ${m.role}: ${preview}${m.content?.length > 60 ? '...' : ''}`);
            console.log(`     📅 ${m.timestamp}`);
            console.log(`     🆔 ${m.session_id}`);
            console.log('');
        });
    }
    
    // ─── PUBLICACIONES ──────────────────────────────────────────
    console.log('\n📤 PUBLICACIONES GUARDADAS:');
    const pubs = db.prepare(`
        SELECT titulo, post_id, success, timestamp 
        FROM publications 
        ORDER BY timestamp DESC 
        LIMIT 5
    `).all();
    
    if (pubs.length === 0) {
        console.log('  ⚠️ No hay publicaciones guardadas');
    } else {
        pubs.forEach(p => {
            console.log(`  📌 ${p.titulo}`);
            console.log(`     🆔 ${p.post_id || 'Sin ID'}`);
            console.log(`     ✅ ${p.success ? 'Publicado' : 'Pendiente'}`);
            console.log(`     📅 ${p.timestamp}`);
            console.log('');
        });
    }
    
    // ─── ESTADO DEL SISTEMA ──────────────────────────────────────
    console.log('\n💻 ESTADO DEL SISTEMA:');
    const state = db.prepare(`SELECT * FROM system_state`).all();
    
    if (state.length === 0) {
        console.log('  ⚠️ No hay estado guardado');
    } else {
        state.forEach(s => {
            console.log(`  🔑 ${s.key}:`);
            try {
                const value = JSON.parse(s.value);
                console.log(`     📝 ${JSON.stringify(value, null, 2)}`);
            } catch (e) {
                console.log(`     📝 ${s.value}`);
            }
            console.log(`     📅 ${s.last_updated}`);
            console.log('');
        });
    }
    
    // ─── ESTADÍSTICAS ──────────────────────────────────────────
    console.log('\n📊 ESTADÍSTICAS:');
    const stats = {
        sessions: db.prepare('SELECT COUNT(*) as count FROM sessions').get().count,
        messages: db.prepare('SELECT COUNT(*) as count FROM messages').get().count,
        publications: db.prepare('SELECT COUNT(*) as count FROM publications').get().count
    };
    console.log(`  📋 Sesiones: ${stats.sessions}`);
    console.log(`  💬 Mensajes: ${stats.messages}`);
    console.log(`  📤 Publicaciones: ${stats.publications}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Vista completada');
    
    db.close();
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Asegúrate de que el servidor haya ejecutado al menos una vez para crear la DB.');
}