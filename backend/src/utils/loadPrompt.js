// backend/src/utils/loadPrompt.js
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROMPTS_DIR = path.resolve(__dirname, '../config/prompts');

const cache = new Map();

const FILE_BY_MODE = {
  JARVIS: 'jarvis.txt',
  GIDEON: 'gideon.txt',
};

export async function getSystemPrompt(mode) {
  const filename = FILE_BY_MODE[mode];
  if (!filename) throw new Error(`No hay system prompt para el modo: ${mode}`);

  if (cache.has(mode)) return cache.get(mode);

  const filePath = path.join(PROMPTS_DIR, filename);
  const content = await readFile(filePath, 'utf-8');
  cache.set(mode, content.trim());
  return cache.get(mode);
}