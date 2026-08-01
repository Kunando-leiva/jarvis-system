// backend/src/routes/agentRoutes.js
// Rutas para el Centro de Comando

import express from 'express';
import { agentRegistry, createCustomAgent } from '../agents/index.js';

const router = express.Router();

// ──────────────────────────────────────────────────────────────
// 📋 OBTENER TODOS LOS AGENTES
// ──────────────────────────────────────────────────────────────

router.get('/agents', (req, res) => {
  try {
    const agents = agentRegistry.getAllAgents();
    res.json({ success: true, agents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
// 📋 OBTENER UN AGENTE ESPECÍFICO
// ──────────────────────────────────────────────────────────────

router.get('/agents/:id', (req, res) => {
  try {
    const agent = agentRegistry.getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agente no encontrado' });
    }
    res.json({ success: true, agent: agent.getStatus() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
// 📤 CREAR NUEVO AGENTE PERSONALIZADO
// ──────────────────────────────────────────────────────────────

router.post('/agents', (req, res) => {
  try {
    const { name, icon, description, color, systemPrompt, skills } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Se requiere nombre' });
    }

    const newAgent = createCustomAgent({
      name,
      icon: icon || '🔧',
      description: description || 'Agente personalizado',
      color: color || '#ffffff',
      systemPrompt: systemPrompt || 'Sos un asistente útil.',
      skills: skills || []
    });

    agentRegistry.register(newAgent);
    res.json({ success: true, agent: newAgent.getStatus() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
// 🔄 ENVIAR MENSAJE A UN AGENTE
// ──────────────────────────────────────────────────────────────

router.post('/agents/:id/message', async (req, res) => {
  try {
    const { message, context } = req.body;
    const agentId = req.params.id;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Se requiere mensaje' });
    }

    const result = await agentRegistry.processMessage(message, agentId, context || {});
    res.json({ success: true, result, agentId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
// 📜 HISTORIAL DE CONVERSACIONES
// ──────────────────────────────────────────────────────────────

router.get('/agents/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = agentRegistry.getHistory(limit);
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;