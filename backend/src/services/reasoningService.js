// backend/src/services/reasoningService.js
// 🧠 REASONING SERVICE - CON userId PERSISTENTE
// 🔒 RESPONSABILIDAD: Crear planes usando contexto y memoria personal

import { BaseService } from '../core/serviceInterface.js';
import { logger } from '../core/logger.js';
import { eventBus } from '../core/eventBus.js';
import CognitiveMemoryService from '../memory/cognitiveMemoryService.js';

export class ReasoningService extends BaseService {
  constructor({
    contextService,
    contextWindowManager,
    aiProvider,
    queryPlanner = null,
    knowledgeService = null,
    cognitiveMemoryService = null,
    config = {}
  }) {
    super(config);
    this.name = 'ReasoningService';
    this.contextService = contextService;
    this.contextWindowManager = contextWindowManager;
    this.aiProvider = aiProvider;
    this.queryPlanner = queryPlanner;
    this.knowledge = knowledgeService;
    this.cognitiveMemory = cognitiveMemoryService;
    this.initialized = false;
    this.memoryInitialized = false;

    this.config = {
      maxSteps: 10,
      minConfidence: 0.3,
      maxTokens: 8000,
      enableCognitiveMemory: true,
      maxMemoriesPerQuery: 5,
      minMemoryImportance: 2,
      ...config
    };
  }

