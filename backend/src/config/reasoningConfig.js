// backend/src/config/reasoningConfig.js
// Configuración de confianza para Reasoning Service

export const CONFIDENCE_THRESHOLDS = {
  // Umbrales por tipo de tarea
  taskType: {
    planning: { min: 0.7, ideal: 0.85, max: 0.95 },
    execution: { min: 0.6, ideal: 0.8, max: 0.95 },
    conversation: { min: 0.5, ideal: 0.7, max: 0.9 },
    account_analysis: { min: 0.7, ideal: 0.85, max: 0.95 },
    content_publishing: { min: 0.6, ideal: 0.8, max: 0.9 },
    reflection: { min: 0.6, ideal: 0.75, max: 0.9 },
    simple: { min: 0.4, ideal: 0.6, max: 0.85 },
    error_recovery: { min: 0.3, ideal: 0.5, max: 0.7 },
  },
  
  // Umbrales generales
  general: {
    low: 0.4,      // Por debajo: necesita validación humana
    medium: 0.7,   // Entre 0.4 y 0.7: aceptable con supervisión
    high: 0.85,    // Por encima: confiable para ejecución automática
  },
  
  // Acciones según confianza
  actions: {
    low: 'ask_clarification',     // Preguntar al usuario
    medium: 'execute_with_review', // Ejecutar con revisión
    high: 'execute_automatically', // Ejecutar automáticamente
  },
};

export default CONFIDENCE_THRESHOLDS;