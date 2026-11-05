// frontend/js/chat.js
// 🧠 CHAT CON MEMORIA COGNITIVA PERSISTENTE

import { getUserId, getSessionId } from '../utils/userId.js';

// ─── CONFIGURACIÓN ──────────────────────────────────────────────
const CHAT_HISTORY_KEY = 'jarvisChatHistory';
const MAX_HISTORY = 50;

// ─── ESTADO ─────────────────────────────────────────────────────
let userId = getUserId();
let sessionId = getSessionId();
let chatHistory = [];
let isProcessing = false;

// ─── ELEMENTOS DOM ──────────────────────────────────────────────
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');

// ─── FUNCIONES PRINCIPALES ──────────────────────────────────────

/**
 * Enviar mensaje al chat
 * ✅ Usa CognitiveMemoryService para extraer y guardar hechos
 */
async function sendMessage() {
  const text = chatInput.value.trim();
  
  if (!text || isProcessing) return;
  
  // Limpiar input
  chatInput.value = '';
  
  // Mostrar mensaje del usuario
  addMessage('user', text);
  
  // ✅ PASO 1: Guardar en CognitiveMemoryService
  await saveToCognitiveMemory(text);
  
  // ✅ PASO 2: Obtener respuesta de JARVIS
  isProcessing = true;
  showTypingIndicator();
  
  try {
    const response = await getJarvisResponse(text);
    hideTypingIndicator();
    
    // Mostrar respuesta
    addMessage('jarvis', response);
    
    // ✅ PASO 3: Guardar respuesta en CognitiveMemoryService
    await saveToCognitiveMemory(response, 'response');
    
  } catch (error) {
    hideTypingIndicator();
    addMessage('system', '❌ Error al procesar tu mensaje. Intenta de nuevo.');
    console.error('[Chat] Error:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * ✅ Guardar en CognitiveMemoryService a través de la API
 */
async function saveToCognitiveMemory(text, type = 'user') {
  try {
    const response = await fetch('/api/memory/cognitive/extract-and-save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        userId: userId,
        sessionId: sessionId,
        tags: [type, 'chat']
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`[CognitiveMemory] ${result.count} hechos extraídos y guardados`);
      
      // Si hay hechos, guardarlos también como contexto de chat
      if (result.facts && result.facts.length > 0) {
        await fetch('/api/memory/cognitive/remember', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: text,
            type: 'context',
            userId: userId,
            sessionId: sessionId,
            importance: 2,
            tags: ['chat', type]
          })
        });
      }
    }
  } catch (error) {
    console.error('[CognitiveMemory] Error guardando:', error);
  }
}

/**
 * ✅ Obtener respuesta de JARVIS usando ReasoningService
 */
async function getJarvisResponse(text) {
  try {
    const response = await fetch('/api/reasoning/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: text,
        userId: userId,
        sessionId: sessionId
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.plan?.steps?.length > 0) {
      // Extraer la respuesta del plan
      const output = result.plan.steps
        .filter(s => s.output)
        .map(s => s.output)
        .join('\n');
      
      return output || 'No tengo una respuesta para eso.';
    }
    
    return 'Lo siento, no pude procesar tu consulta.';
    
  } catch (error) {
    console.error('[Chat] Error obteniendo respuesta:', error);
    return '❌ Error al conectar con JARVIS. Intenta de nuevo.';
  }
}

/**
 * Agregar mensaje al chat
 */
function addMessage(type, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  
  const timestamp = new Date().toLocaleTimeString();
  
  if (type === 'user') {
    messageDiv.innerHTML = `
      <div class="message-content">
        <span class="message-text">${escapeHtml(content)}</span>
        <span class="message-time">${timestamp}</span>
      </div>
    `;
  } else if (type === 'jarvis') {
    messageDiv.innerHTML = `
      <div class="message-content">
        <span class="message-sender">🧠 JARVIS</span>
        <span class="message-text">${formatResponse(content)}</span>
        <span class="message-time">${timestamp}</span>
      </div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="message-content system">
        <span class="message-text">⚡ ${content}</span>
      </div>
    `;
  }
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Guardar en historial
  chatHistory.push({ type, content, timestamp });
  if (chatHistory.length > MAX_HISTORY) {
    chatHistory.shift();
  }
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
}

/**
 * Mostrar indicador de escritura
 */
function showTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'typing-indicator';
  indicator.className = 'message jarvis';
  indicator.innerHTML = `
    <div class="message-content">
      <span class="message-sender">🧠 JARVIS</span>
      <span class="typing-dots">
        <span>.</span><span>.</span><span>.</span>
      </span>
    </div>
  `;
  chatMessages.appendChild(indicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Ocultar indicador de escritura
 */
function hideTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.remove();
  }
}

/**
 * Formatear respuesta (soporta saltos de línea y emojis)
 */
function formatResponse(text) {
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

/**
 * Escapar HTML para prevenir XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Restaurar historial desde localStorage
 */
function restoreHistory() {
  const saved = localStorage.getItem(CHAT_HISTORY_KEY);
  if (saved) {
    try {
      chatHistory = JSON.parse(saved);
      chatHistory.forEach(msg => {
        addMessage(msg.type, msg.content);
      });
    } catch (error) {
      console.error('[Chat] Error restaurando historial:', error);
    }
  }
}

/**
 * Cargar contexto de CognitiveMemory al iniciar
 */
async function loadMemoryContext() {
  try {
    const response = await fetch(`/api/memory/cognitive/personal-info?userId=${userId}`);
    const result = await response.json();
    
    if (result.success && result.info && Object.keys(result.info).length > 0) {
      const infoSummary = Object.entries(result.info)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      addMessage('system', `🧠 JARVIS recuerda: ${infoSummary}`);
    }
  } catch (error) {
    console.error('[Chat] Error cargando memoria:', error);
  }
}

// ─── INICIALIZACIÓN ─────────────────────────────────────────────

// Restaurar historial
restoreHistory();

// Cargar contexto de memoria
loadMemoryContext();

// Event listeners
sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Mostrar userId en consola para debugging
console.log('[Chat] Inicializado', { userId, sessionId });

// ─── EXPORTAR ──────────────────────────────────────────────────
export { sendMessage, addMessage };