  async initialize() {
    try {
      this.status = 'initializing';

      logger.info('[ReasoningService] Inicializando...');

      if (this.cognitiveMemory && this.config.enableCognitiveMemory) {
        try {
          await this.cognitiveMemory.initialize();
          this.memoryInitialized = true;
          logger.info('[ReasoningService] Memoria cognitiva inicializada');
        } catch (memoryError) {
          logger.warn('[ReasoningService] Error inicializando memoria cognitiva', {
            error: memoryError.message
          });
          this.memoryInitialized = false;
        }
      }

      this.initialized = true;
      this.status = 'online';

      logger.info('[ReasoningService] Inicializado', {
        queryPlannerAvailable: !!this.queryPlanner,
        knowledgeAvailable: !!this.knowledge,
        memoryAvailable: this.memoryInitialized
      });

      return true;
    } catch (error) {
      this.status = 'error';
      logger.error('[ReasoningService] Error inicializando', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * 🔒 MÉTODO PÚBLICO: Crea un plan con userId persistente
   * ✅ userId OBLIGATORIO
   * ✅ sessionId OBLIGATORIO
   */
  async createPlan(query, userId, sessionId, options = {}) {
    const traceId = global.traceId || 'no-trace';
    const startTime = Date.now();

    // ✅ Validar userId y sessionId
    if (!userId) {
      throw new Error('userId es requerido para createPlan');
    }
    if (!sessionId) {
      throw new Error('sessionId es requerido para createPlan');
    }

    logger.debug('[ReasoningService] Creando plan', { query, userId, sessionId, traceId });

    try {
      // ✅ PRIMERO: Intentar recordar información personal
      let personalMemories = [];
      let personalInfo = {};

      if (this.memoryInitialized && this.config.enableCognitiveMemory) {
        try {
          // ✅ Obtener toda la información personal del usuario
          personalInfo = await this.cognitiveMemory.getPersonalInfo(userId);

          // ✅ Si hay info personal y es una consulta personal, responder directamente
          if (Object.keys(personalInfo).length > 0 && this._isPersonalQuery(query)) {
            const response = this._buildPersonalResponseFromInfo(query, personalInfo);
            if (response) {
              logger.info('[ReasoningService] Respondiendo desde memoria personal', {
                userId,
                sessionId,
                traceId,
                infoKeys: Object.keys(personalInfo)
              });
              return {
                success: true,
                plan: {
                  steps: [{
                    id: 'personal_response',
                    type: 'action',
                    description: 'Respuesta basada en memoria personal',
                    action: 'respond',
                    output: response
                  }],
                  metadata: { type: 'personal', source: 'memory' }
                },
                confidence: 0.95,
                contextUsed: true,
                contextSources: ['cognitive_memory'],
                metadata: {
                  traceId,
                  userId,
                  sessionId,
                  memoriesUsed: Object.keys(personalInfo).length,
                  duration: Date.now() - startTime
                }
              };
            }
          }

          // Si no es personal o no hay info, obtener contexto de la sesión
          const recallResult = await this._recallMemories(query, userId, sessionId);
          personalMemories = recallResult.memories;

        } catch (error) {
          logger.warn('[ReasoningService] Error en recall personal', {
            error: error.message,
            traceId
          });
        }
      }

      // ─── VERIFICAR SI ES CONSULTA DE ARQUITECTURA ──────────
      const isArchitectureQuery = this._isArchitectureQuery(query);

      if (isArchitectureQuery && this.queryPlanner) {
        logger.debug('[ReasoningService] Detectada consulta de arquitectura', { query, traceId });

        try {
          const architectureResult = await this._handleArchitectureQuery(query, sessionId, traceId);

          await this._saveToMemory(query, architectureResult.plan, userId, sessionId, 'architecture');

          return {
            success: true,
            plan: architectureResult.plan,
            confidence: 0.95,
            contextUsed: true,
            contextSources: ['architecture_knowledge'],
            metadata: {
              traceId,
              userId,
              sessionId,
              duration: Date.now() - startTime,
              architectureQuery: true,
              knowledgeUsed: true,
              memoryUsed: this.memoryInitialized,
              ...architectureResult.metadata
            }
          };
        } catch (error) {
          logger.error('[ReasoningService] Falló consulta de arquitectura', {
            error: error.message,
            traceId
          });
          return {
            success: false,
            error: error.message,
            plan: null,
            confidence: 0,
            contextUsed: false,
            contextSources: [],
            metadata: {
              traceId,
              userId,
              sessionId,
              duration: Date.now() - startTime,
              architectureQuery: true,
              error: error.message
            }
          };
        }
      }

      // ─── FLUJO NORMAL DE RAZONAMIENTO ──────────────────────

      // Obtener contexto enriquecido
      let contextResult = null;
      if (this.contextService) {
        try {
          contextResult = await this.contextService.getContext({
            sessionId,
            query,
            options: {
              includeArchitecture: true,
              ...options
            }
          });
        } catch (contextError) {
          logger.warn('[ReasoningService] Error obteniendo contexto', {
            error: contextError.message,
            traceId
          });
          contextResult = null;
        }
      }

      // Optimizar ventana de contexto
      let windowResult = null;
      if (this.contextWindowManager && contextResult) {
        try {
          windowResult = this.contextWindowManager.buildWindow({
            query,
            context: contextResult,
            maxTokens: this.config.maxTokens
          });
        } catch (windowError) {
          logger.warn('[ReasoningService] Error construyendo ventana', {
            error: windowError.message,
            traceId
          });
          windowResult = null;
        }
      }

      // RECUPERAR MEMORIA COGNITIVA
      let memories = personalMemories;
      let memoryContext = '';
      if (this.memoryInitialized && this.config.enableCognitiveMemory && memories.length === 0) {
        try {
          const recallResult = await this._recallMemories(query, userId, sessionId);
          memories = recallResult.memories;
          memoryContext = recallResult.context;

          if (memories.length > 0) {
            logger.debug('[ReasoningService] Memorias recuperadas', {
              count: memories.length,
              userId,
              sessionId,
              traceId
            });
          }
        } catch (memoryError) {
          logger.warn('[ReasoningService] Error recuperando memorias', {
            error: memoryError.message,
            traceId
          });
        }
      } else if (memories.length > 0 && this.cognitiveMemory?.summarizer) {
        memoryContext = this.cognitiveMemory.summarizer.summarizeContext(memories) || '';
      }

      // Enriquecer contexto con conocimiento del sistema y memoria
      const enrichedContext = await this._enrichWithKnowledge(
        query,
        contextResult || {},
        windowResult || {},
        memoryContext,
        memories,
        personalInfo
      );

      // Generar plan con IA (incluyendo memoria)
      const plan = await this._generatePlanWithKnowledge(
        query,
        enrichedContext,
        userId,
        sessionId,
        memories,
        personalInfo
      );

      // Validar plan
      const validated = this._validatePlan(plan);

      // Calcular confianza
      const confidence = this._classifyConfidence(validated, contextResult || {});

      // Analizar impacto del contexto
      const contextImpact = this._validateContextImpact(contextResult || {});

      // GUARDAR EN MEMORIA COGNITIVA
      await this._saveToMemory(query, validated, userId, sessionId, 'conversation', memories);

      const result = {
        success: true,
        plan: validated,
        confidence,
        contextUsed: contextImpact.relevantSources?.length > 0 || false,
        contextSources: contextImpact.relevantSources || [],
        metadata: {
          traceId,
          userId,
          sessionId,
          duration: Date.now() - startTime,
          contextImpact,
          architectureAware: true,
          knowledgeUsed: enrichedContext.knowledgeUsed || false,
          memoryUsed: this.memoryInitialized && memories.length > 0,
          memoriesCount: memories.length,
          personalInfoKeys: Object.keys(personalInfo),
          ...(plan?.metadata || {})
        }
      };

      eventBus.emit('reasoning:planCreated', {
        userId,
        sessionId,
        planLength: validated?.steps?.length || 0,
        confidence,
        traceId,
        architectureQuery: isArchitectureQuery,
        memoriesUsed: memories.length
      });

      return result;

    } catch (error) {
      logger.error('[ReasoningService] Error creando plan', {
        error: error.message,
        stack: error.stack,
        traceId
      });

      return {
        success: false,
        error: error.message,
        plan: null,
        confidence: 0,
        contextUsed: false,
        contextSources: [],
        metadata: {
          traceId,
          userId,
          sessionId,
          duration: Date.now() - startTime
        }
      };
    }
  }

  // ─── CONSULTAS DE ARQUITECTURA ─────────────────────────────

  async _handleArchitectureQuery(query, sessionId, traceId) {
    if (!this.queryPlanner) {
      throw new Error('QueryPlanner no disponible para consultas de arquitectura');
    }

    try {
      const result = await this.queryPlanner.processQuery(query);

      if (!result || !result.response) {
        throw new Error('QueryPlanner no devolvió una respuesta válida');
      }

      return {
        plan: {
          steps: [
            {
              id: 'architecture_query',
              type: 'knowledge',
              description: 'Consulta de arquitectura del sistema',
              action: 'respond',
              input: {
                query: result.query,
                response: result.response
              },
              output: result.response
            }
          ],
          confidence: 0.95,
          metadata: {
            type: 'architecture',
            source: 'QueryPlanner',
            sessionId,
            traceId
          }
        },
        metadata: {
          result
        }
      };
    } catch (error) {
      logger.error('[ReasoningService] Error en consulta de arquitectura', {
        error: error.message,
        traceId,
        query
      });
      throw new Error(`Error en consulta de arquitectura: ${error.message}`);
    }
  }

  _isArchitectureQuery(query) {
    if (!query || typeof query !== 'string') return false;

    const normalized = query.toLowerCase().trim();

    // PRIMERO: Verificar si es una consulta personal (NO es arquitectura)
    const personalQueries = [
      'como me llamo', 'cual es mi nombre', 'mi nombre es',
      'recuerdas mi nombre', 'quien soy', 'color favorito',
      'mi color favorito', 'prefiero', 'me gusta', 'recuerdas que',
      'sabes mi nombre', 'cual es mi color', 'que color me gusta',
      'mi nombre'
    ];

    for (const personal of personalQueries) {
      if (normalized.includes(personal)) {
        return false;
      }
    }

    // Si no es personal, verificar patrones de arquitectura
    const architecturePatterns = [
      'qué métodos tiene', 'qué funciones tiene', 'qué expone',
      'qué api tiene', 'métodos públicos', 'qué métodos',
      'quién usa', 'quién utiliza', 'usado por', 'dependientes de',
      'quién depende de', 'de qué depende', 'dependencias de',
      'qué necesita', 'qué imports tiene', 'quien usa', 'depende de',
      'impacto de', 'qué pasaría si', 'cambiar', 'modificar',
      'eliminar', 'refactorizar', 'comparar', 'diferencia entre',
      'vs', 'versus', 'compara', 'arquitectura', 'estructura del sistema',
      'visión general', 'resumen', 'panorama', 'estado del sistema',
      'lista de', 'todos los', 'componentes', 'servicios', 'agentes',
      'qué componentes', 'cuántos servicios', 'cuántos agentes',
      'cuántos componentes', 'cuántos', 'número de', 'total de',
      'componentes aislados', 'sin dependencias', 'no depende de nadie',
      'sin dependientes', 'aislados', 'qué es', 'describe',
      'información de', 'detalles de', 'qué hace'
    ];

    return architecturePatterns.some(pattern => normalized.includes(pattern));
  }

  // ─── MÉTODOS PARA CONSULTAS PERSONALES ────────────────────

  _isPersonalQuery(query) {
  const normalized = query.toLowerCase().trim();
  
  // ✅ Detectar preguntas Y afirmaciones
  const personalPatterns = [
    // Preguntas sobre nombre
    'como me llamo',
    'cual es mi nombre',
    'cuál es mi nombre',
    'recuerdas mi nombre',
    'sabes mi nombre',
    'quien soy',
    'quién soy',
    'nombre',
    
    // Afirmaciones sobre nombre
    'mi nombre es',
    'me llamo',
    'soy',
    
    // Preguntas sobre color
    'color favorito',
    'mi color favorito',
    'cual es mi color',
    'cuál es mi color',
    'que color me gusta',
    'color',
    
    // Afirmaciones sobre color
    'mi color favorito es',
    'color favorito es',
    
    // Otros
    'prefiero',
    'me gusta',
    'recuerdas que'
  ];
  
  const result = personalPatterns.some(p => normalized.includes(p));
  
  console.log('[ReasoningService] _isPersonalQuery', { query: normalized, result });
  
  return result;
}

  /**
   * ✅ NUEVO: Construir respuesta desde información personal estructurada
   * NO usa regex sobre content, usa datos estructurados
   */
  /**
 * ✅ Construir respuesta desde información personal estructurada
 * NO usa regex sobre content, usa datos estructurados
 * ✅ CORREGIDO: Detecta correctamente "nombre" y "color"
 */
_buildPersonalResponseFromInfo(query, personalInfo) {
  const normalized = query.toLowerCase().trim();
  
  console.log('[ReasoningService] _buildPersonalResponseFromInfo', {
    query: normalized,
    hasUserName: !!personalInfo.user_name,
    hasFavoriteColor: !!personalInfo.favorite_color,
    personalInfoKeys: Object.keys(personalInfo)
  });

  // ─── DETECTAR AFIRMACIÓN DE NOMBRE ──────────────────────
  // Si dice "mi nombre es X" o "me llamo X" → guardar
  const nameSetPatterns = [
    /mi nombre es\s+(?:el\s+)?([A-Za-zÁÉÍÓÚáéíóúÑñ]+)/i,
    /me llamo\s+(?:el\s+)?([A-Za-zÁÉÍÓÚáéíóúÑñ]+)/i,
    /soy\s+(?:el\s+)?([A-Za-zÁÉÍÓÚáéíóúÑñ]+)/i
  ];
  
  for (const pattern of nameSetPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const name = match[1].trim();
      // Guardar en memoria (lo hace el extractor, pero aquí confirmamos)
      return `¡Claro que lo recuerdo! Te llamas ${name}. 😊`;
    }
  }

  // ─── DETECTAR AFIRMACIÓN DE COLOR ──────────────────────
  const colorSetPatterns = [
    /mi color favorito es\s+(?:el\s+)?([A-Za-zÁÉÍÓÚáéíóúÑñ]+)/i,
    /color favorito es\s+(?:el\s+)?([A-Za-zÁÉÍÓÚáéíóúÑñ]+)/i
  ];
  
  for (const pattern of colorSetPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const color = match[1].trim();
      return `¡Entendido! Tu color favorito es ${color}. 🎨`;
    }
  }

  // ─── BUSCAR NOMBRE (pregunta) ──────────────────────────
  const namePatterns = [
    'como me llamo', 'cual es mi nombre', 'cuál es mi nombre',
    'recuerdas mi nombre', 'sabes mi nombre', 'quien soy', 'quién soy', 'nombre'
  ];
  
  const isNameQuery = namePatterns.some(p => normalized.includes(p));
  
  if (isNameQuery) {
    if (personalInfo.user_name) {
      return `¡Claro que lo recuerdo! Te llamas ${personalInfo.user_name}. 😊`;
    }
    return 'No recuerdo tu nombre. ¿Podrías decirme cómo te llamas?';
  }

  // ─── BUSCAR COLOR (pregunta) ──────────────────────────
  const colorPatterns = [
    'color favorito', 'color preferido', 'que color',
    'cual es mi color', 'cuál es mi color', 'mi color'
  ];
  
  const isColorQuery = colorPatterns.some(p => normalized.includes(p));
  
  if (isColorQuery) {
    if (personalInfo.favorite_color) {
      return `Sí, recuerdo que tu color favorito es ${personalInfo.favorite_color}. 🎨`;
    }
    return 'No recuerdo tu color favorito. ¿Cuál es?';
  }

  // ─── RESPUESTA GENERAL ──────────────────────────────────
  const keys = Object.keys(personalInfo);
  if (keys.length > 0) {
    const summary = keys.map(key => {
      const displayKey = key.replace(/_/g, ' ');
      return `• ${displayKey}: ${personalInfo[key]}`;
    }).join('\n');
    return `Esto es lo que recuerdo sobre ti:\n${summary}`;
  }

  return null;
}

  // ─── MEMORIA COGNITIVA ──────────────────────────────────────

  /**
   * Recupera memorias relevantes para una consulta
   * ✅ userId para personal, sessionId para contexto
   */
  async _recallMemories(query, userId, sessionId) {
    if (!this.cognitiveMemory || !this.memoryInitialized) {
      return { memories: [], context: '' };
    }

    try {
      let memories = [];

      // ✅ PRIMERO: Buscar información personal por userId (sin sessionId)
      const personalInfo = await this.cognitiveMemory.getPersonalInfo(userId);

      // Si hay información personal, construir memorias a partir de ella
      if (Object.keys(personalInfo).length > 0) {
        // Si la consulta es personal, usar la info personal
        if (this._isPersonalQuery(query)) {
          // Ya se maneja en createPlan con _buildPersonalResponseFromInfo
          return { memories: [], context: '' };
        }

        // Para consultas no personales, buscar en contexto de sesión
        memories = await this.cognitiveMemory.recall(query, {
          userId,
          sessionId,
          minImportance: this.config.minMemoryImportance,
          limit: this.config.maxMemoriesPerQuery
        });
      } else {
        // Si no hay info personal, buscar en contexto de sesión
        memories = await this.cognitiveMemory.recall(query, {
          userId,
          sessionId,
          minImportance: this.config.minMemoryImportance,
          limit: this.config.maxMemoriesPerQuery
        });
      }

      let context = '';
      if (memories.length > 0) {
        context = this.cognitiveMemory.summarizer?.summarizeContext(memories) || '';
      }

      return { memories, context };
    } catch (error) {
      logger.warn('[ReasoningService] Error en recall de memoria', {
        error: error.message
      });
      return { memories: [], context: '' };
    }
  }

  /**
   * Guarda información en memoria cognitiva
   * ✅ userId OBLIGATORIO
   * ✅ sessionId OBLIGATORIO
   */
  async _saveToMemory(query, plan, userId, sessionId, type = 'conversation', existingMemories = []) {
    if (!this.cognitiveMemory || !this.memoryInitialized || !this.config.enableCognitiveMemory) {
      return;
    }

    if (!userId || !sessionId) {
      logger.warn('[ReasoningService] No se puede guardar en memoria: userId o sessionId faltante');
      return;
    }

    try {
      // 1. Guardar la consulta del usuario
      await this.cognitiveMemory.remember(query, {
        type: 'context',
        source: 'user',
        userId,
        sessionId,
        importance: 2,
        tags: ['query', type]
      });

      // 2. Guardar la respuesta (si existe)
      if (plan?.steps && plan.steps.length > 0) {
        const response = plan.steps
          .filter(s => s.output)
          .map(s => s.output)
          .join('\n');

        if (response) {
          await this.cognitiveMemory.remember(response.substring(0, 500), {
            type: 'context',
            source: 'system',
            userId,
            sessionId,
            importance: 2,
            tags: ['response', type]
          });
        }
      }

      // 3. Extraer y guardar hechos de la consulta
      try {
        const facts = await this.cognitiveMemory.extractFacts(query);
        for (const fact of facts) {
          await this.cognitiveMemory.remember(
            {
              key: fact.key,
              value: fact.value
            },
            {
              type: fact.type,
              source: 'user',
              userId,
              sessionId,
              importance: fact.importance || 3,
              tags: [fact.type, 'extracted']
            }
          );
        }
      } catch (extractError) {
        // Ignorar errores de extracción
      }

      // 4. Si la consulta es arquitectónica, guardar como conocimiento del proyecto
      if (this._isArchitectureQuery(query) && plan?.metadata?.type === 'architecture') {
        await this.cognitiveMemory.remember(
          `Arquitectura: ${query.substring(0, 200)}`,
          {
            type: 'project_knowledge',
            source: 'system',
            userId,
            sessionId,
            importance: 5,
            tags: ['architecture', 'project', 'knowledge']
          }
        );
      }

    } catch (error) {
      logger.warn('[ReasoningService] Error guardando en memoria', {
        error: error.message
      });
    }
  }

  /**
   * Obtiene contexto de memoria para una sesión
   */
  async getMemoryContext(userId, sessionId, limit = 10) {
    if (!this.cognitiveMemory || !this.memoryInitialized) {
      return { memories: [], context: '' };
    }

    if (!userId || !sessionId) {
      return { memories: [], context: 'Se requiere userId y sessionId' };
    }

    try {
      const memories = await this.cognitiveMemory.getContext(userId, sessionId, limit);
      const context = this.cognitiveMemory.summarizer?.summarizeContext(memories) || '';
      return { memories, context };
    } catch (error) {
      logger.warn('[ReasoningService] Error obteniendo contexto de memoria', {
        error: error.message
      });
      return { memories: [], context: '' };
    }
  }

  /**
   * Genera resumen de una conversación
   */
  async summarizeConversation(userId, sessionId) {
    if (!this.cognitiveMemory || !this.memoryInitialized) {
      return null;
    }

    if (!userId || !sessionId) {
      return 'Se requiere userId y sessionId';
    }

    try {
      return await this.cognitiveMemory.summarizeConversation(userId, sessionId);
    } catch (error) {
      logger.warn('[ReasoningService] Error generando resumen', {
        error: error.message
      });
      return null;
    }
  }

  // ─── ENRIQUECIMIENTO DE CONTEXTO ──────────────────────────

  async _enrichWithKnowledge(query, context, windowResult, memoryContext, memories, personalInfo = {}) {
    const enriched = {
      ...context,
      ...windowResult,
      knowledgeUsed: false,
      systemContext: null,
      memoryContext: memoryContext || '',
      memories: memories || [],
      personalInfo: personalInfo || {}
    };

    if (!this.knowledge || !this.queryPlanner) {
      return enriched;
    }

    try {
      const entities = this._extractEntitiesFromQuery(query);

      if (entities.components.length > 0 || entities.methods.length > 0) {
        const componentInfo = [];

        for (const comp of entities.components) {
          try {
            const contract = this.queryPlanner.contractService?.getContract(comp);
            if (contract && contract.exists) {
              componentInfo.push({
                name: comp,
                methods: contract.publicMethods?.length || 0,
                type: contract.type || 'unknown'
              });
            }
          } catch (e) {
            // Ignorar errores de componentes individuales
          }
        }

        enriched.systemContext = {
          mentionedComponents: componentInfo,
          methodsMentioned: entities.methods,
          hasSystemContext: componentInfo.length > 0
        };
        enriched.knowledgeUsed = componentInfo.length > 0;
      }

      if (entities.methods.length > 0) {
        const methodInfo = [];
        for (const method of entities.methods) {
          try {
            const result = this.queryPlanner.methodResolver?.findByName(method);
            if (result && result.success && result.data?.count > 0) {
              methodInfo.push({
                name: method,
                components: result.data.components?.map(c => c.name) || [],
                count: result.data.count || 0
              });
            }
          } catch (e) {
            // Ignorar errores de métodos individuales
          }
        }

        if (methodInfo.length > 0) {
          if (!enriched.systemContext) {
            enriched.systemContext = {};
          }
          enriched.systemContext.methodInfo = methodInfo;
          enriched.knowledgeUsed = true;
        }
      }

      if (memoryContext && memories.length > 0) {
        enriched.memoryContext = memoryContext;
        enriched.memories = memories;
        enriched.hasMemory = true;
      }

      if (personalInfo && Object.keys(personalInfo).length > 0) {
        enriched.personalInfo = personalInfo;
        enriched.hasPersonalInfo = true;
      }

      return enriched;

    } catch (error) {
      logger.warn('[ReasoningService] Error enriqueciendo contexto', {
        error: error.message
      });
      return enriched;
    }
  }

  _extractEntitiesFromQuery(query) {
    const entities = {
      components: [],
      methods: []
    };

    if (!query || typeof query !== 'string') return entities;

    if (this.queryPlanner) {
      try {
        const contracts = this.queryPlanner.contractService?.getAllContracts?.() || {};
        const componentNames = Object.keys(contracts);

        for (const name of componentNames) {
          if (query.toLowerCase().includes(name.toLowerCase())) {
            entities.components.push(name);
          }
        }
      } catch (e) {
        // Ignorar errores
      }
    }

    const methodPatterns = [
      /(?:método|función|method)\s+([a-zA-Z_$][\w$]*)/i,
      /([a-zA-Z_$][\w$]*)\s*\(\)/i
    ];

    for (const pattern of methodPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const methodName = match[1];
        if (!entities.components.includes(methodName)) {
          entities.methods.push(methodName);
        }
      }
    }

    return entities;
  }

