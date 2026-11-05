// backend/src/memory/memoryTypes.js
// 🧠 TIPOS DE MEMORIA COGNITIVA - VERSIÓN ESTRUCTURADA

export const MEMORY_TYPES = {
  FACT: 'fact',
  PREFERENCE: 'preference',
  DECISION: 'decision',
  EVENT: 'event',
  SUMMARY: 'summary',
  PROJECT_KNOWLEDGE: 'project_knowledge',
  CONTEXT: 'context',
  CONVERSATION: 'conversation',
  USER_INFO: 'user_info',
  
  // 🆕 TIPOS ESTRUCTURADOS PARA MEMORIA PERSONAL
  USER_NAME: 'user_name',
  FAVORITE_COLOR: 'favorite_color',
  FAVORITE_FOOD: 'favorite_food',
  FAVORITE_MUSIC: 'favorite_music',
  FAVORITE_MOVIE: 'favorite_movie',
  BIRTHDAY: 'birthday',
  OCCUPATION: 'occupation',
  LOCATION: 'location',
  PROJECT_NAME: 'project_name',
  TECH_STACK: 'tech_stack'
};

export const MEMORY_IMPORTANCE = {
  LOW: 1,
  MEDIUM: 3,
  HIGH: 5,
  CRITICAL: 10,
  
  // 🆕 IMPORTANCIA POR TIPO
  USER_NAME: 10,
  FAVORITE_COLOR: 5,
  PROJECT_NAME: 8,
  TECH_STACK: 6
};

export const MEMORY_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DEPRECATED: 'deprecated'
};

export const MEMORY_SOURCES = {
  USER: 'user',
  SYSTEM: 'system',
  AGENT: 'agent',
  EXTRACTED: 'extracted'
};

// 🆕 ESTRUCTURA DE MEMORIA CON CLAVE/VALOR
export const MEMORY_STRUCTURE = {
  KEY_VALUE: 'key_value',  // Para memorias estructuradas tipo clave/valor
  FREE_TEXT: 'free_text',  // Para texto libre
  CONTEXTUAL: 'contextual' // Para contexto de conversación
};

export default {
  MEMORY_TYPES,
  MEMORY_IMPORTANCE,
  MEMORY_STATUS,
  MEMORY_SOURCES,
  MEMORY_STRUCTURE
};