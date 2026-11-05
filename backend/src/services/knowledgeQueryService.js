// backend/src/services/knowledgeQueryService.js
// 🧠 KNOWLEDGE QUERY SERVICE - Consultas sobre el proyecto
// 🔒 RESPONSABILIDAD: Responder preguntas sobre la arquitectura

import { BaseService } from '../core/serviceInterface.js';
import { logger } from '../core/logger.js';

export class KnowledgeQueryService extends BaseService {
  constructor(knowledgeService, publicContractService) {
    super();
    this.name = 'KnowledgeQueryService';
    this.knowledge = knowledgeService;
    this.contracts = publicContractService;
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
    this.status = 'online';
    logger.info('[KnowledgeQueryService] Inicializado');
    return true;
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Consulta general sobre el proyecto
   */
  query(question) {
    const normalized = question.toLowerCase().trim();
    
    // Detectar tipo de consulta
    if (this._isComponentQuery(normalized)) {
      return this._resolveComponentQuery(normalized);
    }
    
    if (this._isDependencyQuery(normalized)) {
      return this._resolveDependencyQuery(normalized);
    }
    
    if (this._isMethodQuery(normalized)) {
      return this._resolveMethodQuery(normalized);
    }
    
    if (this._isGeneralQuery(normalized)) {
      return this._resolveGeneralQuery(normalized);
    }
    
    return this._getHelpResponse();
  }

  // ─── DETECCIÓN DE TIPOS DE CONSULTA ──────────────────────

  _isComponentQuery(text) {
    const patterns = ['qué componentes', 'qué servicios', 'qué agentes', 'cuántos componentes', 'lista de', 'componentes del sistema'];
    return patterns.some(p => text.includes(p));
  }

  _isDependencyQuery(text) {
    const patterns = ['depende', 'dependencia', 'usa', 'utiliza', 'quién usa', 'dependencias de'];
    return patterns.some(p => text.includes(p));
  }

  _isMethodQuery(text) {
    const patterns = ['método', 'función', 'api', 'expone', 'qué hace', 'qué puede'];
    return patterns.some(p => text.includes(p));
  }

  _isGeneralQuery(text) {
    const patterns = ['qué es', 'qué hace', 'versión', 'arquitectura', 'estructura', 'resumen'];
    return patterns.some(p => text.includes(p));
  }

  // ─── RESOLVERS ──────────────────────────────────────────────

  _resolveComponentQuery(text) {
    // Buscar nombre de componente específico
    const allContracts = this.contracts.getAllContracts();
    const componentNames = Object.keys(allContracts);
    
    // Intentar extraer nombre de componente
    for (const name of componentNames) {
      if (text.includes(name.toLowerCase())) {
        const contract = allContracts[name];
        return this._getComponentDetail(name, contract);
      }
    }
    
    // Si no hay componente específico, listar todos
    return this._getComponentList(allContracts);
  }

  _resolveDependencyQuery(text) {
    // Extraer nombre de componente
    const allContracts = this.contracts.getAllContracts();
    const componentNames = Object.keys(allContracts);
    
    for (const name of componentNames) {
      if (text.includes(name.toLowerCase())) {
        const contract = allContracts[name];
        return this._getDependencyDetail(name, contract);
      }
    }
    
    return {
      type: 'dependency',
      message: '¿De qué componente quieres ver las dependencias?',
      availableComponents: componentNames.slice(0, 10)
    };
  }

  _resolveMethodQuery(text) {
    // Extraer nombre de componente
    const allContracts = this.contracts.getAllContracts();
    const componentNames = Object.keys(allContracts);
    
    for (const name of componentNames) {
      if (text.includes(name.toLowerCase())) {
        const contract = allContracts[name];
        return this._getMethodDetail(name, contract);
      }
    }
    
    return {
      type: 'methods',
      message: '¿De qué componente quieres ver los métodos?',
      availableComponents: componentNames.slice(0, 10)
    };
  }

  _resolveGeneralQuery(text) {
    const info = this.knowledge.getProjectInfo();
    const contracts = this.contracts.getAllContracts();
    
    return {
      type: 'general',
      project: info,
      statistics: {
        totalComponents: Object.keys(contracts).length,
        totalMethods: this._countTotalMethods(contracts),
        completeContracts: this._countCompleteContracts(contracts)
      },
      message: `JARVIS System v${info.version} - ${info.description}`
    };
  }

  _getHelpResponse() {
    return {
      type: 'help',
      message: 'Puedo responder preguntas como:',
      examples: [
        '¿Qué componentes tiene el sistema?',
        '¿Qué métodos tiene contextService?',
        '¿De qué depende memoryService?',
        '¿Quién usa aiProvider?',
        '¿Cuál es la estructura del proyecto?'
      ]
    };
  }

  // ─── FORMATEADORES ──────────────────────────────────────────

  _getComponentDetail(name, contract) {
    const methods = contract.publicMethods || [];
    const defined = methods.filter(m => !m.inherited);
    const inherited = methods.filter(m => m.inherited);
    
    return {
      type: 'component',
      name,
      type: contract.type,
      file: contract.file,
      methods: {
        total: methods.length,
        defined: defined.map(m => m.name),
        inherited: inherited.map(m => m.name)
      },
      dependencies: contract.dependencies,
      validation: contract.validation
    };
  }

  _getComponentList(contracts) {
    const list = Object.keys(contracts).map(name => ({
      name,
      type: contracts[name].type || 'unknown',
      methods: contracts[name].publicMethods?.length || 0
    }));
    
    const services = list.filter(c => c.type === 'service');
    const agents = list.filter(c => c.type === 'agent');
    
    return {
      type: 'list',
      total: list.length,
      services: services.length,
      agents: agents.length,
      components: list,
      summary: `El sistema tiene ${services.length} servicios y ${agents.length} agentes`
    };
  }

  _getDependencyDetail(name, contract) {
    const deps = contract.dependencies || {};
    return {
      type: 'dependency',
      component: name,
      dependencies: {
        internal: deps.internal || [],
        external: deps.external || [],
        node: deps.node || []
      },
      summary: `${name} tiene ${deps.internal?.length || 0} dependencias internas y ${deps.external?.length || 0} externas`
    };
  }

  _getMethodDetail(name, contract) {
    const methods = contract.publicMethods || [];
    return {
      type: 'methods',
      component: name,
      methods: methods.map(m => ({
        name: m.name,
        async: m.async,
        params: m.params || [],
        inherited: m.inherited || false,
        description: m.description || ''
      })),
      summary: `${name} expone ${methods.length} métodos públicos`
    };
  }

  _countTotalMethods(contracts) {
    let total = 0;
    for (const [name, contract] of Object.entries(contracts)) {
      total += contract.publicMethods?.length || 0;
    }
    return total;
  }

  _countCompleteContracts(contracts) {
    let count = 0;
    for (const [name, contract] of Object.entries(contracts)) {
      if (contract.validation?.complete) {
        count++;
      }
    }
    return count;
  }

  getStatus() {
    return {
      name: this.name,
      status: this.status,
      initialized: this.initialized
    };
  }

  async shutdown() {
    this.status = 'offline';
    this.initialized = false;
    logger.info('[KnowledgeQueryService] Apagado correctamente');
    return true;
  }
}