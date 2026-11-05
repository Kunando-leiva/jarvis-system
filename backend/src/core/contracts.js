// backend/src/core/contracts.js
// Contratos de datos estandarizados para la comunicación entre servicios
// 🔒 PRINCIPIO: Los contratos definen la API pública de cada servicio

/**
 * ================================================================
 * CONTRATO: MemoryService
 * ================================================================
 * 
 * Métodos públicos:
 *   - initialize(): Promise<boolean>
 *   - getStatus(): Object
 *   - getMetrics(): Object
 *   - shutdown(): Promise<boolean>
 *   - ensureSession(sessionId): void  ← NUEVO
 *   - saveMessage(sessionId, role, content, metadata): Promise<boolean>
 *   - getConversationHistory(sessionId, limit): Promise<Array>
 *   - saveContext(sessionId, context): Promise<boolean>
 *   - getContext(sessionId): Promise<Object>
 *   - savePublication(publicationData): Promise<boolean>
 *   - getPublications(limit): Promise<Array>
 *   - saveSystemState(state): Promise<boolean>
 *   - getSystemState(): Promise<Object>
 *   - clearSession(sessionId): Promise<boolean>
 */

/**
 * ================================================================
 * CONTRATO: LongTermMemoryService
 * ================================================================
 * 
 * Métodos públicos:
 *   - initialize(): Promise<boolean>
 *   - getStatus(): Object
 *   - getMetrics(): Object
 *   - shutdown(): Promise<boolean>
 *   - saveEpisodicEvent(sessionId, eventType, summary, metadata): Promise<boolean>
 *   - getRecentEpisodicEvents(sessionId, limit): Promise<Array>
 *   - searchEpisodicEvents(sessionId, eventType, limit): Promise<Array>
 *   - saveSemanticFact(sessionId, key, value, confidence, metadata): Promise<boolean>
 *   - getSemanticFact(sessionId, key): Promise<Object|null>
 *   - searchSemanticFacts(sessionId, keyPrefix, limit): Promise<Array>
 *   - saveProceduralFact(sessionId, key, value, confidence, metadata): Promise<boolean>
 *   - getProceduralFact(sessionId, key): Promise<Object|null>
 *   - searchProceduralFacts(sessionId, keyPrefix, limit): Promise<Array>
 *   - consolidateKnowledge(sessionId, interactionData): Promise<Object>
 */

/**
 * ================================================================
 * CONTRATO: ReasoningService
 * ================================================================
 * 
 * Métodos públicos:
 *   - initialize(): Promise<boolean>
 *   - getStatus(): Object
 *   - getMetrics(): Object
 *   - shutdown(): Promise<boolean>
 *   - createPlan(query, sessionId, options): Promise<Object>
 */

/**
 * ================================================================
 * CONTRATO: ExecutionService
 * ================================================================
 * 
 * Métodos públicos:
 *   - initialize(): Promise<boolean>
 *   - getStatus(): Object
 *   - getMetrics(): Object
 *   - shutdown(): Promise<boolean>
 *   - executePlan(plan, sessionId, options): Promise<Object>
 */

/**
 * ================================================================
 * CONTRATO: ReflectionService
 * ================================================================
 * 
 * Métodos públicos:
 *   - initialize(): Promise<boolean>
 *   - getStatus(): Object
 *   - getMetrics(): Object
 *   - shutdown(): Promise<boolean>
 *   - reflect(data): Promise<Object>
 *   - getReflections(sessionId, limit): Array
 *   - getRecentReflections(limit): Array
 *   - getReflectionStats(): Object
 */

// Definiciones de tipos para documentación
export const ServiceContracts = {
  MemoryService: {
    name: 'MemoryService',
    description: 'Gestiona la memoria persistente (SQLite)',
    publicMethods: [
      'initialize',
      'getStatus',
      'getMetrics',
      'shutdown',
      'ensureSession',
      'saveMessage',
      'getConversationHistory',
      'saveContext',
      'getContext',
      'savePublication',
      'getPublications',
      'saveSystemState',
      'getSystemState',
      'clearSession',
    ],
  },
  LongTermMemoryService: {
    name: 'LongTermMemoryService',
    description: 'Gestiona memoria a largo plazo (episódica, semántica, procedimental)',
    publicMethods: [
      'initialize',
      'getStatus',
      'getMetrics',
      'shutdown',
      'saveEpisodicEvent',
      'getRecentEpisodicEvents',
      'searchEpisodicEvents',
      'saveSemanticFact',
      'getSemanticFact',
      'searchSemanticFacts',
      'saveProceduralFact',
      'getProceduralFact',
      'searchProceduralFacts',
      'consolidateKnowledge',
    ],
  },
  ReasoningService: {
    name: 'ReasoningService',
    description: 'Genera planes estructurados a partir de consultas',
    publicMethods: [
      'initialize',
      'getStatus',
      'getMetrics',
      'shutdown',
      'createPlan',
    ],
  },
  ExecutionService: {
    name: 'ExecutionService',
    description: 'Ejecuta planes paso a paso',
    publicMethods: [
      'initialize',
      'getStatus',
      'getMetrics',
      'shutdown',
      'executePlan',
    ],
  },
  ReflectionService: {
    name: 'ReflectionService',
    description: 'Observa y registra resultados para aprendizaje',
    publicMethods: [
      'initialize',
      'getStatus',
      'getMetrics',
      'shutdown',
      'reflect',
      'getReflections',
      'getRecentReflections',
      'getReflectionStats',
    ],
  },
};

export default ServiceContracts;