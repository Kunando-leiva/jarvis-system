// backend/src/resolvers/impactResolver.js
// 💥 IMPACT RESOLVER - Análisis de impacto de cambios
// 🔒 RESPONSABILIDAD: Evaluar el impacto de modificar componentes o métodos

import { createSuccessResponse, createErrorResponse, createMethodSuccessResponse } from './responseContract.js';
import { logger } from '../core/logger.js';

export class ImpactResolver {
  /**
   * @param {DependencyResolver} dependencyResolver - Resolver de dependencias
   * @param {MethodResolver} methodResolver - Resolver de métodos
   * @param {PublicContractService} publicContractService - Servicio de contratos públicos
   */
  constructor(dependencyResolver, methodResolver, publicContractService) {
    this.dependencyResolver = dependencyResolver;
    this.methodResolver = methodResolver;
    this.contracts = publicContractService;  // ← GUARDAR COMO this.contracts
    this.cache = new Map();
    
    // 🔥 LOG DE DEPURACIÓN
    console.log('[ImpactResolver] Constructor llamado:');
    console.log('  dependencyResolver:', !!dependencyResolver);
    console.log('  methodResolver:', !!methodResolver);
    console.log('  publicContractService:', !!publicContractService);
  }

  /**
 * 🔒 MÉTODO PÚBLICO: Analiza el impacto de cambiar un componente
 */
analyzeComponentImpact(componentName, options = {}) {
  try {
    const { deep = true, maxDepth = 3, useCache = true } = options;
    
    // 🔥 LOG DE DEPURACIÓN
    console.log(`[ImpactResolver] Analyzing: ${componentName}`);
    console.log(`  contracts service:`, this.contracts ? '✅' : '❌');
    
    const cacheKey = `component_${componentName}_${deep}_${maxDepth}`;
    
    // ✅ Manejar caché correctamente
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.success !== undefined) {
        console.log(`  [ImpactResolver] Usando caché para ${componentName}`);
        return cached;
      }
      // Si el caché está corrupto, eliminarlo
      this.cache.delete(cacheKey);
    }

    logger.debug(`[ImpactResolver] Analizando impacto de "${componentName}"`);

    // 1. Obtener dependientes directos
    const dependentsResult = this.dependencyResolver.findDependents(componentName);
    console.log(`  findDependents result:`, dependentsResult.success ? '✅' : '❌');
    
    // 🔥 Extraer el array de dependents de la respuesta
    const dependents = dependentsResult.success ? dependentsResult.data.dependents || [] : [];
    console.log(`  Dependents encontrados:`, dependents);
    
    // 2. Obtener dependientes indirectos (deep)
    let indirectDependents = [];
    let dependencyTree = {};
    
    if (deep) {
      const result = this._buildDependencyTree(componentName, maxDepth);
      indirectDependents = result.allDependents;
      dependencyTree = result.tree;
    }

    // 3. Métodos expuestos por el componente
    let exposedMethods = [];
    let contractType = 'unknown';
    
    if (this.contracts && typeof this.contracts.getContract === 'function') {
      const contract = this.contracts.getContract(componentName);
      if (contract && contract.exists) {
        exposedMethods = contract.publicMethods || [];
        contractType = contract.type || 'unknown';
      }
    }

    // 4. Análisis de criticidad
    const criticalAnalysis = this._analyzeCriticality(componentName, dependents);

    // 5. Recomendaciones
    const recommendations = this._generateRecommendations({
      componentName,
      directDependents: dependents,
      indirectDependents,
      exposedMethods,
      criticalAnalysis
    });

    const result = {
      component: componentName,
      type: contractType,
      directCount: dependents.length,
      indirectCount: indirectDependents.length,
      dependencyTree,
      exposedMethods: exposedMethods.map(m => ({
        name: m.name,
        async: m.async,
        params: m.params,
        inherited: m.inherited || false
      })),
      criticality: criticalAnalysis,
      recommendations,
      summary: {
        message: criticalAnalysis.level === 'HIGH'
          ? `⚠️ "El cambio en ${componentName}" tiene alto impacto. Afecta a ${dependents.length + indirectDependents.length} componentes.`
          : criticalAnalysis.level === 'MEDIUM'
          ? `📌 "El cambio en ${componentName}" tiene impacto medio. Afecta a ${dependents.length + indirectDependents.length} componentes.`
          : `✅ "El cambio en ${componentName}" es seguro. Afecta a ${dependents.length + indirectDependents.length} componentes.`,
        riskLevel: criticalAnalysis.level
      }
    };

