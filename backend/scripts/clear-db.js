// backend/scripts/clear-db.js
// 🧹 Script para limpiar la base de datos

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = path.join(__dirname, '../memory.db');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n⚠️  ADVERTENCIA: Esto eliminará TODOS los datos de la base de datos.');
console.log('📋 Datos que se eliminarán:');
console.log('  - Todas las sesiones y contextos');
console.log('  - Todos los mensajes');
console.log('  - Todas las publicaciones guardadas');
console.log('  - Estado del sistema\n');

rl.question('¿Estás seguro? (escribe "yes" para confirmar): ', (answer) => {
    if (answer.toLowerCase() === 'yes') {
        try {
            const db = new Database(DB_PATH);
            
            console.log('\n🧹 Limpiando base de datos...');
            
            db.prepare('DELETE FROM messages').run();
            db.prepare('DELETE FROM sessions').run();
            db.prepare('DELETE FROM publications').run();
            db.prepare('DELETE FROM system_state').run();
            
            // Vaciar la base de datos (compactar)
            db.prepare('VACUUM').run();
            
            console.log('✅ Base de datos limpiada correctamente');
            db.close();
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    } else {
        console.log('❌ Operación cancelada');
    }
    
    rl.close();
});