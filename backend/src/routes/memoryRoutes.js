// backend/src/routes/memoryRoutes.js
// 🎯 Rutas de memoria y estado del sistema
// 🧠 CON MEMORIA COGNITIVA PERSISTENTE (Fase 4.1) - CON userId

import express from 'express';
import memoryService from '../services/memoryService.js';
import { cognitiveMemory } from '../app.js';

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

// ════════════════════════════════════════════════════════════
// 🧠 RUTAS DE MEMORIA COGNITIVA (Fase 4.1) - CON userId
// ════════════════════════════════════════════════════════════

// ─── GUARDAR EN MEMORIA COGNITIVA ──────────────────────────
router.post('/memory/cognitive/remember', async (req, res) => {
  const { content, type, userId, sessionId, importance, tags } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Se requiere content' });
  }
  
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Se requiere sessionId' });
  }
  
  try {
    if (!cognitiveMemory) {
      return res.status(503).json({ 
        success: false, 
        error: 'Memoria cognitiva no disponible' 
      });
    }
    
    const result = await cognitiveMemory.remember(content, {
      type: type || 'fact',
      source: 'user',
      userId,      // ✅ PASAR userId
      sessionId,
      importance: importance || 3,
      tags: tags || []
    });
    
    res.json({ 
      success: true, 
      memory: result,
      message: 'Memoria guardada exitosamente'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── RECORDAR DE MEMORIA COGNITIVA ──────────────────────────
router.get('/memory/cognitive/recall', async (req, res) => {
  const { query, userId, sessionId, limit } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Se requiere query' });
  }
  
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }
  
  try {
    if (!cognitiveMemory) {
      return res.status(503).json({ 
        success: false, 
        error: 'Memoria cognitiva no disponible' 
      });
    }
    
    const memories = await cognitiveMemory.recall(query, {
      userId,      // ✅ PASAR userId
      sessionId: sessionId || null,
      limit: parseInt(limit) || 5
    });
    
    res.json({ 
      success: true, 
      memories,
      count: memories.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── OBTENER CONTEXTO COGNITIVO ─────────────────────────────
router.get('/memory/cognitive/context', async (req, res) => {
  const { userId, sessionId, limit } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Se requiere sessionId' });
  }
  
  try {
    if (!cognitiveMemory) {
      return res.status(503).json({ 
        success: false, 
        error: 'Memoria cognitiva no disponible' 
      });
    }
    
    const result = await cognitiveMemory.getContext(
      userId,      // ✅ PASAR userId
      sessionId, 
      parseInt(limit) || 10
    );
    
    res.json({ 
      success: true, 
      context: result.context,
      memories: result.memories,
      count: result.memories?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── EXTRAER HECHOS DE UN TEXTO ─────────────────────────────
router.post('/memory/cognitive/extract-facts', async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Se requiere text' });
  }
  
  try {
    if (!cognitiveMemory) {
      return res.status(503).json({ 
        success: false, 
        error: 'Memoria cognitiva no disponible' 
      });
    }
    
    const facts = await cognitiveMemory.extractFacts(text);
    
    res.json({ 
      success: true, 
      facts,
      count: facts.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── EXTRAER Y GUARDAR HECHOS AUTOMÁTICAMENTE ──────────────
router.post('/memory/cognitive/extract-and-save', async (req, res) => {
  const { text, userId, sessionId, tags } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Se requiere text' });
  }
  
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Se requiere sessionId' });
  }
  
  try {
    if (!cognitiveMemory) {
      return res.status(503).json({ 
        success: false, 
        error: 'Memoria cognitiva no disponible' 
      });
    }
    
    const facts = await cognitiveMemory.extractAndRemember(text, {
      userId,      // ✅ PASAR userId
      sessionId,
      tags: tags || []
    });
    
    res.json({ 
      success: true, 
      facts,
      count: facts.length,
      message: `${facts.length} hechos extraídos y guardados`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── RESUMEN DE CONVERSACIÓN COGNITIVA ──────────────────────
router.get('/memory/cognitive/summary', async (req, res) => {
  const { userId, sessionId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Se requiere sessionId' });
  }
  
  try {
    if (!cognitiveMemory) {
      return res.status(503).json({ 
        success: false, 
        error: 'Memoria cognitiva no disponible' 
      });
    }
    
    const summary = await cognitiveMemory.summarizeConversation(userId, sessionId);
    
    res.json({ 
      success: true, 
      summary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── LISTAR MEMORIAS POR TIPO ────────────────────────────────
router.get('/memory/cognitive/by-type', async (req, res) => {
  const { type, userId, sessionId, limit } = req.query;
  
  if (!type) {
    return res.status(400).json({ error: 'Se requiere type' });
  }
  
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Se requiere sessionId' });
  }
  
  try {
    if (!cognitiveMemory) {
      return res.status(503).json({ 
        success: false, 
        error: 'Memoria cognitiva no disponible' 
      });
    }
    
    const memories = await cognitiveMemory.getByType(
      type,
      userId,      // ✅ PASAR userId
      sessionId,
      parseInt(limit) || 20
    );
    
    res.json({ 
      success: true, 
      memories,
      count: memories.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── ÚLTIMAS MEMORIAS DE UNA SESIÓN ─────────────────────────
router.get('/memory/cognitive/latest', async (req, res) => {
  const { userId, sessionId, limit } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Se requiere sessionId' });
  }
  
  try {
    if (!cognitiveMemory) {
      return res.status(503).json({ 
        success: false, 
        error: 'Memoria cognitiva no disponible' 
      });
    }
    
    const memories = await cognitiveMemory.getLatest(
      userId,      // ✅ PASAR userId
      sessionId,
      parseInt(limit) || 10
    );
    
    res.json({ 
      success: true, 
      memories,
      count: memories.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── OLVIDAR MEMORIA (MARCAR COMO DEPRECADA) ────────────────
router.delete('/memory/cognitive/forget/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: 'Se requiere id' });
  }
  
  try {
    if (!cognitiveMemory) {
      return res.status(503).json({ 
        success: false, 
        error: 'Memoria cognitiva no disponible' 
      });
    }
    
    await cognitiveMemory.forget(id);
    
    res.json({ 
      success: true, 
      message: `Memoria ${id} marcada como deprecada`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── MÉTRICAS DE MEMORIA COGNITIVA ──────────────────────────
router.get('/memory/cognitive/metrics', async (req, res) => {
  try {
    if (!cognitiveMemory) {
      return res.status(503).json({ 
        success: false, 
        error: 'Memoria cognitiva no disponible' 
      });
    }
    
    const metrics = cognitiveMemory.getMetrics();
    
    res.json({ 
      success: true, 
      metrics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── OBTENER INFORMACIÓN PERSONAL ───────────────────────────
router.get('/memory/cognitive/personal-info', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }

  try {
    if (!cognitiveMemory) {
      return res.status(503).json({
        success: false,
        error: 'Memoria cognitiva no disponible'
      });
    }

    const info = await cognitiveMemory.getPersonalInfo(userId);

    res.json({
      success: true,
      info,
      count: Object.keys(info).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── RECUPERAR POR CLAVE (DETERMINISTA) ─────────────────────
router.get('/memory/cognitive/by-key', async (req, res) => {
  const { key, userId, sessionId } = req.query;

  if (!key) {
    return res.status(400).json({ error: 'Se requiere key' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }

  try {
    if (!cognitiveMemory) {
      return res.status(503).json({
        success: false,
        error: 'Memoria cognitiva no disponible'
      });
    }

    const result = await cognitiveMemory.recallByKey(key, userId, sessionId || null);

    res.json({
      success: true,
      exists: result.exists,
      key: result.key,
      value: result.value,
      memory: result.memory
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── LIMPIAR MEMORIA COGNITIVA DE UNA SESIÓN ────────────────
router.delete('/memory/cognitive/clear-session', async (req, res) => {
  const { userId, sessionId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Se requiere sessionId' });
  }
  
  try {
    if (!cognitiveMemory) {
      return res.status(503).json({ 
        success: false, 
        error: 'Memoria cognitiva no disponible' 
      });
    }
    
    // Obtener todas las memorias de la sesión
    const memories = await cognitiveMemory.getLatest(userId, sessionId, 1000);
    
    // Marcar cada una como deprecada
    for (const mem of memories) {
      await cognitiveMemory.forget(mem.id);
    }
    
    res.json({ 
      success: true, 
      message: `Se limpiaron ${memories.length} memorias de la sesión ${sessionId}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;