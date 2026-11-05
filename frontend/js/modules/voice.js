// frontend/js/modules/voice.js
// 🎤 Módulo de voz para JARVIS - Solo Web Speech API

export class VoiceManager {
  constructor() {
    this.enabled = false;
    this.voice = null;
    this.rate = 1.12;    // Más rápido y ágil
this.pitch = 1.14;   // Tono más natural
    this.language = 'es-ES';
    this.voices = [];
    this.initialized = false;
    this.isSpeaking = false;
    this.voicesLoaded = false;
  }

  /**
   * Inicializa el sistema de voz
   * @param {string} language - Código de idioma (ej: 'es-ES')
   */
  init(language = 'es-ES') {
    if (!('speechSynthesis' in window)) {
      console.warn('[Voice] ⚠️ SpeechSynthesis no soportado en este navegador');
      return false;
    }

    this.language = language;
    this.initialized = true;
    
    // Intentar cargar voces inmediatamente
    this.loadVoices();
    
    // 🔥 IMPORTANTE: Escuchar el evento de carga de voces
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        console.log('[Voice] 🔄 Voces recargadas, actualizando...');
        this.loadVoices();
      };
    }
    
    // 🔥 FALLBACK: Si después de 2 segundos no hay voces, intentar de nuevo
    setTimeout(() => {
      if (this.voices.length === 0) {
        console.log('[Voice] ⏳ Intentando cargar voces nuevamente...');
        this.loadVoices();
      }
    }, 2000);
    
    // 🔥 SEGUNDO FALLBACK: Si después de 4 segundos no hay voces, intentar de nuevo
    setTimeout(() => {
      if (this.voices.length === 0) {
        console.log('[Voice] ⏳ Último intento de carga de voces...');
        this.loadVoices();
      }
    }, 4000);

    console.log('[Voice] ✅ Sistema de voz inicializado');
    return true;
  }

  /**
   * Carga las voces disponibles y selecciona la mejor para el idioma
   */
  loadVoices() {
    // Obtener todas las voces disponibles
    this.voices = window.speechSynthesis.getVoices();
    
    console.log(`[Voice] 📢 Voces encontradas: ${this.voices.length}`);
    
    // Si no hay voces, mostrar un mensaje y salir
    if (this.voices.length === 0) {
      console.warn('[Voice] ⚠️ No hay voces disponibles en este momento');
      this.voicesLoaded = false;
      return;
    }
    
    this.voicesLoaded = true;
    
    // 🔥 Mostrar todas las voces disponibles en consola
    console.log('[Voice] 📋 Voces disponibles:');
    this.voices.forEach((v, i) => {
      console.log(`  ${i+1}. ${v.name} (${v.lang})`);
    });
    
    // 🔥 VOZ SELECCIONADA: Google español (Latinoamérica)
    let selectedVoice = null;
    
    // Primero, buscar la voz exacta que queremos
    selectedVoice = this.voices.find(v => v.name === 'Google español');
    
    // Si no la encuentra, buscar cualquier voz en español
    if (!selectedVoice) {
      console.log('[Voice] 🔍 Buscando otra voz en español...');
      selectedVoice = this.voices.find(v => v.lang.startsWith('es'));
    }
    
    // Si aún no hay voz en español, buscar cualquier voz que no sea inglesa
    if (!selectedVoice) {
      console.log('[Voice] 🔍 Buscando cualquier voz que no sea inglés...');
      selectedVoice = this.voices.find(v => !v.lang.startsWith('en'));
    }
    
    // Si aún no hay voz, usar la primera disponible
    if (!selectedVoice && this.voices.length > 0) {
      console.log('[Voice] 🔍 Usando la primera voz disponible');
      selectedVoice = this.voices[0];
    }
    
    // Asignar la voz encontrada
    if (selectedVoice) {
      this.voice = selectedVoice;
      console.log(`[Voice] ✅ Voz seleccionada: ${selectedVoice.name} (${selectedVoice.lang})`);
    } else {
      console.warn('[Voice] ❌ No hay voces disponibles en el navegador');
    }
  }

  /**
   * Activa o desactiva la voz
   * @param {boolean} state - true = activado, false = desactivado
   */
  toggle(state) {
    if (!this.initialized) {
      this.init();
    }
    
    this.enabled = state !== undefined ? state : !this.enabled;
    
    // Si se desactiva, cancelar cualquier voz en curso
    if (!this.enabled) {
      this.stop();
    }
    
    // Si se activa pero no hay voz cargada, intentar cargar
    if (this.enabled && !this.voice) {
      console.log('[Voice] 🔄 Intentando cargar voz al activar...');
      this.loadVoices();
    }
    
    console.log(`[Voice] 🔊 Voz ${this.enabled ? 'activada' : 'desactivada'}`);
    return this.enabled;
  }

  /**
   * Convierte texto a voz
   * @param {string} text - Texto a hablar
   * @param {Object} options - Opciones de voz (rate, pitch, voice)
   */
  speak(text, options = {}) {
    if (!this.enabled || !this.initialized) {
      return false;
    }

    // Si no hay voz cargada, intentar cargar
    if (!this.voice) {
      console.log('[Voice] 🔄 Intentando cargar voz antes de hablar...');
      this.loadVoices();
      if (!this.voice) {
        console.warn('[Voice] ❌ No hay voz disponible para hablar');
        return false;
      }
    }

    // Limpiar el texto de caracteres especiales
    const cleanText = this._cleanText(text);
    
    if (!cleanText || cleanText.length < 3) {
      return false;
    }

    // Cancelar cualquier voz en curso
    this.stop();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Configurar la voz
    utterance.lang = options.language || this.language;
    utterance.rate = options.rate || this.rate;
    utterance.pitch = options.pitch || this.pitch;
    
    // Usar la voz seleccionada o la especificada
    if (options.voice) {
      utterance.voice = options.voice;
    } else if (this.voice) {
      utterance.voice = this.voice;
    }

    // Eventos
    utterance.onstart = () => {
      this.isSpeaking = true;
      console.log('[Voice] 🗣️ Hablando...');
    };
    utterance.onend = () => {
      this.isSpeaking = false;
      console.log('[Voice] ✅ Voz finalizada');
    };
    utterance.onerror = (err) => {
      this.isSpeaking = false;
      console.warn('[Voice] ❌ Error:', err);
    };

    window.speechSynthesis.speak(utterance);
    return true;
  }

  /**
   * Detiene la voz actual
   */
  stop() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  /**
   * Limpia el texto de caracteres especiales y emojis
   * @param {string} text - Texto original
   * @returns {string} - Texto limpio
   */
  _cleanText(text) {
    if (!text) return '';
    
    return text
      // Eliminar markdown
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Negritas
      .replace(/\*(.*?)\*/g, '$1')      // Cursivas
      .replace(/`([^`]+)`/g, '$1')      // Código inline
      .replace(/```[\s\S]*?```/g, '')   // Bloques de código
      .replace(/#+\s/g, '')             // Títulos
      .replace(/[\[\]\(\)\{\}]/g, '')   // Corchetes y paréntesis
      // Eliminar emojis y caracteres especiales
      .replace(/[\u{1F600}-\u{1F6FF}]/gu, '')  // Emojis
      .replace(/[\u{2600}-\u{26FF}]/gu, '')    // Símbolos
      .replace(/[\u{2700}-\u{27BF}]/gu, '')    // Dingbats
      // Limpiar espacios y saltos de línea
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Obtiene la lista de voces disponibles
   */
  getVoices() {
    // Si no hay voces cargadas, intentar cargar
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    return this.voices;
  }

  /**
   * Obtiene el estado actual
   */
  getStatus() {
    return {
      enabled: this.enabled,
      initialized: this.initialized,
      isSpeaking: this.isSpeaking,
      language: this.language,
      voice: this.voice ? this.voice.name : null,
      rate: this.rate,
      pitch: this.pitch,
      voicesCount: this.voices.length,
      voicesLoaded: this.voicesLoaded
    };
  }
}

// Exportar una instancia única (singleton)
export const voiceManager = new VoiceManager();