    const response = createSuccessResponse(
      componentName,
      {
        impact: {
          component: result.component,
          type: result.type,
          directCount: result.directCount,
          indirectCount: result.indirectCount,
          dependencyTree: result.dependencyTree,
          exposedMethods: result.exposedMethods,
          criticality: result.criticality,
          recommendations: result.recommendations,
          summary: result.summary
        }
      },
      { resolver: 'impactResolver', operation: 'analyzeComponentImpact', options }
    );
    
    console.log(`  Response success:`, response.success);
    
    // ✅ Guardar en caché solo si es válido
    if (response && response.success !== undefined) {
      this.cache.set(cacheKey, response);
    }
    
    return response;
  } catch (error) {
    console.error(`[ImpactResolver] Error analyzing ${componentName}:`, error);
    const errorResponse = createErrorResponse(
      componentName,
      error.message,
      { resolver: 'impactResolver', operation: 'analyzeComponentImpact' }
    );
    return errorResponse;
  }
}

  /**
   * 🔒 MÉTODO PÚBLICO: Analiza el impacto de cambiar un método
   */
  analyzeMethodImpact(methodName) {
    try {
      const cacheKey = `method_${methodName}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      logger.debug(`[ImpactResolver] Analizando impacto del método "${methodName}"`);

      const searchResult = this.methodResolver.findByName(methodName);
      
      let components = [];
      if (searchResult.success) {
        components = searchResult.data.components || [];
      }

      const result = {
        method: methodName,
        components: components,
        totalComponents: components.length,
        risk: components.length > 3 ? 'HIGH' : components.length > 1 ? 'MEDIUM' : 'LOW',
        summary: {
          message: components.length === 0
            ? `El método "${methodName}" no está expuesto por ningún componente`
            : `El método "${methodName}" está expuesto por ${components.length} componente(s)`,
          risk: components.length > 3 ? 'ALTO' : components.length > 1 ? 'MEDIO' : 'BAJO'
        }
      };

      this.cache.set(cacheKey, result);

      return createMethodSuccessResponse(
        methodName,
        {
          components: result.components,
          count: result.totalComponents,
          risk: result.risk,
          summary: result.summary
        },
        { resolver: 'impactResolver', operation: 'analyzeMethodImpact' }
      );
    } catch (error) {
      return createErrorResponse(
        null,
        error.message,
        { resolver: 'impactResolver', operation: 'analyzeMethodImpact', method: methodName }
      );
    }
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Compara el impacto entre dos componentes
   */
  compareImpact(componentA, componentB) {
    try {
      const impactA = this.analyzeComponentImpact(componentA);
      const impactB = this.analyzeComponentImpact(componentB);

      const dataA = impactA.success ? impactA.data.impact : { directCount: 0, indirectCount: 0, exposedMethods: [] };
      const dataB = impactB.success ? impactB.data.impact : { directCount: 0, indirectCount: 0, exposedMethods: [] };

      const result = {
        comparison: {
          componentA: {
            name: componentA,
            directDependents: dataA.directCount || 0,
            indirectDependents: dataA.indirectCount || 0,
            methods: dataA.exposedMethods?.length || 0,
            criticality: dataA.criticality?.level || 'LOW'
          },
          componentB: {
            name: componentB,
            directDependents: dataB.directCount || 0,
            indirectDependents: dataB.indirectCount || 0,
            methods: dataB.exposedMethods?.length || 0,
            criticality: dataB.criticality?.level || 'LOW'
          }
        },
        moreCritical: dataA.criticality?.level === 'HIGH' || dataB.criticality?.level === 'HIGH'
          ? (dataA.criticality?.level === 'HIGH' ? componentA : componentB)
          : null,
        summary: `"${componentA}" tiene ${dataA.directCount || 0} dependientes directos y "${componentB}" tiene ${dataB.directCount || 0}`
      };

      return createSuccessResponse(
        componentA,
        {
          comparison: result.comparison,
          moreCritical: result.moreCritical,
          summary: result.summary
        },
        { resolver: 'impactResolver', operation: 'compareImpact' }
      );
    } catch (error) {
      return createErrorResponse(
        componentA,
        error.message,
        { resolver: 'impactResolver', operation: 'compareImpact' }
      );
    }
  }

  // ─── PRIVADOS ────────────────────────────────────────────────

  _buildDependencyTree(componentName, maxDepth) {
    const visited = new Set();
    const tree = {};
    const allDependents = [];

    const traverse = (node, depth, currentPath) => {
      if (depth > maxDepth || visited.has(node)) return;
      
      visited.add(node);
      
      // 🔥 Extraer el array de dependents de la respuesta
      const depsResult = this.dependencyResolver.findDependents(node);
      const nodes = depsResult.success ? depsResult.data.dependents || [] : [];
      
      if (nodes.length > 0) {
        tree[node] = nodes;
        for (const dependent of nodes) {
          if (!visited.has(dependent)) {
            allDependents.push({
              name: dependent,
              depth: depth + 1,
              path: [...currentPath, dependent]
            });
            traverse(dependent, depth + 1, [...currentPath, dependent]);
          }
        }
      }
    };

    traverse(componentName, 0, [componentName]);
    return { tree, allDependents };
  }

  _analyzeCriticality(componentName, dependents) {
    const critical = [];
    const criticalPatterns = ['core', 'base', 'service', 'manager', 'provider'];
    
    for (const dep of dependents) {
      const isCritical = criticalPatterns.some(p => 
        dep.toLowerCase().includes(p)
      );
      if (isCritical) {
        critical.push(dep);
      }
    }

    let level = 'LOW';
    if (dependents.length > 10) level = 'HIGH';
    else if (dependents.length > 5) level = 'MEDIUM';
    else if (dependents.length > 0) level = 'LOW';

    if (critical.length > 0) level = 'HIGH';

    return {
      level,
      criticalComponents: critical,
      totalDependents: dependents.length,
      criticalCount: critical.length,
      message: level === 'HIGH' 
        ? '⚠️ Componente crítico - muchos dependientes o dependencias críticas'
        : level === 'MEDIUM'
        ? '📌 Componente de impacto medio'
        : '✅ Componente de bajo impacto'
    };
  }

  _generateRecommendations({ componentName, directDependents, indirectDependents, exposedMethods, criticalAnalysis }) {
    const recommendations = [];

    if (directDependents.length === 0 && indirectDependents.length === 0) {
      recommendations.push({
        type: 'info',
        message: `"${componentName}" no tiene dependientes. Es seguro de modificar.`,
        priority: 'low'
      });
    }

    if (directDependents.length > 5) {
      recommendations.push({
        type: 'warning',
        message: `"${componentName}" tiene ${directDependents.length} dependientes directos. Considerar refactorización.`,
        priority: 'high'
      });
    }

    if (criticalAnalysis.level === 'HIGH') {
      recommendations.push({
        type: 'critical',
        message: `"${componentName}" es crítico. Cualquier cambio debe pasar por CI/CD y pruebas extensivas.`,
        priority: 'critical'
      });
    }

    if (exposedMethods.length > 10) {
      recommendations.push({
        type: 'info',
        message: `"${componentName}" expone ${exposedMethods.length} métodos. Considerar dividir en subcomponentes.`,
        priority: 'medium'
      });
    }

    if (indirectDependents.length > 0) {
      recommendations.push({
        type: 'info',
        message: `El cambio en "${componentName}" afecta indirectamente a ${indirectDependents.length} componentes.`,
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Limpia la caché
   */
  clearCache() {
    this.cache.clear();
  }
}