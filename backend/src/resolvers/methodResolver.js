// backend/src/resolvers/methodResolver.js
// 🔍 METHOD RESOLVER - Búsqueda de métodos por nombre o patrón
// 🔒 RESPONSABILIDAD: Encontrar métodos que coincidan con criterios

import { createSuccessResponse, createErrorResponse, createMethodSuccessResponse } from './responseContract.js';

export class MethodResolver {
  // 🔥 CORREGIDO: Acepta tanto PublicContractService como KnowledgeService
  constructor(contractService) {
    // Si es KnowledgeService, usar su método getAllContracts()
    if (contractService && typeof contractService.getAllContracts === 'function') {
      this.contracts = {
        getAllContracts: contractService.getAllContracts.bind(contractService),
        getContract: contractService.getContract.bind(contractService)
      };
    } else {
      this.contracts = contractService;
    }
  }

  /**
   * Busca métodos por nombre exacto
   */
  findByName(methodName) {
    try {
      const allContracts = this.contracts.getAllContracts();
      const results = [];

      for (const [component, contract] of Object.entries(allContracts)) {
        if (!contract.exists) continue;
        
        const methods = contract.publicMethods || [];
        const found = methods.find(m => m.name === methodName);
        
        if (found) {
          results.push({
            component,
            method: found,
            type: contract.type || 'unknown'
          });
        }
      }

      const result = {
        methodName,
        results,
        count: results.length,
        summary: results.length === 0
          ? `No se encontró el método "${methodName}" en ningún componente`
          : `El método "${methodName}" aparece en ${results.length} componente(s)`
      };

      return createMethodSuccessResponse(
        methodName,
        {
          components: result.results.map(r => ({ name: r.component, type: r.type })),
          count: result.count,
          summary: result.summary
        },
        { resolver: 'methodResolver', operation: 'findByName' }
      );
    } catch (error) {
      return createErrorResponse(
        null,
        error.message,
        { resolver: 'methodResolver', operation: 'findByName', method: methodName }
      );
    }
  }

  /**
   * Busca métodos por patrón (regex)
   */
  findByPattern(pattern) {
    try {
      const regex = new RegExp(pattern, 'i');
      const allContracts = this.contracts.getAllContracts();
      const results = [];

      for (const [component, contract] of Object.entries(allContracts)) {
        if (!contract.exists) continue;
        
        const methods = contract.publicMethods || [];
        const matched = methods.filter(m => regex.test(m.name));
        
        if (matched.length > 0) {
          results.push({
            component,
            methods: matched,
            type: contract.type || 'unknown'
          });
        }
      }

      const totalMatches = results.reduce((sum, r) => sum + r.methods.length, 0);

      const result = {
        pattern,
        results,
        count: results.length,
        totalMatches,
        summary: `Se encontraron ${results.length} componente(s) con métodos que coinciden con "${pattern}"`
      };

      return createSuccessResponse(
        null,
        {
          results: result.results,
          count: result.count,
          totalMatches: result.totalMatches,
          summary: result.summary,
          pattern: result.pattern
        },
        { resolver: 'methodResolver', operation: 'findByPattern' }
      );
    } catch (error) {
      return createErrorResponse(
        null,
        error.message,
        { resolver: 'methodResolver', operation: 'findByPattern', pattern }
      );
    }
  }

  /**
   * Encuentra métodos por tipo (async, sync)
   */
  findByType(type) {
    try {
      const isAsync = type === 'async';
      const allContracts = this.contracts.getAllContracts();
      const results = [];

      for (const [component, contract] of Object.entries(allContracts)) {
        if (!contract.exists) continue;
        
        const methods = contract.publicMethods || [];
        const matched = methods.filter(m => m.async === isAsync);
        
        if (matched.length > 0) {
          results.push({
            component,
            methods: matched,
            type: contract.type || 'unknown'
          });
        }
      }

      const totalMatches = results.reduce((sum, r) => sum + r.methods.length, 0);

      return createSuccessResponse(
        null,
        {
          results,
          count: results.length,
          totalMatches,
          type
        },
        { resolver: 'methodResolver', operation: 'findByType' }
      );
    } catch (error) {
      return createErrorResponse(
        null,
        error.message,
        { resolver: 'methodResolver', operation: 'findByType', type }
      );
    }
  }

  /**
   * Encuentra métodos con un parámetro específico
   */
  findByParameter(paramName) {
    try {
      const allContracts = this.contracts.getAllContracts();
      const results = [];

      for (const [component, contract] of Object.entries(allContracts)) {
        if (!contract.exists) continue;
        
        const methods = contract.publicMethods || [];
        const matched = methods.filter(m => 
          m.params && m.params.some(p => p.name === paramName || p === paramName)
        );
        
        if (matched.length > 0) {
          results.push({
            component,
            methods: matched,
            type: contract.type || 'unknown'
          });
        }
      }

      const result = {
        paramName,
        results,
        count: results.length,
        summary: results.length === 0
          ? `No se encontraron métodos con el parámetro "${paramName}"`
          : `Se encontraron ${results.length} componente(s) con métodos que usan "${paramName}"`
      };

      return createSuccessResponse(
        null,
        {
          results: result.results,
          count: result.count,
          summary: result.summary,
          paramName: result.paramName
        },
        { resolver: 'methodResolver', operation: 'findByParameter' }
      );
    } catch (error) {
      return createErrorResponse(
        null,
        error.message,
        { resolver: 'methodResolver', operation: 'findByParameter', paramName }
      );
    }
  }
}