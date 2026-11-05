// backend/src/memory/memoryRetriever.js
// 🔎 RECUPERADOR DE MEMORIA - CON userId PERSISTENTE

import { logger } from '../core/logger.js';
import { MEMORY_STATUS } from './memoryTypes.js';

class MemoryRetriever {
  constructor(store) {
    this.store = store;
  }

  async search(query, options = {}) {
    if (!this.store) {
      logger.warn('[MemoryRetriever] Store no disponible');
      return [];
    }

    try {
      const results = await this.store.search(query, options);
      return results;
    } catch (error) {
      logger.error('[MemoryRetriever] Error en búsqueda', {
        error: error.message
      });
      return [];
    }
  }

  rankByRelevance(memories, query) {
    if (!memories || memories.length === 0) return [];

    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    return memories.sort((a, b) => {
      const scoreA = this.calculateScore(a, queryWords);
      const scoreB = this.calculateScore(b, queryWords);
      return scoreB - scoreA;
    });
  }

  calculateScore(memory, queryWords) {
    let score = 0;
    const content = memory.content.toLowerCase();
    const tags = memory.tags || [];

    for (const word of queryWords) {
      if (content.includes(word)) {
        score += 2;
      }
    }

    for (const tag of tags) {
      if (queryWords.some(w => tag.toLowerCase().includes(w))) {
        score += 3;
      }
    }

    score += (memory.importance || 1) * 2;

    const age = Date.now() - new Date(memory.createdAt).getTime();
    const days = age / (1000 * 60 * 60 * 24);
    score += Math.max(0, 1 - days / 30);

    if (memory.confidence > 0.8) {
      score += 2;
    }

    return score;
  }

  async getRelated(memoryId, userId, limit = 5) {
    if (!this.store) return [];

    try {
      const memory = await this.store.get(memoryId);
      if (!memory) return [];

      const tags = memory.tags || [];
      if (tags.length === 0) return [];

      const results = await this.store.list({
        tags: tags,
        userId,
        limit: limit + 1,
        status: MEMORY_STATUS.ACTIVE
      });

      return results.filter(m => m.id !== memoryId).slice(0, limit);
    } catch (error) {
      logger.error('[MemoryRetriever] Error obteniendo relacionadas', {
        error: error.message
      });
      return [];
    }
  }

  async getLatest(userId, sessionId, limit = 10) {
    if (!this.store) return [];

    try {
      const memories = await this.store.list({
        userId,
        sessionId,
        limit,
        status: MEMORY_STATUS.ACTIVE
      });
      return memories;
    } catch (error) {
      logger.error('[MemoryRetriever] Error obteniendo últimas', {
        error: error.message
      });
      return [];
    }
  }

  async getByType(type, userId, sessionId, limit = 20) {
    if (!this.store) return [];

    try {
      const memories = await this.store.list({
        type,
        userId,
        sessionId,
        limit,
        status: MEMORY_STATUS.ACTIVE
      });
      return memories;
    } catch (error) {
      logger.error('[MemoryRetriever] Error obteniendo por tipo', {
        error: error.message
      });
      return [];
    }
  }

  // ✅ NUEVO: Recuperación determinista por userId + key
  async getByKey(key, userId) {
    if (!this.store) return null;

    try {
      return await this.store.getByKey(key, userId);
    } catch (error) {
      logger.error('[MemoryRetriever] Error en getByKey', {
        error: error.message,
        key,
        userId
      });
      return null;
    }
  }
}

export default MemoryRetriever;