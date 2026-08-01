// backend/src/routes/webhookRoutes.js
// 🎯 Rutas de webhooks de Instagram

import express from 'express';
import { procesarComentario } from '../controllers/commentController.js';
import { procesarDM } from '../controllers/dmController.js';

const router = express.Router();

// ─── VERIFICACIÓN DE WEBHOOK (GET) ──────────────────────────
router.get('/webhook/instagram-comment', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  console.log('[Webhook Verify] Mode:', mode);
  console.log('[Webhook Verify] Token:', token);
  console.log('[Webhook Verify] Challenge:', challenge);
  
  const VERIFY_TOKEN = 'Jarvisgideon';
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Webhook Verify] ✅ Verificado correctamente');
    res.status(200).send(challenge);
  } else {
    console.log('[Webhook Verify] ❌ Falló la verificación');
    res.sendStatus(403);
  }
});

// ─── COMENTARIOS (POST) ──────────────────────────────────────
router.post('/webhook/instagram-comment', procesarComentario);

// ─── DMS (POST) ──────────────────────────────────────────────
router.post('/webhook/instagram-dm', procesarDM);

export default router;