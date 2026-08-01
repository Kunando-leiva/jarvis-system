// backend/src/routes/memoryRoutes.js
// 🎯 Rutas de memoria y estado del sistema

import express from 'express';
import memoryService from '../services/memoryService.js';

const router = express.Router();

// ─── HISTORIAL DE CONVERSACIÓN ──────────────────────────────
router.get('/memory/history', async (req, res) => {
  const { sessionId, limit } = req.query;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Se requiere sessionId' });
  }
  
  try {
    const history = await memoryService.getConversationHistory(sessionId, parseInt(limit) || 20);
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── CONTEXTO DE CONVERSACIÓN ──────────────────────────────
router.get('/memory/context', async (req, res) => {
  const { sessionId } = req.query;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Se requiere sessionId' });
  }
  
  try {
    const context = await memoryService.getContext(sessionId);
    res.json({ success: true, context });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── PUBLICACIONES GUARDADAS ────────────────────────────────
router.get('/memory/publications', async (req, res) => {
  const { limit } = req.query;
  
  try {
    const publications = await memoryService.getPublications(parseInt(limit) || 50);
    res.json({ success: true, publications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GUARDAR PUBLICACIÓN MANUAL ─────────────────────────────
router.post('/memory/publication', async (req, res) => {
  const { titulo, postId, success, metadata } = req.body;
  
  try {
    const result = await memoryService.savePublication({
      titulo,
      postId,
      success,
      metadata: metadata || {}
    });
    res.json({ success: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── LIMPIAR HISTORIAL ──────────────────────────────────────
router.delete('/memory/clear', async (req, res) => {
  const { sessionId } = req.query;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Se requiere sessionId' });
  }
  
  try {
    const result = await memoryService.clearSession(sessionId);
    res.json({ success: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── ESTADO DEL SISTEMA ──────────────────────────────────────
router.get('/memory/state', async (req, res) => {
  try {
    const state = await memoryService.getSystemState();
    res.json({ success: true, state });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;