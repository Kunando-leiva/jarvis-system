// backend/scripts/backup-db.js
// 💾 Script para hacer backup de la base de datos

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = path.join(__dirname, '../memory.db');

if (!fs.existsSync(DB_PATH)) {
    console.log('❌ No se encontró la base de datos en:', DB_PATH);
    process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(__dirname, `../backups/memory-${timestamp}.db`);

// Crear carpeta de backups si no existe
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

try {
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`✅ Backup creado: ${backupPath}`);
    
    // Mostrar tamaño
    const stats = fs.statSync(backupPath);
    console.log(`📦 Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
    
    // Listar backups existentes
    const backups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('memory-') && f.endsWith('.db'))
        .sort();
    
    console.log(`\n📂 Backups disponibles (${backups.length}):`);
    backups.slice(-5).forEach(b => console.log(`  - ${b}`));
    
} catch (error) {
    console.error('❌ Error creando backup:', error.message);
}