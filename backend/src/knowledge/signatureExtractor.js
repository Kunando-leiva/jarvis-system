// backend/src/knowledge/signatureExtractor.js
// 📝 SIGNATURE EXTRACTOR - Extrae firmas de métodos públicos
// 🔒 RESPONSABILIDAD: Extraer nombre, async y parámetros de métodos públicos

import fs from 'fs';
import { ComponentAnalyzer } from './componentAnalyzer.js';

/**
 * Extrae firmas de métodos públicos de un componente
 * 
 * Resultado:
 * [
 *   {
 *     name: 'getContext',
 *     async: true,
 *     params: ['sessionId', 'query', 'options']
 *   },
 *   {
 *     name: 'getMetrics',
 *     async: false,
 *     params: []
 *   }
 * ]
 */
export class SignatureExtractor {
  constructor(knowledgeService) {
    this.knowledge = knowledgeService;
    this.analyzer = new ComponentAnalyzer(knowledgeService);
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Extrae firmas de un componente
   * @param {string} componentName - Nombre del componente
   * @returns {Object} { component, exists, signatures, error }
   */
  extract(componentName) {
    // 1. Analizar el componente
    const info = this.analyzer.analyze(componentName);

    if (!info.exists) {
      return {
        component: componentName,
        exists: false,
        signatures: [],
        error: info.error || 'Componente no encontrado',
      };
    }

    // 2. Extraer posibles firmas del archivo
    const extractedSignatures = this._extractSignaturesFromFile(info.path);

    // 3. ⭐ NUEVO: Agregar firmas para funciones exportadas mapeadas
    const specialCase = this._getSpecialCase(componentName);
    if (specialCase) {
      for (const funcName of specialCase.exportedFunctions) {
        // Verificar si ya existe
        const exists = extractedSignatures.some(s => s.name === funcName);
        if (!exists) {
          // Crear firma para la función exportada
          extractedSignatures.push({
            name: funcName,
            async: true, // Asumimos que es async (la mayoría lo son)
            inherited: false,
            isExportedFunction: true,
            params: this._inferParamsForFunction(funcName, componentName)
          });
        }
      }
    }

    // 4. Conservar solamente métodos públicos reales
    const publicMethodSet = new Set(info.publicMethods || []);

    const signatures = extractedSignatures.filter(signature =>
      publicMethodSet.has(signature.name)
    );

    // 5. Mantener orden coherente con publicMethods
    signatures.sort(
      (a, b) =>
        info.publicMethods.indexOf(a.name) -
        info.publicMethods.indexOf(b.name)
    );

    return {
      component: componentName,
      exists: true,
      type: info.type,
      path: info.path,
      signatures,
      publicMethods: info.publicMethods,
    };
  }

  /**
   * ⭐ Obtiene casos especiales para un componente
   * @private
   */
  _getSpecialCase(componentName) {
    const SPECIAL_CASES = {
      'instagramService': {
        exportedFunctions: ['enviarRespuestaInstagram']
      },
      'n8nService': {
        exportedFunctions: ['sendActionToN8n']
      },
      'instagramDMService': {
        exportedFunctions: [
          'procesarDMInstagram',
          'registrarDMRespondido',
          'obtenerDMsRespondidos',
          'enviarMensajeDirectoInstagram',
          'enviarMensajeDirectoInstagramAlternativo'
        ]
      },
      'logger': {
        exportedFunctions: ['createTraceContext', 'withTraceContext']
      },
      'methodValidator': {
        exportedFunctions: ['isValidMethodName', 'filterValidMethods']
      },
      'responseContract': {
        exportedFunctions: ['createSuccessResponse', 'createErrorResponse', 'createMethodSuccessResponse']
      }
    };
    return SPECIAL_CASES[componentName] || null;
  }

  /**
   * Infiere parámetros para una función exportada
   * @private
   */
  _inferParamsForFunction(funcName, componentName) {
    // Mapeo manual de parámetros para funciones especiales
    const paramMap = {
      'enviarRespuestaInstagram': ['commentId', 'message'],
      'sendActionToN8n': ['actionPayload'],
      'procesarDMInstagram': ['id', 'user', 'text', 'timestamp', 'recipient_id'],
      'registrarDMRespondido': ['id'],
      'obtenerDMsRespondidos': [],
      'enviarMensajeDirectoInstagram': ['recipientId', 'texto'],
      'enviarMensajeDirectoInstagramAlternativo': ['recipientId', 'texto'],
      'createTraceContext': [],
      'withTraceContext': ['fn'],
      'isValidMethodName': ['name'],
      'filterValidMethods': ['methods'],
      'createSuccessResponse': ['component', 'data', 'metadata'],
      'createErrorResponse': ['component', 'error', 'metadata'],
      'createMethodSuccessResponse': ['method', 'data', 'metadata']
    };
    return paramMap[funcName] || [];
  }

  /**
   * Extrae firmas directamente de un archivo
   * @private
   */
  _extractSignaturesFromFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const signatures = this._parseMethodSignatures(content);
      
      // Agregar métodos heredados de BaseService
      const inheritedMethods = this._detectBaseServiceInheritance(content);
      const existingNames = new Set(signatures.map(s => s.name));
      
      for (const method of inheritedMethods) {
        if (!existingNames.has(method.name)) {
          method.inherited = true;
          signatures.push(method);
          existingNames.add(method.name);
        }
      }
      
      return signatures;
    } catch (error) {
      return [];
    }
  }

  /**
   * Parsea el contenido del archivo para extraer firmas
   * @private
   */
  _parseMethodSignatures(content) {
    const signatures = [];
    const methodSet = new Set();

    // Detecta el inicio de métodos:
    // async getContext(
    // getPlan(
    // getMetrics(
    const methodStartRegex =
      /(?:^|\n)\s*((async\s+)?(static\s+)?([A-Za-z_$][\w$]*))\s*\(/g;

    let match;

    while ((match = methodStartRegex.exec(content)) !== null) {
      const fullPrefix = match[1];
      const isAsync = Boolean(match[2]);
      const isStatic = Boolean(match[3]);
      const name = match[4];

      if (!this._isValidMethodName(name)) {
        continue;
      }

      // Posición justo después del "("
      const paramsStart = methodStartRegex.lastIndex;

      // Leer paréntesis balanceados
      const result = this._readBalancedParentheses(content, paramsStart);

      if (!result) {
        continue;
      }

      const params = this._parseParams(result.params);

      const signatureName = isStatic ? `static ${name}` : name;

      // Evitar duplicados
      if (!methodSet.has(signatureName)) {
        const signature = {
          name: signatureName,
          async: isAsync,
          inherited: false,
          params,
        };

        methodSet.add(signatureName);
        signatures.push(signature);
      }
    }

    return signatures;
  }

  /**
   * Lee paréntesis balanceados a partir de una posición
   * @private
   */
  _readBalancedParentheses(content, startIndex) {
    let depth = 1;
    let index = startIndex;
    let params = '';

    let quote = null;
    let escaped = false;

    while (index < content.length) {
      const char = content[index];

      // Manejo básico de strings
      if (quote) {
        params += char;

        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === quote) {
          quote = null;
        }

        index++;
        continue;
      }

      if (char === '"' || char === "'" || char === '`') {
        quote = char;
        params += char;
        index++;
        continue;
      }

      if (char === '(') {
        depth++;
        params += char;
      } else if (char === ')') {
        depth--;

        if (depth === 0) {
          // Verificar que después del paréntesis hay una llave
          const rest = content.substring(index + 1).trim();
          if (rest.startsWith('{')) {
            return {
              params: params.trim(),
              endIndex: index,
            };
          } else {
            // No es un método (no tiene llave)
            return null;
          }
        }

        params += char;
      } else {
        params += char;
      }

      index++;
    }

    return null;
  }

  /**
   * Detecta si una clase extiende de BaseService y agrega métodos heredados
   * @private
   */
  _detectBaseServiceInheritance(content) {
    // Buscar: export class X extends BaseService
    const extendsMatch = content.match(/export\s+class\s+\w+\s+extends\s+(BaseService)/);
    if (!extendsMatch) return [];

    // Métodos que BaseService proporciona
    const baseMethods = [
      { name: 'initialize', async: true, params: [], inherited: true },
      { name: 'shutdown', async: true, params: [], inherited: true }
    ];

    return baseMethods;
  }

  /**
   * Valida si un nombre es válido para un método público
   * @private
   */
  _isValidMethodName(name) {
    // Excluir constructor
    if (name === 'constructor') return false;
    
    // Excluir métodos privados (comienzan con _)
    if (name.startsWith('_')) return false;
    
    // Excluir palabras reservadas
    const reserved = new Set([
      'if', 'for', 'while', 'switch', 'try', 'catch', 'finally',
      'return', 'new', 'delete', 'typeof', 'instanceof', 'void',
      'yield', 'await', 'throw', 'break', 'continue', 'debugger',
      'default', 'do', 'else', 'export', 'extends', 'finally',
      'function', 'import', 'class',
    ]);
    if (reserved.has(name)) return false;
    
    return true;
  }

  /**
   * Parsea una lista de parámetros
   * @private
   */
  _parseParams(paramsRaw) {
    if (!paramsRaw || paramsRaw.trim() === '') {
      return [];
    }

    const params = [];
    const input = paramsRaw.trim();

    // Caso:
    // { sessionId, query, options = {} }
    if (input.startsWith('{') && input.endsWith('}')) {
      const inner = input.slice(1, -1);

      const parts = inner
        .split(',')
        .map(part => part.trim())
        .filter(Boolean);

      for (const part of parts) {
        let name = part;

        // options = {}
        if (name.includes('=')) {
          name = name.split('=')[0].trim();
        }

        // TypeScript: param: Type
        if (name.includes(':')) {
          name = name.split(':')[0].trim();
        }

        if (name && !name.startsWith('...')) {
          params.push(name);
        }
      }

      return params;
    }

    // Caso normal:
    // sessionId, query, options = {}
    const parts = input
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);

    for (const part of parts) {
      let name = part;

      // Quitar default value
      if (name.includes('=')) {
        name = name.split('=')[0].trim();
      }

      // Quitar tipo TypeScript
      if (name.includes(':')) {
        name = name.split(':')[0].trim();
      }

      // Ignorar rest parameters
      if (name.startsWith('...')) {
        name = name.slice(3).trim();
      }

      if (name) {
        params.push(name);
      }
    }

    return params;
  }

  /**
   * Divide parámetros respetando niveles de anidación
   * @private
   */
  _splitTopLevelParams(value) {
    const parts = [];
    let current = '';
    let curlyDepth = 0;
    let squareDepth = 0;
    let parenDepth = 0;

    for (const char of value) {
      if (char === '{') curlyDepth++;
      else if (char === '}') curlyDepth--;

      else if (char === '[') squareDepth++;
      else if (char === ']') squareDepth--;

      else if (char === '(') parenDepth++;
      else if (char === ')') parenDepth--;

      if (
        char === ',' &&
        curlyDepth === 0 &&
        squareDepth === 0 &&
        parenDepth === 0
      ) {
        parts.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Encuentra un carácter en el nivel superior (sin anidación)
   * @private
   */
  _findTopLevelCharacter(value, target) {
    let curlyDepth = 0;
    let squareDepth = 0;
    let parenDepth = 0;

    for (let i = 0; i < value.length; i++) {
      const char = value[i];

      if (char === '{') curlyDepth++;
      else if (char === '}') curlyDepth--;

      else if (char === '[') squareDepth++;
      else if (char === ']') squareDepth--;

      else if (char === '(') parenDepth++;
      else if (char === ')') parenDepth--;

      if (
        char === target &&
        curlyDepth === 0 &&
        squareDepth === 0 &&
        parenDepth === 0
      ) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Extrae firmas de todos los componentes
   */
  extractAll() {
    const components = this._getAllComponents();
    const results = {};
    
    for (const component of components) {
      results[component] = this.extract(component);
    }
    
    return results;
  }

  /**
   * @private
   */
  _getAllComponents() {
    const components = [];
    
    const services = this.knowledge.getServices();
    for (const service of services) {
      components.push(service.name);
    }
    
    const agents = this.knowledge.getAgents();
    for (const agent of agents) {
      components.push(agent.name);
    }
    
    return components;
  }
}