// backend/src/services/whatsappService.js
// Servicio de WhatsApp usando Puppeteer

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { agentRegistry } from '../agents/index.js';
import { getAIResponse } from '../controllers/aiController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WhatsAppService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isConnected = false;
    this.messageHandlers = [];
    this.sessionFile = path.join(__dirname, '../../whatsapp-session.json');
    this.qrCode = null;
    this.ready = false;
  }

  // ─── INICIALIZAR WHATSAPP ──────────────────────────────────────
  async init() {
    console.log('[WhatsApp] 📱 Inicializando WhatsApp...');
    
    try {
      // Lanzar navegador
      this.browser = await puppeteer.launch({
        headless: false, // false para ver QR y mantener sesión
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=800,700'
        ],
        defaultViewport: null,
      });

      this.page = await this.browser.newPage();
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Cargar WhatsApp Web
      await this.page.goto('https://web.whatsapp.com', { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });

      // Verificar si ya hay sesión guardada
      if (fs.existsSync(this.sessionFile)) {
        console.log('[WhatsApp] 🔄 Restaurando sesión...');
        // Intentar cargar estado de sesión
        const sessionData = JSON.parse(fs.readFileSync(this.sessionFile, 'utf-8'));
        // Aquí iría la lógica de restauración de sesión
      }

      // Esperar login
      await this.waitForLogin();
      
      console.log('[WhatsApp] ✅ WhatsApp conectado!');
      this.ready = true;
      
      // Iniciar escucha de mensajes
      this.startListening();
      
    } catch (error) {
      console.error('[WhatsApp] ❌ Error:', error.message);
      throw error;
    }
  }

  // ─── ESPERAR LOGIN ──────────────────────────────────────────────
  async waitForLogin() {
    console.log('[WhatsApp] 📱 Escanea el código QR con WhatsApp');
    console.log('[WhatsApp] ⏳ Esperando login...');

    // Generar QR
    await this.page.waitForSelector('canvas[aria-label="Scan me!"]', { timeout: 30000 });
    const qrCanvas = await this.page.$('canvas[aria-label="Scan me!"]');
    if (qrCanvas) {
      const qrBase64 = await this.page.evaluate(el => el.toDataURL(), qrCanvas);
      this.qrCode = qrBase64;
      console.log('[WhatsApp] ✅ QR generado. Escanea con tu WhatsApp.');
    }

    // Esperar que el usuario escanee el QR
    await this.page.waitForFunction(
      () => {
        const title = document.querySelector('div[data-testid="chat-list"]');
        return title !== null;
      },
      { timeout: 120000 }
    );

    this.isConnected = true;
    console.log('[WhatsApp] ✅ Sesión iniciada correctamente!');
    
    // Guardar sesión
    await this.saveSession();
  }

  // ─── GUARDAR SESIÓN ─────────────────────────────────────────────
  async saveSession() {
    try {
      const cookies = await this.page.cookies();
      const sessionData = {
        cookies,
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync(this.sessionFile, JSON.stringify(sessionData, null, 2));
      console.log('[WhatsApp] 💾 Sesión guardada');
    } catch (error) {
      console.warn('[WhatsApp] ⚠️ No se pudo guardar sesión:', error.message);
    }
  }

  // ─── ESCUCHAR MENSAJES ──────────────────────────────────────────
  async startListening() {
    console.log('[WhatsApp] 👂 Escuchando mensajes...');

    // Esperar a que la interfaz cargue
    await this.page.waitForSelector('div[data-testid="chat-list"]', { timeout: 30000 });

    // Interceptar mensajes nuevos
    await this.page.exposeFunction('onNewMessage', async (message) => {
      console.log('[WhatsApp] 📨 Nuevo mensaje:', message);
      await this.handleMessage(message);
    });

    // Monitorear cambios en la lista de chats
    await this.page.evaluate(() => {
      // Observer para detectar nuevos mensajes
      const observer = new MutationObserver(async (mutations) => {
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            // Buscar nuevos mensajes
            const messages = document.querySelectorAll('[data-testid="msg-container"]');
            const lastMessage = messages[messages.length - 1];
            if (lastMessage) {
              const text = lastMessage.querySelector('[data-testid="message-text"]')?.textContent;
              const sender = lastMessage.closest('[data-testid="chat-list"]')?.querySelector('[data-testid="conversation-title"]')?.textContent;
              if (text && sender) {
                window.onNewMessage({
                  sender: sender,
                  text: text,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });

    console.log('[WhatsApp] ✅ Escucha activa');
  }

  // ─── PROCESAR MENSAJE ───────────────────────────────────────────
  async handleMessage(message) {
    try {
      const { sender, text, timestamp } = message;
      
      console.log(`[WhatsApp] 📨 De: ${sender} | Texto: "${text}"`);

      // Detectar agente por comandos en el mensaje
      let agentId = 'jarvis'; // default
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('/gideon') || lowerText.includes('gideon')) agentId = 'gideon';
      else if (lowerText.includes('/heimdall') || lowerText.includes('heimdall')) agentId = 'heimdall';
      else if (lowerText.includes('/kill')) agentId = 'kill';
      else if (lowerText.includes('/research')) agentId = 'kill-research';
      else if (lowerText.includes('/write')) agentId = 'kill-write';
      else if (lowerText.includes('/code')) agentId = 'kill-code';
      else if (lowerText.includes('/jarvis') || lowerText.includes('jarvis')) agentId = 'jarvis';

      // Remover comando del texto
      const cleanText = text.replace(/\/\w+/g, '').trim() || text;

      // Procesar con el agente correspondiente
      const result = await agentRegistry.processMessage(cleanText, agentId, {
        source: 'whatsapp',
        sender: sender,
        timestamp: timestamp
      });

      // Enviar respuesta
      const responseText = result.text || 'Procesado correctamente';
      await this.sendMessage(sender, responseText);

      console.log(`[WhatsApp] ✅ Respondido a ${sender}`);

    } catch (error) {
      console.error('[WhatsApp] ❌ Error procesando mensaje:', error.message);
      await this.sendMessage(message.sender, '❌ Ocurrió un error procesando tu mensaje. Intentá de nuevo.');
    }
  }

  // ─── ENVIAR MENSAJE ─────────────────────────────────────────────
  async sendMessage(contact, text) {
    try {
      console.log(`[WhatsApp] 📤 Enviando a ${contact}: "${text.substring(0, 50)}..."`);

      // Buscar el chat
      await this.page.waitForSelector('div[data-testid="chat-list"]', { timeout: 10000 });
      
      // Hacer clic en el chat del contacto
      const chatItem = await this.page.evaluateHandle((contactName) => {
        const items = document.querySelectorAll('[data-testid="chat-list"] div[role="row"]');
        for (const item of items) {
          const title = item.querySelector('[data-testid="conversation-title"]');
          if (title && title.textContent.includes(contactName)) {
            return item;
          }
        }
        return null;
      }, contact);

      if (chatItem) {
        await chatItem.click();
        await this.page.waitForTimeout(500);
      } else {
        // Si no existe, intentar crear nuevo chat
        await this.page.click('div[data-testid="new-chat-button"]');
        await this.page.waitForTimeout(500);
        await this.page.type('div[data-testid="search-input"]', contact);
        await this.page.waitForTimeout(1000);
        await this.page.click('div[data-testid="cell"]');
        await this.page.waitForTimeout(500);
      }

      // Escribir mensaje
      const textarea = await this.page.waitForSelector('div[data-testid="conversation-compose-box-input"]');
      await textarea.click();
      await textarea.type(text);
      
      // Enviar
      await this.page.click('button[data-testid="compose-btn-send"]');
      
      console.log('[WhatsApp] ✅ Mensaje enviado');

    } catch (error) {
      console.error('[WhatsApp] ❌ Error enviando:', error.message);
      throw error;
    }
  }

  // ─── OBTENER QR ─────────────────────────────────────────────────
  getQR() {
    return this.qrCode;
  }

  // ─── ESTADO ─────────────────────────────────────────────────────
  getStatus() {
    return {
      connected: this.isConnected,
      ready: this.ready,
      browser: this.browser !== null
    };
  }

  // ─── CERRAR ─────────────────────────────────────────────────────
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.isConnected = false;
      this.ready = false;
      console.log('[WhatsApp] 🔒 Sesión cerrada');
    }
  }
}

export default new WhatsAppService();