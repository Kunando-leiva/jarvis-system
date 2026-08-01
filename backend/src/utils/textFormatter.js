// backend/src/utils/textFormatter.js
// 🎯 Funciones de formato de texto reutilizables

export function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function tryParseAction(text) {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenceMatch ? fenceMatch[1] : trimmed;

  if (!candidate.startsWith('{')) return null;

  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === 'object' && parsed.action && parsed.textResponse) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}