  // ─── GENERACIÓN DE PLANES ──────────────────────────────────

  async _generatePlanWithKnowledge(query, enrichedContext, userId, sessionId, memories = [], personalInfo = {}) {
    const systemPrompt = this._buildSystemPromptWithKnowledge(query, enrichedContext);

    try {
      if (!this.aiProvider || typeof this.aiProvider.chat !== 'function') {
        throw new Error('AI Provider no disponible');
      }

      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      if (enrichedContext.memoryContext && memories.length > 0) {
        messages.push({
          role: 'system',
          content: `## INFORMACIÓN RECORDADA\n\n${enrichedContext.memoryContext}`
        });
      }

      if (personalInfo && Object.keys(personalInfo).length > 0) {
        const personalSummary = Object.entries(personalInfo)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join('\n');
        messages.push({
          role: 'system',
          content: `## INFORMACIÓN PERSONAL DEL USUARIO\n\n${personalSummary}`
        });
      }

      messages.push({ role: 'user', content: query });

      const response = await this.aiProvider.chat({
        messages,
        sessionId,
        temperature: 0.3,
        maxTokens: 2000
      });

      return this._parsePlan(response, enrichedContext);
    } catch (error) {
      logger.error('[ReasoningService] Error generando plan con IA', {
        error: error.message
      });
      throw error;
    }
  }

