// backend/src/routes/index.js
// 🎯 CENTRALIZA TODAS LAS RUTAS

import express from 'express';
import agentRoutes from './agentRoutes.js';
import whatsappRoutes from './whatsappRoutes.js';
import metricsRoutes from './metricsRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import publishRoutes from './publishRoutes.js';
import memoryRoutes from './memoryRoutes.js';
import reasoningRoutes from './reasoningRoutes.js';

const router = express.Router();

// Montar todas las rutas
router.use('/', agentRoutes);
router.use('/', whatsappRoutes);
router.use('/', metricsRoutes);
router.use('/', webhookRoutes);
router.use('/', publishRoutes);
router.use('/', memoryRoutes);
router.use('/api', reasoningRoutes);

export default router;