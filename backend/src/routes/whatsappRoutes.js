// backend/src/routes/whatsappRoutes.js
// Rutas para WhatsApp

import express from 'express';
import whatsappService from '../services/whatsappService.js';
import { agentRegistry } from '../agents/index.js';

const router = express.Router();

// ─── ESTADO DE WHATSAPP ──────────────────────────────────────────
router.get('/whatsapp/status', (req, res) => {
  try {
    const status = whatsappService.getStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── QR PARA CONECTAR ────────────────────────────────────────────
router.get('/whatsapp/qr', (req, res) => {
  try {
    const qr = whatsappService.getQR();
    if (qr) {
      res.json({ success: true, qr });
    } else {
      res.json({ success: false, message: 'QR no disponible. Esperando conexión...' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── ENVIAR MENSAJE ──────────────────────────────────────────────
router.post('/whatsapp/send', async (req, res) => {
  try {
    const { contact, message } = req.body;
    
    if (!contact || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requiere contact y message' 
      });
    }

    await whatsappService.sendMessage(contact, message);
    res.json({ success: true, message: 'Mensaje enviado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── WEBHOOK PARA RECIBIR MENSAJES ──────────────────────────────
router.post('/whatsapp/webhook', async (req, res) => {
  try {
    const { sender, text, timestamp } = req.body;
    
    if (!sender || !text) {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requiere sender y text' 
      });
    }

    // Procesar mensaje
    await whatsappService.handleMessage({
      sender,
      text,
      timestamp: timestamp || new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── INICIAR WHATSAPP ─────────────────────────────────────────────
router.post('/whatsapp/start', async (req, res) => {
  try {
    await whatsappService.init();
    res.json({ success: true, message: 'WhatsApp iniciado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── CERRAR WHATSAPP ─────────────────────────────────────────────
router.post('/whatsapp/stop', async (req, res) => {
  try {
    await whatsappService.close();
    res.json({ success: true, message: 'WhatsApp cerrado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;