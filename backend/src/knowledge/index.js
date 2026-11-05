// backend/src/knowledge/index.js - VERSIÓN CONSOLIDADA (con getProjectInfo y findFile)

import { logger } from '../core/logger.js';
import { eventBus } from '../core/eventBus.js';
import { BaseService } from '../core/serviceInterface.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ComponentAnalyzer } from './componentAnalyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCLUDED_PATHS = [
  /\/tests?\//,
  /\/__tests__\//,
  /\.test\./,
  /\.spec\./,
  /\/mocks?\//,
  /\/fixtures?\//,
  /\/scripts?\//,
];

function shouldIncludeFile(filePath) {
  for (const pattern of EXCLUDED_PATHS) {
    if (pattern.test(filePath)) {
      return false;
    }
  }
  return true;
}

export class KnowledgeService extends BaseService {
  constructor(config = {}) {
    super(config);
    this.name = 'KnowledgeService';
    this.projectRoot = config.projectRoot || path.join(__dirname, '../../..');
    
    // ⭐ FUENTE ÚNICA DE VERDAD
    this._components = new Map();        // name -> component data
    this._dependencyGraph = new Map();   // source -> [targets]
    this._contracts = new Map();         // componentName -> contract
    this._methods = new Map();           // methodName -> {component, signature}
    
    this.initialized = false;
    this.status = 'idle';
  }

