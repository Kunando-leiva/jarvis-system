// backend/src/knowledge/methodValidator.js
// 🧪 VALIDADOR DE MÉTODOS

const INVALID_METHOD_NAMES = new Set([
  // Palabras reservadas de JavaScript
  'if', 'else', 'for', 'while', 'do', 'switch', 'case',
  'break', 'continue', 'return', 'try', 'catch', 'finally',
  'throw', 'new', 'delete', 'typeof', 'instanceof', 'void',
  'class', 'extends', 'super', 'import', 'export', 'default',
  'const', 'let', 'var', 'function', 'async', 'await',
  'yield', 'generator', 'debugger', 'with', 'get', 'set',
  
  // Métodos comunes de objeto
  'constructor', 'toString', 'valueOf', 'hasOwnProperty',
  'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString',
  
  // Palabras que aparecen en logs/errores
  'error', 'warn', 'info', 'debug', 'log', 'trace',
]);

const INVALID_PATTERNS = [
  /^_[_a-z]/i, // __algo (métodos internos de Node)
  /^__/,
  /^Symbol\./,
];

const VALID_METHOD_PATTERNS = [
  /^[a-zA-Z_][a-zA-Z0-9_]*$/, // Nombres válidos
  /^[a-z][a-zA-Z0-9]*([A-Z][a-z0-9]+)*$/, // camelCase
];

export function isValidMethodName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.length < 2) return false; // Métodos de 1 letra no son válidos
  
  // Verificar contra palabras inválidas
  if (INVALID_METHOD_NAMES.has(name)) return false;
  
  // Verificar contra patrones inválidos
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(name)) return false;
  }
  
  // Verificar que sea un nombre válido
  for (const pattern of VALID_METHOD_PATTERNS) {
    if (pattern.test(name)) return true;
  }
  
  return false;
}

export function filterValidMethods(methods) {
  return methods.filter(m => {
    const name = typeof m === 'string' ? m : m.name;
    return isValidMethodName(name);
  });
}