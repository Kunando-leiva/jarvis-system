// frontend/js/components/Chat.js
// 🎯 Componente de chat

import { state } from '../core/state.js';
import { socketManager } from '../core/socket.js';
import { formatText, formatTime } from '../utils/formatters.js';
import { $, show, hide, toast } from '../utils/dom.js';

export class Chat {
  constructor(inputElement, sendButton, micButton = null) {
    this.input = inputElement;
    this.button = sendButton;
    this.micButton = micButton;
    this.container = $('#response-container');
    this.isListening = false;
    this.recognition = null;
    
    this.setupListeners();
    this.setupVoice();
  }

  setupListeners() {
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.send();
    });
    
    this.button.addEventListener('click', () => this.send());
    
    // Comandos rápidos
    document.addEventListener('quickPrompt', (e) => {
      this.input.value = e.detail.message;
      this.send();
    });
    
    // Respuestas del socket
    socketManager.on('agentResponse', ({ agentId, text }) => {
      this.displayMessage(text, agentId);
    });
    
    socketManager.on('agentError', ({ error }) => {
      this.displayMessage(`❌ Error: ${error}`, 'system');
    });
    
    socketManager.on('aiResponse', (data) => {
      if (data.text) {
        const provider = data.provider?.toUpperCase() || data.mode || 'SISTEMA';
        this.displayMessage(data.text, provider);
      }
    });
    
    socketManager.on('stateChange', (data) => {
      if (data.mode) {
        this.displayMessage(`🔄 Modo cambiado a **${data.mode}**`, 'system');
      }
    });
  }

  setupVoice() {
    if (!this.micButton) return;
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-ES';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      
      this.recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        this.input.value = text;
        this.micButton.classList.remove('listening');
        this.isListening = false;
        setTimeout(() => this.send(), 300);
      };
      
      this.recognition.onerror = () => {
        this.micButton.classList.remove('listening');
        this.isListening = false;
        toast('❌ Error al escuchar');
      };
      
      this.recognition.onend = () => {
        this.micButton.classList.remove('listening');
        this.isListening = false;
      };
      
      this.micButton.addEventListener('click', () => {
        if (this.isListening) {
          this.recognition.stop();
          return;
        }
        this.micButton.classList.add('listening');
        this.isListening = true;
        this.recognition.start();
      });
    } else {
      this.micButton.style.opacity = '0.3';
      this.micButton.title = 'Micrófono no soportado';
    }
  }

  send() {
    const text = this.input.value.trim();
    if (!text) return;
    
    if (text.startsWith('/')) {
      this.handleCommand(text);
      return;
    }
    
    this.displayMessage(text, 'user');
    
    const agentId = state.currentAgent;
    socketManager.sendMessage(agentId, text);
    socketManager.sendUserMessage(text);
    
    this.input.value = '';
  }

  displayMessage(text, role) {
    if (!this.container) return;
    
    const agent = state.getAgent(role);
    const isUser = role === 'user';
    const isSystem = role === 'system' || role === 'SISTEMA';
    
    const color = isUser ? '#8a94a8' : 
                  isSystem ? '#6a7a8a' :
                  agent?.color || '#00e5ff';
    const icon = isUser ? '👤' : 
                 isSystem ? '⚡' :
                 agent?.icon || '🤖';
    const name = isUser ? 'Tú' : 
                 isSystem ? 'SISTEMA' :
                 agent?.name || role.toUpperCase();
    
    const item = document.createElement('div');
    item.className = 'response-item';
    item.innerHTML = `
      <span class="response-icon">${icon}</span>
      <div class="response-content">
        <div class="response-header">
          <span class="response-name" style="color:${color}">${name}</span>
          <span class="response-time">${formatTime(new Date())}</span>
        </div>
        <div class="response-text">${formatText(text)}</div>
      </div>
    `;
    
    this.container.appendChild(item);
    this.container.scrollTop = this.container.scrollHeight;
    
    show(this.container);
    
    while (this.container.children.length > 50) {
      this.container.removeChild(this.container.children[0]);
    }
    
    // Voice
    if (state.isVoiceEnabled && !isUser && text.length > 5) {
      this.speakText(text);
    }
  }

  speakText(text) {
    if (!('speechSynthesis' in window)) return;
    
    const cleanText = text.replace(/[\[\]\(\)\*\_\#\n]/g, '').trim();
    if (cleanText.length < 3) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith('es'));
    if (spanishVoice) utterance.voice = spanishVoice;
    
    window.speechSynthesis.speak(utterance);
  }

  handleCommand(text) {
    const lower = text.toLowerCase().trim();
    
    if (lower === '/help') {
      this.displayMessage(
        '📖 **Comandos disponibles:**\n' +
        '/jarvis - Cambiar a JARVIS\n' +
        '/gideon - Cambiar a GIDEON\n' +
        '/heimdall - Cambiar a HEIMDALL\n' +
        '/kill - Cambiar a KILL\n' +
        '/content-creator - Cambiar a CONTENT-CREATOR\n' +
        '/clear - Limpiar pantalla\n' +
        '/voice - Activar/Desactivar voz\n' +
        '/help - Mostrar esta ayuda',
        'system'
      );
      return;
    }
    
    if (lower === '/clear') {
      if (this.container) this.container.innerHTML = '';
      hide(this.container);
      return;
    }
    
    if (lower === '/voice') {
      state.toggleVoice();
      this.displayMessage(
        `🔊 Voz ${state.isVoiceEnabled ? 'activada' : 'desactivada'}`,
        'system'
      );
      return;
    }
    
    const agentMap = {
      'jarvis': 'jarvis',
      'gideon': 'gideon',
      'heimdall': 'heimdall',
      'kill': 'kill',
      'kill-research': 'kill-research',
      'kill-write': 'kill-write',
      'kill-code': 'kill-code',
      'content-creator': 'content-creator'
    };
    
    for (const [key, id] of Object.entries(agentMap)) {
      if (lower === '/' + key) {
        state.setAgent(id);
        this.input.placeholder = `💬 Mensaje para ${id.toUpperCase()}...`;
        const agent = state.getAgent(id);
        this.displayMessage(`🔄 Cambiado a **${agent.name}** ${agent.icon}`, 'system');
        return;
      }
    }
    
    this.displayMessage(`❌ Comando "${text}" no reconocido. Usá /help`, 'system');
  }
}