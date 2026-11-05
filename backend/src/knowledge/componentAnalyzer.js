// backend/src/knowledge/componentAnalyzer.js
// 🔍 COMPONENT ANALYZER - Analiza componentes individuales
// 🔒 RESPONSABILIDAD: Extraer información verificable de un archivo

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SPECIAL_CASES = {
  // Mapeo de funciones exportadas que deben ser consideradas métodos públicos
  'instagramService': {
    exportedFunctions: ['enviarRespuestaInstagram']
  },
  'n8nService': {
    exportedFunctions: ['sendActionToN8n']
  },
  'skills': {
    // Nota: calcularDescuento NO es exportada, es interna
    // No la incluimos como método público
    exportedFunctions: []
  },
  'index': {
    exportedFunctions: [] // createCustomAgent y forEach no existen en el archivo
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Módulos nativos de Node.js para clasificación
 */
const NODE_MODULES = new Set([
  'fs', 'path', 'url', 'child_process', 'util', 'stream', 'buffer',
  'events', 'os', 'crypto', 'http', 'https', 'net', 'dns', 'tls',
  'readline', 'zlib', 'querystring', 'assert', 'cluster', 'console',
  'domain', 'module', 'process', 'punycode', 'repl', 'string_decoder',
  'sys', 'timers', 'tty', 'v8', 'vm', 'worker_threads', 'perf_hooks',
]);

export class ComponentAnalyzer {
  constructor(knowledgeService) {
    this.knowledge = knowledgeService;
    this.projectRoot = knowledgeService.projectRoot || path.join(__dirname, '../../..');
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Analiza un componente por nombre
   * @param {string} componentName - Nombre del componente (ej: 'memoryService')
   * @returns {Object} Información del componente
   */
  analyze(componentName) {
    const result = {
      name: componentName,
      type: 'unknown',
      path: null,
      exists: false,
      imports: [],
      publicMethods: [],
      exports: [],
      // Clasificación de dependencias
      internalDependencies: [],
      externalDependencies: [],
      nodeDependencies: [],
      // Mantener compatibilidad
      dependencies: [],
    };

    // 1. Localizar el componente
    const location = this._locateComponent(componentName);
    if (!location) {
      result.exists = false;
      result.error = 'Componente no encontrado';
      return result;
    }

    result.path = location.path;
    result.type = location.type;
    result.exists = true;

    // 2. Leer y analizar el archivo
    try {
      const content = fs.readFileSync(result.path, 'utf-8');
      
      // 3. Extraer imports
      result.imports = this._extractImports(content);
      
      // 4. Clasificar dependencias
      const classified = this._classifyDependencies(result.imports);
      result.internalDependencies = classified.internal;
      result.externalDependencies = classified.external;
      result.nodeDependencies = classified.node;
      result.dependencies = result.imports; // Mantener compatibilidad
      
      // 5. Extraer exports
      result.exports = this._extractExports(content);
      
      // 6. Extraer métodos públicos (normalizados)
      result.publicMethods = this._extractPublicMethods(content, componentName);

    } catch (error) {
      result.error = error.message;
    }

    return result;
  }

  /**
   * Localiza un componente en el proyecto
   * @private
   */
  _locateComponent(name) {
    const allComponents = this.knowledge.getAllComponents();
    
    for (const component of allComponents) {
      if (component.name === name || component.file === `${name}.js`) {
        return { path: component.path, type: component.type };
      }
    }

    // Si no se encuentra en el mapa, buscar en el sistema de archivos
    const srcPath = path.join(this.projectRoot, 'backend', 'src');
    const dirs = ['services', 'core', 'knowledge', 'resolvers', 'agents'];
    
    for (const dir of dirs) {
      const fullPath = path.join(srcPath, dir);
      if (!fs.existsSync(fullPath)) continue;
      
      const files = fs.readdirSync(fullPath);
      for (const file of files) {
        if (file === `${name}.js` || file === `${name}.mjs`) {
          let type = 'unknown';
          if (dir === 'services') type = 'service';
          else if (dir === 'core') type = 'core';
          else if (dir === 'knowledge') type = 'knowledge';
          else if (dir === 'resolvers') type = 'resolver';
          else if (dir === 'agents') type = 'agent';
          return { path: path.join(fullPath, file), type };
        }
      }
    }

    return null;
  }

  /**
   * Extrae imports de un archivo
   * @private
   */
  _extractImports(content) {
    const imports = [];
    
    // Import statements: import X from 'Y'
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Import statements: import 'Y'
    const importSimpleRegex = /import\s+['"]([^'"]+)['"]/g;
    while ((match = importSimpleRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Dynamic imports: import('Y')
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Require statements: require('Y')
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Clasifica dependencias en internal, external y node
   * @private
   */
  _classifyDependencies(imports) {
    const result = {
      internal: [],
      external: [],
      node: [],
    };

    for (const imp of imports) {
      // 1. Es módulo nativo de Node.js
      const packageName = imp.startsWith('@') ? imp.split('/').slice(0, 2).join('/') : imp.split('/')[0];
      if (NODE_MODULES.has(packageName) || NODE_MODULES.has(imp)) {
        result.node.push(imp);
        continue;
      }

      // 2. Es dependencia interna (comienza con ./, ../ o es un alias interno)
      const isInternal = imp.startsWith('./') || imp.startsWith('../');
      if (isInternal) {
        // Extraer nombre del módulo para normalizar
        const parts = imp.split('/');
        const lastPart = parts[parts.length - 1];
        const moduleName = lastPart.replace(/\.js$/, '').replace(/\.mjs$/, '');
        result.internal.push(moduleName);
        continue;
      }

      // 3. Es dependencia externa (npm package)
      // Detectar si es un scoped package (@org/package)
      if (imp.startsWith('@')) {
        result.external.push(imp);
      } else {
        // Extraer solo el nombre del paquete (sin sub-rutas)
        const pkgName = imp.split('/')[0];
        result.external.push(pkgName);
      }
    }

    return result;
  }

  /**
   * Extrae exports de un archivo
   * @private
   */
  _extractExports(content) {
    const exports = [];

    // export default X
    const defaultExportRegex = /export\s+default\s+(\w+)/g;
    let match;
    while ((match = defaultExportRegex.exec(content)) !== null) {
      exports.push({ type: 'default', name: match[1] });
    }

    // export const X, export function X, export class X
    const namedExportRegex = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push({ type: 'named', name: match[1] });
    }

    // export { X, Y }
    const bracketExportRegex = /export\s*\{\s*([^}]+)\s*\}/g;
    while ((match = bracketExportRegex.exec(content)) !== null) {
      const names = match[1].split(',').map(s => s.trim());
      for (const name of names) {
        exports.push({ type: 'named', name: name });
      }
    }

    return exports;
  }

  /**
   * Extrae métodos públicos de un archivo (normalizados, sin duplicados)
   * SOLO captura métodos de clase y funciones exportadas
   * @private
   */
  _extractPublicMethods(content, componentName) {
    const methodSet = new Set();

    // ⭐ 1. BUSCAR CLASES: class X { ... }
    // Extraer el cuerpo de cada clase y buscar métodos dentro
    const classRegex = /class\s+(\w+)\s*\{/g;
    let classMatch;
    const classBodies = [];

    // Encontrar todas las clases y sus cuerpos
    const tempContent = content;
    let searchIndex = 0;
    while ((classMatch = classRegex.exec(tempContent)) !== null) {
      const start = classMatch.index;
      let depth = 1;
      let end = start + classMatch[0].length;
      for (let i = end; i < tempContent.length && depth > 0; i++) {
        if (tempContent[i] === '{') depth++;
        else if (tempContent[i] === '}') depth--;
        if (depth === 0) end = i;
      }
      classBodies.push({
        className: classMatch[1],
        body: tempContent.substring(start, end + 1)
      });
    }

    // Extraer métodos de cada clase
    for (const classData of classBodies) {
      const body = classData.body;
      // Buscar métodos: methodName() { ... } o async methodName() { ... } o static methodName() { ... }
      const methodRegex = /(?:async\s+)?(?:static\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/g;
      let methodMatch;
      while ((methodMatch = methodRegex.exec(body)) !== null) {
        const methodName = methodMatch[1];
        // Excluir constructor y palabras reservadas
        if (this._isValidMethodName(methodName) && methodName !== 'constructor') {
          methodSet.add(methodName);
        }
      }
    }

    // ⭐ 2. BUSCAR FUNCIONES EXPORTADAS (top-level)
    // export function methodName() { ... }
    const exportFuncRegex = /export\s+(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    let exportMatch;
    while ((exportMatch = exportFuncRegex.exec(content)) !== null) {
      const funcName = exportMatch[1];
      if (this._isValidMethodName(funcName)) {
        methodSet.add(funcName);
      }
    }

    // ⭐ 3. BUSCAR FUNCIONES EXPORTADAS CON CONST/LET
    // export const methodName = function() { ... }
    const exportConstRegex = /export\s+(?:const|let)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?function\s*\(/g;
    let exportConstMatch;
    while ((exportConstMatch = exportConstRegex.exec(content)) !== null) {
      const funcName = exportConstMatch[1];
      if (this._isValidMethodName(funcName)) {
        methodSet.add(funcName);
      }
    }

    // ⭐ 4. BUSCAR FUNCIONES EXPORTADAS CON ARROW
    // export const methodName = (params) => { ... }
    const exportArrowRegex = /export\s+(?:const|let)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
    let exportArrowMatch;
    while ((exportArrowMatch = exportArrowRegex.exec(content)) !== null) {
      const funcName = exportArrowMatch[1];
      if (this._isValidMethodName(funcName)) {
        methodSet.add(funcName);
      }
    }

    // ⭐ 5. BUSCAR MÉTODOS EN OBJETOS EXPORTADOS
    // export default { methodName: function() { ... } }
    const objectMethodRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s+)?function\s*\(/g;
    let objectMatch;
    while ((objectMatch = objectMethodRegex.exec(content)) !== null) {
      const methodName = objectMatch[1];
      if (this._isValidMethodName(methodName)) {
        methodSet.add(methodName);
      }
    }

    // ⭐ 6. SPECIAL_CASES: funciones exportadas mapeadas
    const specialCase = SPECIAL_CASES[componentName];
    if (specialCase && specialCase.exportedFunctions) {
      for (const funcName of specialCase.exportedFunctions) {
        if (this._isValidMethodName(funcName)) {
          methodSet.add(funcName);
        }
      }
    }

    // Convertir a array ordenado
    return Array.from(methodSet).sort();
  }

  /**
   * ⭐ VERIFICA SI UN NOMBRE ES UN MÉTODO VÁLIDO
   * Incluye todas las palabras reservadas y nombres comunes de parámetros
   */
  _isValidMethodName(name) {
    if (!name || typeof name !== 'string') return false;
    if (name.length < 2) return false;
    
    // ⭐ PALABRAS RESERVADAS - DEFINICIÓN COMPLETA
    // Incluye palabras clave de JavaScript y nombres comunes de parámetros
    const reservedWords = new Set([
      // Palabras reservadas de JavaScript
      'if', 'else', 'for', 'while', 'do', 'switch', 'case',
      'break', 'continue', 'return', 'try', 'catch', 'finally',
      'throw', 'new', 'delete', 'typeof', 'instanceof', 'void',
      'yield', 'await', 'class', 'extends', 'super', 'import',
      'export', 'default', 'const', 'let', 'var', 'function',
      'async', 'generator', 'debugger', 'with', 'get', 'set',
      // Métodos comunes de objeto
      'constructor', 'prototype', 'call', 'apply', 'bind',
      'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
      'toLocaleString', 'toString', 'valueOf',
      // Palabras comunes en logs/errores
      'error', 'warn', 'info', 'debug', 'log', 'trace', 'dir',
      'table', 'time', 'timeEnd', 'assert', 'count', 'group',
      'groupEnd', 'clear', 'memory', 'profile', 'profileEnd',
      // Promesas
      'then', 'finally', 'resolve', 'reject', 'all', 'race', 'any', 'settled',
      // Otras
      'undefined', 'null', 'true', 'false', 'this', 'arguments',
      'eval', 'global', 'module', 'exports', 'require',
      '__dirname', '__filename', 'setTimeout', 'setInterval',
      'clearTimeout', 'clearInterval', 'process', 'Buffer',
      // ⭐ NUEVO: Nombres comunes de parámetros que no son métodos
      'methodName',
      'componentName',
      'param',
      'params',
      'arg',
      'args',
      'value',
      'key',
      'data',
      'options',
      'config',
      'context',
      'callback',
      'next',
      'done',
      'result',
      'results',
      'item',
      'items',
      'list',
      'array',
      'object',
      'string',
      'number',
      'boolean',
      'function',
      'callback',
      'handler',
      'listener',
      'event',
      'error',
      'err',
      'req',
      'res',
      'next',
      'done',
    ]);
    
    if (reservedWords.has(name)) return false;
    
    // Excluir métodos privados (comienzan con _)
    if (name.startsWith('_')) return false;
    
    // Verificar caracteres válidos
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) return false;
    
    return true;
  }
}