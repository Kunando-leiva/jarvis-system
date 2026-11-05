// backend/src/memory/factExtractor.js
// 🔍 EXTRACTOR DE HECHOS - VERSIÓN PRECISA Y ESTRUCTURADA

import { MEMORY_TYPES, MEMORY_IMPORTANCE } from './memoryTypes.js';

class FactExtractor {
  constructor() {
    // 🆕 PATRONES PRECISOS CON LÍMITES CLAROS
    this.patterns = {
      // Nombre - captura hasta el primer punto, coma, o fin de frase
      user_name: [
        /(?:mi nombre es|me llamo|llamo|soy)\s+([A-Za-zÁÉÍÓÚáéíóúÑñ]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]+){0,2})(?=[.,;!?]|$|\s+y\s+|\s+pero\s+|\s+porque\s+)/i,
        /(?:nombre|user)\s*:\s*([A-Za-zÁÉÍÓÚáéíóúÑñ]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]+){0,2})(?=[.,;!?]|$)/i
      ],
      
      // Color favorito - captura hasta el primer punto, coma, o fin de frase
      favorite_color: [
  
  /(?:mi color favorito es|color favorito|color preferido es)\s+(?:el\s+)?([A-Za-zÁÉÍÓÚáéíóúÑñ]+)(?=[.,;!?]|$|\s+y\s+|\s+pero\s+|\s+porque\s+)/i,
  /(?:color)\s*:\s*(?:el\s+)?([A-Za-zÁÉÍÓÚáéíóúÑñ]+)(?=[.,;!?]|$)/i
],
      
      // Comida favorita
      favorite_food: [
        /(?:mi comida favorita es|comida favorita|me gusta comer)\s+([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+)(?=[.,;!?]|$|\s+y\s+|\s+pero\s+|\s+porque\s+)/i
      ],
      
      // Música favorita
      favorite_music: [
        /(?:mi música favorita es|música favorita|genero favorito es)\s+([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+)(?=[.,;!?]|$|\s+y\s+|\s+pero\s+|\s+porque\s+)/i
      ],
      
      // Proyecto
      project_name: [
        /(?:mi proyecto se llama|proyecto|sistema)\s+["']?([A-Za-z0-9_\-]+)["']?(?=[.,;!?]|$|\s+y\s+|\s+pero\s+|\s+porque\s+)/i,
        /(?:proyecto)\s*:\s*["']?([A-Za-z0-9_\-]+)["']?(?=[.,;!?]|$)/i
      ],
      
      // Tecnología/Tech Stack
      tech_stack: [
        /(?:usamos|utilizamos|trabajamos con|tecnología|stack)\s+["']?([A-Za-z0-9_\-\.]+)["']?(?=[.,;!?]|$|\s+y\s+|\s+pero\s+|\s+porque\s+)/i
      ],
      
      // Ocupación
      occupation: [
        /(?:soy|trabajo como|ocupación)\s+([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+)(?=[.,;!?]|$|\s+y\s+|\s+pero\s+|\s+porque\s+)/i
      ],
      
      // Ubicación
      location: [
        /(?:vivo en|estoy en|ubicación|ciudad)\s+([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+)(?=[.,;!?]|$|\s+y\s+|\s+pero\s+|\s+porque\s+)/i
      ]
    };
  }

  extract(text) {
    if (!text || typeof text !== 'string') return [];

    const facts = [];

    for (const [type, patterns] of Object.entries(this.patterns)) {
      const patternArray = Array.isArray(patterns) ? patterns : [patterns];
      
      for (const pattern of patternArray) {
        const match = text.match(pattern);
        if (match) {
          const value = match[1].trim();
          
          // 🆕 VALIDAR QUE EL VALOR NO SEA LA PREGUNTA MISMA
          if (this._isValidValue(value, text, type)) {
            facts.push({
              type: type,
              key: type,
              value: value,
              original: match[0],
              importance: this.getImportance(type),
              confidence: this.getConfidence(type, value, match[0])
            });
          }
        }
      }
    }

    return facts;
  }

  // 🆕 VALIDAR QUE EL VALOR EXTRAÍDO SEA VÁLIDO
  _isValidValue(value, originalText, type) {
    if (!value || value.length < 2) return false;
    
    // No permitir que el valor sea una pregunta
    const questionWords = ['cual', 'cuál', 'que', 'qué', 'como', 'cómo', 'cuando', 'cuándo', 'donde', 'dónde'];
    if (questionWords.some(word => value.toLowerCase().includes(word))) {
      return false;
    }
    
    // No permitir que el valor sea demasiado largo (más de 50 caracteres para datos personales)
    if (value.length > 50 && type !== 'tech_stack') {
      return false;
    }
    
    // No permitir que el valor contenga la pregunta original
    if (originalText.toLowerCase().includes('cual') || originalText.toLowerCase().includes('cuál')) {
      // Si la pregunta contiene "cual", el valor no debería ser la pregunta misma
      if (value.length < 10 && questionWords.some(w => value.toLowerCase().includes(w))) {
        return false;
      }
    }
    
    return true;
  }

  getImportance(type) {
    const importanceMap = {
      user_name: MEMORY_IMPORTANCE.USER_NAME,
      favorite_color: MEMORY_IMPORTANCE.FAVORITE_COLOR,
      project_name: MEMORY_IMPORTANCE.PROJECT_NAME,
      tech_stack: MEMORY_IMPORTANCE.TECH_STACK,
      favorite_food: MEMORY_IMPORTANCE.HIGH,
      favorite_music: MEMORY_IMPORTANCE.HIGH,
      occupation: MEMORY_IMPORTANCE.HIGH,
      location: MEMORY_IMPORTANCE.MEDIUM,
      birthday: MEMORY_IMPORTANCE.HIGH
    };
    return importanceMap[type] || MEMORY_IMPORTANCE.MEDIUM;
  }

  getConfidence(type, value, original) {
    let confidence = 0.7;
    
    // Mayor confianza si el patrón es exacto
    const exactMatch = original.match(new RegExp(`(?:mi|el|la)\\s+${type.replace('_', ' ')}\\s+(?:es|favorito|favorita|preferido)\\s+${value}`, 'i'));
    if (exactMatch) {
      confidence += 0.2;
    }
    
    // Mayor confianza si el valor es corto y específico
    if (value.length < 20) {
      confidence += 0.1;
    }
    
    // Mayor confianza si no contiene palabras de pregunta
    const questionWords = ['cual', 'cuál', 'que', 'qué', 'como', 'cómo'];
    if (!questionWords.some(w => value.toLowerCase().includes(w))) {
      confidence += 0.05;
    }
    
    return Math.min(confidence, 0.98);
  }

  // 🆕 EXTRAER SOLO UN TIPO ESPECÍFICO
  extractType(text, type) {
    if (!this.patterns[type]) return null;
    
    const patterns = Array.isArray(this.patterns[type]) ? this.patterns[type] : [this.patterns[type]];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = match[1].trim();
        if (this._isValidValue(value, text, type)) {
          return {
            type: type,
            key: type,
            value: value,
            original: match[0],
            importance: this.getImportance(type),
            confidence: this.getConfidence(type, value, match[0])
          };
        }
      }
    }
    
    return null;
  }
}

export default FactExtractor;