  async initialize() {
    try {
      this.status = 'initializing';
      
      // 1. Escanear estructura del proyecto
      await this._scanProjectStructure();
      
      // 2. Analizar componentes
      await this._analyzeComponents();
      
      // 3. Construir grafo de dependencias (AUTOMÁTICO, sin hardcode)
      await this._buildDependencyGraph();
      
      // 4. Extraer contratos públicos
      await this._extractContracts();
      
      this.initialized = true;
      this.status = 'online';
      
      logger.info('[KnowledgeService] Inicializado', {
        components: this._components.size,
        dependencies: this._dependencyGraph.size,
        contracts: this._contracts.size,
        methods: this._methods.size
      });
      
      eventBus.emit('knowledge:initialized', {
        components: this._components.size,
        contracts: this._contracts.size
      });
      
      return true;
    } catch (error) {
      this.status = 'error';
      logger.error('[KnowledgeService] Error inicializando:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 📚 API PÚBLICA - FUENTE ÚNICA DE VERDAD
  // ═══════════════════════════════════════════════════════════════

  /**
   * Obtiene un componente por nombre
   */
  getComponent(name) {
    return this._components.get(name) || null;
  }

  /**
   * Obtiene todos los componentes
   */
  getAllComponents() {
    return Array.from(this._components.values());
  }

  /**
   * Obtiene el grafo de dependencias (inmutable)
   */
  getDependencyGraph() {
    return new Map(this._dependencyGraph);
  }

  /**
   * Obtiene las dependencias de un componente
   */
  getDependencies(componentName) {
    return this._dependencyGraph.get(componentName) || [];
  }

  /**
   * ⭐ OBTIENE LOS DEPENDIENTES DE UN COMPONENTE (COMPATIBILIDAD)
   * @param {string} componentName
   * @returns {Array} Lista de componentes que dependen de este
   */
  getDependents(componentName) {
    const dependents = [];
    for (const [source, targets] of this._dependencyGraph) {
      if (targets.includes(componentName)) {
        dependents.push(source);
      }
    }
    return dependents;
  }

  /**
   * Obtiene el contrato de un componente
   */
  getContract(componentName) {
    return this._contracts.get(componentName) || null;
  }

  /**
   * Obtiene todos los contratos
   */
  getAllContracts() {
    return new Map(this._contracts);
  }

  /**
   * Busca un método por nombre
   */
  findMethod(methodName) {
    return this._methods.get(methodName) || null;
  }

  /**
   * Busca métodos que coincidan con un patrón
   */
  findMethodsByPattern(pattern) {
    const results = [];
    const regex = new RegExp(pattern, 'i');
    for (const [name, data] of this._methods) {
      if (regex.test(name)) {
        results.push({ methodName: name, ...data });
      }
    }
    return results;
  }

  /**
   * Busca componentes por nombre parcial
   */
  searchComponents(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    for (const [name, component] of this._components) {
      if (name.toLowerCase().includes(lowerQuery)) {
        results.push(component);
      }
    }
    return results;
  }

  /**
   * ⭐ NUEVO: Obtiene información del proyecto
   */
  getProjectInfo() {
    return {
      name: 'JARVIS System',
      version: '1.0.0',
      description: 'Sistema Operativo Cognitivo',
      components: this._components.size,
      services: this.getServices().length,
      agents: this.getAgents().length,
      resolvers: this.getResolvers().length,
      core: this.getCoreComponents().length,
      knowledge: this.getKnowledgeComponents().length,
      totalMethods: this._methods.size,
      totalContracts: this._contracts.size,
    };
  }

  /**
   * ⭐ NUEVO: Encuentra un archivo por nombre
   */
  findFile(filename) {
    const srcPath = path.join(this.projectRoot, 'backend', 'src');
    const dirs = ['services', 'core', 'knowledge', 'resolvers', 'agents', 'controllers', 'socket', 'state', 'utils', 'config'];
    
    for (const dir of dirs) {
      const fullPath = path.join(srcPath, dir, filename);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  /**
   * Obtiene estadísticas del conocimiento
   */
  getStats() {
    const types = {};
    for (const [, comp] of this._components) {
      const type = comp.type || 'unknown';
      types[type] = (types[type] || 0) + 1;
    }

    return {
      components: this._components.size,
      dependencies: this._dependencyGraph.size,
      contracts: this._contracts.size,
      methods: this._methods.size,
      types,
      initialized: this.initialized
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔍 MÉTODOS PRIVADOS - ANÁLISIS AUTOMÁTICO
  // ═══════════════════════════════════════════════════════════════

  async _scanProjectStructure() {
    // ... (mantener el código existente)
  }

  async _analyzeComponents() {
    const srcPath = path.join(this.projectRoot, 'backend', 'src');
    
    // Directorios a escanear
    const dirs = ['services', 'core', 'knowledge', 'resolvers', 'agents'];
    
    for (const dir of dirs) {
      const fullPath = path.join(srcPath, dir);
      if (!fs.existsSync(fullPath)) continue;
      
      const files = fs.readdirSync(fullPath);
      for (const file of files) {
        if (!file.endsWith('.js') && !file.endsWith('.mjs')) continue;
        
        const name = file.replace(/\.(js|mjs)$/, '');
        const componentPath = path.join(fullPath, file);
        
        // Detectar tipo
        let type = 'unknown';
        if (dir === 'services') type = 'service';
        else if (dir === 'core') type = 'core';
        else if (dir === 'knowledge') type = 'knowledge';
        else if (dir === 'resolvers') type = 'resolver';
        else if (dir === 'agents') type = 'agent';
        
        // Analizar el archivo para extraer información
        const analysis = await this._analyzeFile(componentPath);
        
        this._components.set(name, {
          name,
          file,
          path: componentPath,
          type,
          dir,
          ...analysis
        });
      }
    }
  }

  async _analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const analysis = {
        exports: [],
        imports: [],
        methods: [],
        dependencies: []
      };

      // Extraer imports
      const importRegex = /import\s+.*?from\s+['"](.*?)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          const parts = importPath.split('/');
          let componentName = parts[parts.length - 1];
          componentName = componentName.replace(/\.(js|mjs)$/, '');
          if (componentName && !componentName.startsWith('.')) {
            analysis.dependencies.push(componentName);
          }
        }
      }

      // Extraer exports
      const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
      while ((match = exportRegex.exec(content)) !== null) {
        analysis.exports.push(match[1]);
      }

      // ⭐ EXTRAER MÉTODOS - CON FILTRO DE PALABRAS RESERVADAS
      const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g;
      const reservedWords = new Set([
        'if', 'else', 'for', 'while', 'do', 'switch', 'case',
        'break', 'continue', 'return', 'try', 'catch', 'finally',
        'throw', 'new', 'delete', 'typeof', 'instanceof', 'void',
        'yield', 'await', 'class', 'extends', 'super', 'import',
        'export', 'default', 'const', 'let', 'var', 'function',
        'async', 'generator', 'debugger', 'with', 'get', 'set',
        'constructor', 'prototype', 'call', 'apply', 'bind',
        'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
        'toLocaleString', 'toString', 'valueOf',
        'error', 'warn', 'info', 'debug', 'log', 'trace',
        'then', 'finally', 'resolve', 'reject', 'all', 'race', 'any', 'settled',
        'undefined', 'null', 'true', 'false', 'this', 'arguments',
        'eval', 'global', 'module', 'exports', 'require',
        '__dirname', '__filename', 'setTimeout', 'setInterval',
        'clearTimeout', 'clearInterval', 'process', 'Buffer',
      ]);

      while ((match = methodRegex.exec(content)) !== null) {
        const methodName = match[1];
        // ⭐ FILTRAR: excluir constructor, métodos comunes y palabras reservadas
        if (!['constructor', 'initialize', 'shutdown', 'getStatus', 'getMetrics'].includes(methodName) &&
            !reservedWords.has(methodName) &&
            !methodName.startsWith('_')) {
          analysis.methods.push(methodName);
        }
      }

      return analysis;
    } catch (error) {
      logger.warn(`Error analyzing ${filePath}:`, error);
      return { exports: [], imports: [], methods: [], dependencies: [] };
    }
  }

  async _buildDependencyGraph() {
    this._dependencyGraph.clear();
    
    for (const [name, component] of this._components) {
      // Extraer dependencias del análisis del archivo
      const deps = component.dependencies || [];
      
      // Limpiar y validar dependencias (solo componentes que existen)
      const validDeps = deps.filter(dep => this._components.has(dep));
      
      this._dependencyGraph.set(name, validDeps);
    }
  }

  async _extractContracts() {
    this._contracts.clear();
    this._methods.clear();

    for (const [name, component] of this._components) {
      const methods = component.methods || [];
      
      // Solo servicios y resolvers tienen contratos públicos
      if (!['service', 'resolver', 'core', 'knowledge'].includes(component.type)) {
        continue;
      }

      const contract = {
        component: name,
        type: component.type,
        methods: methods.map(m => ({
          name: m,
          signature: `${m}()`,
          params: [],
          returnType: 'unknown'
        })),
        dependencies: this._dependencyGraph.get(name) || []
      };

      this._contracts.set(name, contract);

      // Indexar métodos
      for (const method of methods) {
        this._methods.set(method, {
          component: name,
          signature: `${method}()`,
          type: component.type
        });
      }
    }
  }

  /**
   * ⭐ CONSTRUYE UN CONTRATO PARA UN COMPONENTE
   * Usa ComponentAnalyzer para obtener métodos reales
   * @private
   */
  _buildContractForComponent(componentName) {
    const component = this._components.get(componentName);
    if (!component) return null;

    // Usar ComponentAnalyzer para obtener métodos reales
    const analyzer = new ComponentAnalyzer(this);
    const analysis = analyzer.analyze(componentName);
    
    if (!analysis.exists) {
      return {
        component: componentName,
        exists: false,
        error: analysis.error || 'Componente no encontrado'
      };
    }

    // ⭐ FILTRAR MÉTODOS INVÁLIDOS
    const validMethods = analysis.publicMethods.filter(method => {
      return this._isValidMethodName(method);
    });

    return {
      component: componentName,
      exists: true,
      type: component.type,
      path: component.path,
      methods: validMethods.map(m => ({
        name: m,
        signature: `${m}()`,
        params: [],
        returnType: 'unknown'
      })),
      dependencies: this._dependencyGraph.get(componentName) || []
    };
  }

  /**
   * ⭐ VERIFICA SI UN NOMBRE ES UN MÉTODO VÁLIDO
   * @private
   */
  _isValidMethodName(name) {
    if (!name || typeof name !== 'string') return false;
    if (name.length < 2) return false;
    
    const reservedWords = new Set([
      'if', 'else', 'for', 'while', 'do', 'switch', 'case',
      'break', 'continue', 'return', 'try', 'catch', 'finally',
      'throw', 'new', 'delete', 'typeof', 'instanceof', 'void',
      'yield', 'await', 'class', 'extends', 'super', 'import',
      'export', 'default', 'const', 'let', 'var', 'function',
      'async', 'generator', 'debugger', 'with', 'get', 'set',
      'constructor', 'prototype', 'call', 'apply', 'bind',
      'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
      'toLocaleString', 'toString', 'valueOf',
      'error', 'warn', 'info', 'debug', 'log', 'trace', 'dir',
      'table', 'time', 'timeEnd', 'assert', 'count', 'group',
      'groupEnd', 'clear', 'memory', 'profile', 'profileEnd',
      'then', 'finally', 'resolve', 'reject', 'all', 'race', 'any', 'settled',
      'undefined', 'null', 'true', 'false', 'this', 'arguments',
      'eval', 'global', 'module', 'exports', 'require',
      '__dirname', '__filename', 'setTimeout', 'setInterval',
      'clearTimeout', 'clearInterval', 'process', 'Buffer',
    ]);
    
    if (reservedWords.has(name)) return false;
    if (name.startsWith('_')) return false;
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) return false;
    
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // 📊 MÉTRICAS Y ESTADO
  // ═══════════════════════════════════════════════════════════════

  getMetrics() {
    return this.getStats();
  }

  getStatus() {
    return {
      name: this.name,
      status: this.status,
      initialized: this.initialized,
      metrics: this.getMetrics()
    };
  }

  async shutdown() {
    this.status = 'offline';
    this.initialized = false;
    logger.info('[KnowledgeService] Shutdown complete');
    return true;
  }

  /**
   * ⭐ OBTIENE TODOS LOS SERVICIOS (COMPATIBILIDAD)
   * @returns {Array} Lista de servicios
   */
  getServices() {
    const services = [];
    for (const [, component] of this._components) {
      if (component.type === 'service') {
        services.push(component);
      }
    }
    return services;
  }

  /**
   * ⭐ OBTIENE TODOS LOS AGENTES (COMPATIBILIDAD)
   * @returns {Array} Lista de agentes
   */
  getAgents() {
    const agents = [];
    for (const [, component] of this._components) {
      if (component.type === 'agent') {
        agents.push(component);
      }
    }
    return agents;
  }

  /**
   * ⭐ OBTIENE TODOS LOS RESOLVERS (COMPATIBILIDAD)
   * @returns {Array} Lista de resolvers
   */
  getResolvers() {
    const resolvers = [];
    for (const [, component] of this._components) {
      if (component.type === 'resolver') {
        resolvers.push(component);
      }
    }
    return resolvers;
  }

  /**
   * ⭐ OBTIENE TODOS LOS COMPONENTES DE CORE (COMPATIBILIDAD)
   * @returns {Array} Lista de componentes core
   */
  getCoreComponents() {
    const cores = [];
    for (const [, component] of this._components) {
      if (component.type === 'core') {
        cores.push(component);
      }
    }
    return cores;
  }

  /**
   * ⭐ OBTIENE TODOS LOS COMPONENTES DE KNOWLEDGE (COMPATIBILIDAD)
   * @returns {Array} Lista de componentes knowledge
   */
  getKnowledgeComponents() {
    const knowledge = [];
    for (const [, component] of this._components) {
      if (component.type === 'knowledge') {
        knowledge.push(component);
      }
    }
    return knowledge;
  }
}

// ⭐ EXPORTAR INSTANCIA ÚNICA (Singleton)
const knowledgeService = new KnowledgeService();
export default knowledgeService;