  _buildSystemPromptWithKnowledge(query, enrichedContext) {
    let prompt = `Eres JARVIS, un asistente cognitivo para Instagram Marketing.

Eres capaz de recordar información entre conversaciones y sesiones.

`;

    if (enrichedContext.hasMemory && enrichedContext.memoryContext) {
      prompt += `## LO QUE RECUERDAS DE CONVERSACIONES ANTERIORES\n\n`;
      prompt += enrichedContext.memoryContext;
      prompt += '\n\n';
    }

    if (enrichedContext.hasPersonalInfo && enrichedContext.personalInfo) {
      prompt += `## INFORMACIÓN PERSONAL DEL USUARIO\n\n`;
      for (const [key, value] of Object.entries(enrichedContext.personalInfo)) {
        prompt += `- ${key}: ${value}\n`;
      }
      prompt += '\n';
    }

    if (enrichedContext.systemContext && enrichedContext.systemContext.hasSystemContext) {
      prompt += `## CONOCIMIENTO DEL SISTEMA\n\n`;

      if (enrichedContext.systemContext.mentionedComponents.length > 0) {
        prompt += `Componentes mencionados en la consulta:\n`;
        for (const comp of enrichedContext.systemContext.mentionedComponents) {
          prompt += `- ${comp.name} (${comp.type}, ${comp.methods} métodos)\n`;
        }
        prompt += '\n';
      }

      if (enrichedContext.systemContext.methodInfo && enrichedContext.systemContext.methodInfo.length > 0) {
        prompt += `Métodos mencionados:\n`;
        for (const info of enrichedContext.systemContext.methodInfo) {
          prompt += `- ${info.name}: disponible en ${info.components.join(', ')}\n`;
        }
        prompt += '\n';
      }
    }

    prompt += `## INSTRUCCIONES\n\n`;
    prompt += `Responde a la consulta del usuario de manera clara y útil.\n`;
    prompt += `Si la consulta es sobre el sistema (arquitectura, dependencias, métodos), usa el conocimiento proporcionado.\n`;
    prompt += `Si recuerdas información relevante de conversaciones anteriores, úsala para enriquecer tu respuesta.\n`;
    prompt += `Sé preciso y basado en la información disponible.\n`;
    prompt += `Estructura tu respuesta en pasos claros y accionables.\n`;
    prompt += `Siempre devuelve un plan estructurado con pasos específicos.\n`;
    prompt += `Si no sabes algo, dilo honestamente.\n`;

    return prompt;
  }

