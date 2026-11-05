// backend/src/knowledge/contractValidator.js
// 🔒 CONTRACT VALIDATOR - Validación automática de contratos públicos
// 🔒 RESPONSABILIDAD: Verificar que los contratos coincidan con el código real

import { logger } from '../core/logger.js';
import { eventBus } from '../core/eventBus.js';
import { BaseService } from '../core/serviceInterface.js';

/**
 * Validador de Contratos Públicos
 * 
 * Detecta cambios en las APIs públicas de los componentes:
 * - Métodos que faltan en el contrato
 * - Métodos que ya no existen en el código
 * - Cambios en firmas de métodos
 */
export class ContractValidator extends BaseService {
  constructor(publicContractService, config = {}) {
    super(config);
    this.name = 'ContractValidator';
    this.publicContractService = publicContractService;
    this.lastValidation = null;
    this.validationHistory = [];
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Valida todos los contratos del sistema
   * @param {Object} options - Opciones de validación
   * @param {boolean} options.throwOnError - Lanzar excepción si hay errores
   * @param {string[]} options.ignoreComponents - Componentes a ignorar
   * @returns {Object} Resultado de la validación
   */
  validateAll(options = {}) {
    const { throwOnError = false, ignoreComponents = [] } = options;

    logger.info('[ContractValidator] Iniciando validación de contratos');

    const contracts = this.publicContractService.getAllContracts();
    const results = {};
    let totalErrors = 0;
    let totalWarnings = 0;
    const errors = [];
    const warnings = [];

    for (const [name, contract] of Object.entries(contracts)) {
      // Ignorar componentes específicos
      if (ignoreComponents.includes(name)) {
        continue;
      }

      const validation = this._validateContract(contract);
      results[name] = validation;
      
      totalErrors += validation.errors.length;
      totalWarnings += validation.warnings.length;
      
      if (validation.errors.length > 0) {
        errors.push({ component: name, errors: validation.errors });
      }
      if (validation.warnings.length > 0) {
        warnings.push({ component: name, warnings: validation.warnings });
      }
    }

    const result = {
      timestamp: new Date().toISOString(),
      totalComponents: Object.keys(contracts).length,
      totalErrors,
      totalWarnings,
      passed: totalErrors === 0,
      results,
      errors,
      warnings,
      summary: {
        valid: Object.values(results).filter(r => r.valid).length,
        invalid: Object.values(results).filter(r => !r.valid).length,
        withWarnings: Object.values(results).filter(r => r.warnings.length > 0).length,
      }
    };

    this.lastValidation = result;
    this.validationHistory.push(result);

    // Emitir evento
    eventBus.emit('contracts:validated', {
      totalErrors,
      passed: result.passed,
      timestamp: result.timestamp
    });

    if (throwOnError && !result.passed) {
      const errorMsg = `Validación de contratos falló: ${totalErrors} errores encontrados`;
      logger.error('[ContractValidator] ' + errorMsg);
      throw new Error(errorMsg);
    }

    logger.info('[ContractValidator] Validación completada', {
      totalErrors,
      totalWarnings,
      passed: result.passed
    });

    return result;
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Valida un contrato individual
   * @param {Object} contract - Contrato a validar
   * @returns {Object} Resultado de validación
   */
  _validateContract(contract) {
    const errors = [];
    const warnings = [];

    if (!contract || !contract.exists) {
      errors.push(`Componente "${contract?.name || 'desconocido'}" no existe`);
      return { valid: false, errors, warnings };
    }

    // 1. Verificar que tenga métodos públicos declarados
    if (!contract.publicMethods || contract.publicMethods.length === 0) {
      warnings.push(`Componente "${contract.name}" no tiene métodos públicos declarados`);
    }

    // 2. Verificar que no haya métodos faltantes en el contrato
    if (contract.validation) {
      const { missingSignatures = [] } = contract.validation;
      
      if (missingSignatures.length > 0) {
        errors.push(
          `Firmas faltantes para "${contract.name}": ${missingSignatures.join(', ')}`
        );
      }

      if (!contract.validation.complete) {
        warnings.push(`Contrato de "${contract.name}" está incompleto`);
      }
    }

    // 3. Verificar que los métodos tengan parámetros
    for (const method of contract.publicMethods || []) {
      if (!method.name) {
        errors.push(`Método sin nombre en "${contract.name}"`);
      }
      if (method.params && method.params.some(p => !p.name)) {
        warnings.push(`Método "${method.name}" tiene parámetros sin nombre`);
      }
    }

    // 4. Detectar métodos heredados sin declaración en el código
    const inheritedMethods = (contract.publicMethods || []).filter(m => m.inherited);
    if (inheritedMethods.length > 0) {
      // Esto es normal, solo informamos
      logger.debug(`[ContractValidator] Métodos heredados en ${contract.name}`, {
        methods: inheritedMethods.map(m => m.name)
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      contract: contract.name,
      methodCount: contract.publicMethods?.length || 0,
      inheritedCount: inheritedMethods.length,
      hasInherited: inheritedMethods.length > 0
    };
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Obtiene el historial de validaciones
   * @param {number} limit - Número máximo de registros
   * @returns {Array} Historial de validaciones
   */
  getHistory(limit = 10) {
    return this.validationHistory.slice(-limit);
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Obtiene el último resultado de validación
   * @returns {Object} Último resultado
   */
  getLastValidation() {
    return this.lastValidation;
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Genera un informe de validación
   * @param {Object} validationResult - Resultado de validación
   * @returns {string} Informe formateado
   */
  generateReport(validationResult = null) {
    const data = validationResult || this.lastValidation;
    
    if (!data) {
      return 'No hay resultados de validación disponibles';
    }

    const lines = [];
    lines.push('=' .repeat(60));
    lines.push('📋 INFORME DE VALIDACIÓN DE CONTRATOS');
    lines.push('=' .repeat(60));
    lines.push(`  Fecha: ${data.timestamp}`);
    lines.push(`  Componentes: ${data.totalComponents}`);
    lines.push(`  ✅ Válidos: ${data.summary.valid}`);
    lines.push(`  ❌ Inválidos: ${data.summary.invalid}`);
    lines.push(`  ⚠️ Con advertencias: ${data.summary.withWarnings}`);
    lines.push(`  Errores totales: ${data.totalErrors}`);
    lines.push(`  Advertencias totales: ${data.totalWarnings}`);
    lines.push('');
    lines.push(`  Estado: ${data.passed ? '✅ PASÓ' : '❌ FALLÓ'}`);
    
    if (data.errors.length > 0) {
      lines.push('');
      lines.push('❌ ERRORES:');
      for (const error of data.errors) {
        lines.push(`  ${error.component}:`);
        for (const msg of error.errors) {
          lines.push(`    - ${msg}`);
        }
      }
    }
    
    if (data.warnings.length > 0) {
      lines.push('');
      lines.push('⚠️ ADVERTENCIAS:');
      for (const warning of data.warnings) {
        lines.push(`  ${warning.component}:`);
        for (const msg of warning.warnings) {
          lines.push(`    - ${msg}`);
        }
      }
    }
    
    lines.push('=' .repeat(60));
    
    return lines.join('\n');
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Obtiene métricas del validador
   * @returns {Object} Métricas
   */
  getMetrics() {
    const last = this.lastValidation;
    return {
      name: this.name,
      status: this.status,
      totalValidations: this.validationHistory.length,
      lastValidation: last ? {
        timestamp: last.timestamp,
        passed: last.passed,
        totalErrors: last.totalErrors
      } : null,
      averageErrors: this.validationHistory.length > 0
        ? this.validationHistory.reduce((sum, v) => sum + v.totalErrors, 0) / this.validationHistory.length
        : 0
    };
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Obtiene estado del validador
   * @returns {Object} Estado
   */
  getStatus() {
    return {
      name: this.name,
      status: this.status,
      initialized: this.initialized,
      metrics: this.getMetrics()
    };
  }

  async shutdown() {
    try {
      this.status = 'offline';
      this.initialized = false;
      logger.info('[ContractValidator] Apagado correctamente');
      return true;
    } catch (error) {
      logger.error('[ContractValidator] Error en shutdown', { error: error.message });
      return false;
    }
  }
}

// Exportar instancia por defecto
export default ContractValidator;