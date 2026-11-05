// backend/src/memory/memorySummarizer.js
// 📝 RESUMIDOR DE MEMORIA Y CONTEXTO

import { MEMORY_TYPES } from './memoryTypes.js';

class MemorySummarizer {
  constructor(config = {}) {
    this.maxContextItems = config.maxContextItems || 10;
    this.maxSummaryLength = config.maxSummaryLength || 1000;
  }

  summarizeContext(memories) {
    if (!memories || memories.length === 0) {
      return 'No hay información recordada previamente.';
    }

    const sorted = [...memories].sort((a, b) => 
      new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt)
    );

    const relevant = sorted.slice(0, this.maxContextItems);
    let summary = '';

    // Agrupar por tipo
    const grouped = this.groupByType(relevant);

    // Hechos importantes
    if (grouped.fact && grouped.fact.length > 0) {
      summary += '📌 Hechos importantes:\n';
      for (const mem of grouped.fact.slice(0, 5)) {
        summary += `  • ${mem.content}\n`;
      }
      summary += '\n';
    }

    // Preferencias
    if (grouped.preference && grouped.preference.length > 0) {
      summary += '⭐ Preferencias del usuario:\n';
      for (const mem of grouped.preference.slice(0, 3)) {
        summary += `  • ${mem.content}\n`;
      }
      summary += '\n';
    }

    // Decisiones
    if (grouped.decision && grouped.decision.length > 0) {
      summary += '⚡ Decisiones tomadas:\n';
      for (const mem of grouped.decision.slice(0, 3)) {
        summary += `  • ${mem.content}\n`;
      }
      summary += '\n';
    }

    // Conocimiento del proyecto
    if (grouped.project_knowledge && grouped.project_knowledge.length > 0) {
      summary += '🏗️ Conocimiento del proyecto:\n';
      for (const mem of grouped.project_knowledge.slice(0, 3)) {
        summary += `  • ${mem.content}\n`;
      }
      summary += '\n';
    }

    // Si no hay resumen estructurado, mostrar las más recientes
    if (!summary) {
      summary += '📝 Últimas interacciones:\n';
      for (const mem of relevant.slice(0, 5)) {
        const date = new Date(mem.createdAt).toLocaleDateString();
        const preview = mem.content.length > 80 ? mem.content.substring(0, 80) + '...' : mem.content;
        summary += `  • [${mem.type}] ${preview} (${date})\n`;
      }
    }

    return summary.trim();
  }

  groupByType(memories) {
    const grouped = {};
    for (const mem of memories) {
      const type = mem.type;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(mem);
    }
    return grouped;
  }

  summarizeConversation(memories) {
    if (!memories || memories.length === 0) {
      return 'No hay suficiente información para resumir.';
    }

    const sorted = [...memories].sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    );

    const facts = sorted.filter(m => m.type === 'fact' || m.type === 'project_knowledge');
    const decisions = sorted.filter(m => m.type === 'decision');
    const preferences = sorted.filter(m => m.type === 'preference');
    const context = sorted.filter(m => m.type === 'context');

    let summary = '📋 Resumen de la conversación:\n\n';

    // Información del usuario
    summary += '👤 Sobre el usuario:\n';
    const userFacts = facts.filter(f => f.tags?.includes('user_name') || f.tags?.includes('email'));
    if (userFacts.length > 0) {
      for (const f of userFacts) {
        summary += `  • ${f.content}\n`;
      }
    } else {
      summary += '  • No se ha recopilado información personal aún.\n';
    }
    summary += '\n';

    // Hechos importantes
    if (facts.length > 0) {
      summary += '📌 Hechos importantes:\n';
      for (const f of facts.slice(0, 5)) {
        summary += `  • ${f.content}\n`;
      }
      summary += '\n';
    }

    // Decisiones
    if (decisions.length > 0) {
      summary += '⚡ Decisiones tomadas:\n';
      for (const d of decisions.slice(0, 3)) {
        summary += `  • ${d.content}\n`;
      }
      summary += '\n';
    }

    // Preferencias
    if (preferences.length > 0) {
      summary += '⭐ Preferencias del usuario:\n';
      for (const p of preferences.slice(0, 3)) {
        summary += `  • ${p.content}\n`;
      }
      summary += '\n';
    }

    // Estadísticas
    summary += '📊 Estadísticas:\n';
    summary += `  • Total de interacciones: ${sorted.length}\n`;
    summary += `  • Hechos registrados: ${facts.length}\n`;
    summary += `  • Decisiones: ${decisions.length}\n`;
    summary += `  • Preferencias: ${preferences.length}\n`;

    return summary;
  }

  summarizeByType(memories, type) {
    const filtered = memories.filter(m => m.type === type);
    if (filtered.length === 0) return null;

    const summary = filtered.map(m => `• ${m.content}`).join('\n');
    return `📌 ${type.charAt(0).toUpperCase() + type.slice(1)}s:\n${summary}`;
  }

  getKeyFacts(memories) {
    const facts = memories.filter(m => 
      m.type === 'fact' || 
      m.type === 'project_knowledge' ||
      m.type === 'preference' ||
      m.type === 'decision'
    );

    // Ordenar por importancia y confianza
    return facts.sort((a, b) => {
      const scoreA = (a.importance || 1) * (a.confidence || 0.5);
      const scoreB = (b.importance || 1) * (b.confidence || 0.5);
      return scoreB - scoreA;
    });
  }
}

export default MemorySummarizer;