  // ─── VALIDACIÓN Y ANÁLISIS ─────────────────────────────────

  _validatePlan(plan) {
    if (!plan) {
      return {
        steps: [],
        metadata: {
          error: 'Plan vacío'
        }
      };
    }

    if (!plan.steps || !Array.isArray(plan.steps)) {
      plan.steps = [];
    }

    for (const step of plan.steps) {
      if (!step.id) {
        step.id = `step_${Math.random().toString(36).substring(7)}`;
      }
      if (!step.type) {
        step.type = 'action';
      }
    }

    return plan;
  }

  _classifyConfidence(plan, context) {
    if (!plan) return 0;

    if (plan.metadata?.type === 'architecture') {
      return 0.95;
    }

    let confidence = 0.5;

    if (plan.steps && plan.steps.length > 0) {
      confidence += 0.2;
    }

    if (context && context.metadata?.sourcesUsed?.length > 0) {
      confidence += 0.1;
    }

    if (plan.metadata?.confidence) {
      confidence = Math.max(confidence, plan.metadata.confidence);
    }

    return Math.min(confidence, 0.95);
  }

  _validateContextImpact(context) {
    return {
      relevantSources: context.metadata?.sourcesUsed || [],
      baseSources: context.metadata?.baseSources || [],
      allSources: context.metadata?.allSources || [],
      hasRelevantContext: (context.metadata?.sourcesUsed?.length || 0) > 0
    };
  }

