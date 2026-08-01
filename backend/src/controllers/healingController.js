// ============================================================
// backend/src/controllers/healingController.js
// Módulo 6: Self-Healing con cortafuegos Human-in-the-loop
// ============================================================

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

// ──────────────────────────────────────────────────────────────
// REGLA 1 · CAJA FUERTE: ruta absoluta única permitida
// El resolver parte siempre de la ubicación de este controlador,
// sube dos niveles y apunta a services/skills.js.
// Ningún otro path puede ser leído ni escrito por estas funciones.
// ──────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAFE_PATH = path.resolve(__dirname, '..', 'services', 'skills.js');
const BACKUP_PATH = SAFE_PATH + '.bak';

/**
 * Lanza un error si `targetPath` no coincide exactamente con SAFE_PATH.
 * Protege contra path-traversal y cualquier intento de la IA de apuntar a otro archivo.
 */
function assertSafePath(targetPath) {
  const resolved = path.resolve(targetPath);
  if (resolved !== SAFE_PATH) {
    throw new Error(
      `[CORTAFUEGO] Acceso denegado. Ruta solicitada: "${resolved}". Solo se permite: "${SAFE_PATH}".`
    );
  }
}

// ──────────────────────────────────────────────────────────────
// REGLA 3 · PATIO CERRADO: validación sintáctica con vm.Script
// ──────────────────────────────────────────────────────────────

/**
 * Valida que `code` sea JavaScript sintácticamente correcto.
 * Usa vm.Script de Node.js (compilación sin ejecución) para detectar errores.
 * @param {string} code
 * @throws {Error} si la sintaxis es inválida
 */
function assertValidSyntax(code) {
  try {
    new vm.Script(code); // solo compila, nunca ejecuta
  } catch (syntaxErr) {
    throw new Error(`[SANDBOX] Código rechazado por error de sintaxis: ${syntaxErr.message}`);
  }
}

// ──────────────────────────────────────────────────────────────
// API pública del controlador
// ──────────────────────────────────────────────────────────────

/**
 * Lee el contenido actual de skills.js y lo devuelve como string.
 * Llamado por el evento 'request-skills'.
 * @returns {Promise<string>}
 */
export async function readSkills() {
  assertSafePath(SAFE_PATH);
  const content = await fs.readFile(SAFE_PATH, 'utf-8');
  return content;
}

/**
 * Aplica un parche aprobado por el usuario sobre skills.js.
 * Ejecuta todos los cortafuegos antes de tocar el disco.
 *
 * Flujo:
 *  1. Valida que la ruta sea la permitida (Caja Fuerte)
 *  2. Valida sintaxis JavaScript (Patio Cerrado)
 *  3. Crea backup automático antes de escribir
 *  4. Escribe el nuevo contenido
 *
 * @param {string} newCode - Código propuesto por la IA y aprobado por el usuario
 * @returns {Promise<{ success: boolean, backupCreated: boolean, message: string }>}
 */
export async function applyPatch(newCode) {
  // ── Cortafuego 1: ruta ──
  assertSafePath(SAFE_PATH);

  // ── Cortafuego 2: .env y API keys nunca en el código ──
  const forbidden = ['.env', 'process.env', 'API_KEY', 'SECRET'];
  for (const token of forbidden) {
    if (newCode.includes(token)) {
      throw new Error(
        `[CORTAFUEGO] El código propuesto contiene el término prohibido "${token}". Parche rechazado.`
      );
    }
  }

  // ── Cortafuego 3: sintaxis ──
  assertValidSyntax(newCode);

  // ── Backup automático ──
  let backupCreated = false;
  try {
    const current = await fs.readFile(SAFE_PATH, 'utf-8');
    await fs.writeFile(BACKUP_PATH, current, 'utf-8');
    backupCreated = true;
    console.log(`[Self-Healing] Backup creado en: ${BACKUP_PATH}`);
  } catch (backupErr) {
    console.warn('[Self-Healing] No se pudo crear backup:', backupErr.message);
  }

  // ── Escritura del parche ──
  await fs.writeFile(SAFE_PATH, newCode, 'utf-8');
  console.log(`[Self-Healing] Parche aplicado exitosamente en: ${SAFE_PATH}`);

  return {
    success: true,
    backupCreated,
    message: `Parche aplicado. ${backupCreated ? 'Backup guardado en skills.js.bak.' : 'Sin backup previo.'}`,
  };
}

/**
 * Restaura skills.js desde el backup (.bak) si existe.
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function rollbackSkills() {
  try {
    const bak = await fs.readFile(BACKUP_PATH, 'utf-8');
    assertValidSyntax(bak);
    await fs.writeFile(SAFE_PATH, bak, 'utf-8');
    console.log('[Self-Healing] Rollback aplicado desde backup.');
    return { success: true, message: 'Rollback exitoso. skills.js restaurado desde backup.' };
  } catch (err) {
    return { success: false, message: `Rollback fallido: ${err.message}` };
  }
}