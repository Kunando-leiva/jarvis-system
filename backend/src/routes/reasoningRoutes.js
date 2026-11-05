// backend/src/routes/reasoningRoutes.js
import express from 'express';
import { reasoningService } from '../app.js';
import { logger } from '../core/logger.js';

const router = express.Router();

// ─── CREAR PLAN DE RAZONAMIENTO ──────────────────────────────
router.post('/reasoning/plan', async (req, res) => {
  const { query, userId, sessionId } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Se requiere query' });
  }
  
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Se requiere sessionId' });
  }
  
  try {
    if (!reasoningService) {
      return res.status(503).json({
        success: false,
        error: 'ReasoningService no disponible'
      });
    }
    
    const result = await reasoningService.createPlan(query, userId, sessionId);
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    logger.error('[ReasoningRoutes] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;