  _parsePlan(response, context) {
    let plan = {
      steps: [],
      metadata: {}
    };

    try {
      if (typeof response === 'string') {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.steps) {
            plan = parsed;
          }
        } else {
          plan.steps = [
            {
              id: 'response',
              type: 'action',
              description: 'Respuesta generada',
              action: 'respond',
              input: { response },
              output: response
            }
          ];
        }
      } else if (typeof response === 'object' && response !== null) {
        plan = response;
      }
    } catch (error) {
      plan.steps = [
        {
          id: 'response',
          type: 'action',
          description: 'Respuesta generada',
          action: 'respond',
          input: { response: String(response) },
          output: String(response)
        }
      ];
    }

    if (!plan.steps) {
      plan.steps = [];
    }
    if (!plan.metadata) {
      plan.metadata = {};
    }

    return plan;
  }

  // ─── MÉTRICAS Y ESTADO ──────────────────────────────────────

  getMetrics() {
    return {
      name: this.name,
      status: this.status,
      initialized: this.initialized,
      architectureAware: true,
      queryPlannerAvailable: !!this.queryPlanner,
      knowledgeAvailable: !!this.knowledge,
      memoryAvailable: this.memoryInitialized,
      memoryEnabled: this.config.enableCognitiveMemory,
      config: {
        maxSteps: this.config.maxSteps,
        minConfidence: this.config.minConfidence,
        maxTokens: this.config.maxTokens,
        maxMemoriesPerQuery: this.config.maxMemoriesPerQuery,
        minMemoryImportance: this.config.minMemoryImportance
      }
    };
  }

  getStatus() {
    return {
      name: this.name,
      status: this.status,
      initialized: this.initialized,
      memoryInitialized: this.memoryInitialized,
      metrics: this.getMetrics()
    };
  }

  async shutdown() {
    try {
      if (this.cognitiveMemory && this.memoryInitialized) {
        try {
          await this.cognitiveMemory.cleanup?.();
        } catch (memoryError) {
          logger.warn('[ReasoningService] Error en cleanup de memoria', {
            error: memoryError.message
          });
        }
      }

      this.status = 'offline';
      this.initialized = false;
      this.memoryInitialized = false;

      logger.info('[ReasoningService] Apagado correctamente');
      return true;
    } catch (error) {
      logger.error('[ReasoningService] Error en shutdown', {
        error: error.message
      });
      return false;
    }
  }
}

// ─── INSTANCIA POR DEFECTO ──────────────────────────────────

const defaultReasoningService = new ReasoningService({
  queryPlanner: null,
  knowledgeService: null,
  aiProvider: null,
  contextService: null,
  contextWindowManager: null,
  cognitiveMemoryService: null,
  config: {}
});

export default defaultReasoningService;