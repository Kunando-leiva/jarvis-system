// backend/src/resolvers/responseContract.js
// 📋 CONTRATO UNIFICADO - Respuesta de todos los resolvers

/**
 * Estructura unificada de respuesta para todos los resolvers
 * 
 * @typedef {Object} ResolverResponse
 * @property {boolean} success - Indica si la operación fue exitosa
 * @property {string} component - Nombre del componente (si aplica)
 * @property {string} method - Nombre del método (si aplica)
 * @property {Object} data - Datos específicos del resolver
 * @property {Object} metadata - Metadatos adicionales
 * @property {string} error - Mensaje de error (si success === false)
 */

export function createSuccessResponse(component, data = {}, metadata = {}) {
  return {
    success: true,
    component: component || null,
    method: null,
    data: {
      methods: data.methods || [],
      dependents: data.dependents || [],
      dependencies: data.dependencies || { internal: [], external: [], node: [] },
      impact: data.impact || null,
      comparison: data.comparison || null,
      summary: data.summary || '',
      ...data
    },
    metadata: {
      timestamp: new Date().toISOString(),
      resolver: metadata.resolver || 'unknown',
      ...metadata
    },
    error: null
  };
}

export function createErrorResponse(component, error, metadata = {}) {
  return {
    success: false,
    component: component || null,
    method: null,
    data: {},
    metadata: {
      timestamp: new Date().toISOString(),
      resolver: metadata.resolver || 'unknown',
      ...metadata
    },
    error: error || 'Error desconocido'
  };
}

export function createMethodSuccessResponse(method, data = {}, metadata = {}) {
  return {
    success: true,
    component: null,
    method: method,
    data: {
      methods: data.methods || [],
      components: data.components || [],
      count: data.count || 0,
      summary: data.summary || '',
      ...data
    },
    metadata: {
      timestamp: new Date().toISOString(),
      resolver: metadata.resolver || 'unknown',
      ...metadata
    },
    error: null
  };
}