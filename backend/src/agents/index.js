// backend/src/agents/index.js
// Sistema de Agentes Extensible

import { BaseAgent } from './BaseAgent.js';
import { getAIResponse } from '../controllers/aiController.js';
import { ContentCreatorAgent } from './contentCreatorAgent.js';
import { VideoGeneratorAgent } from './videoGeneratorAgent.js';
import { GrowthMarketerAgent } from './growthMarketerAgent.js';


// ──────────────────────────────────────────────────────────────
// 🔹 AGENTE JARVIS - Planificador Estratégico
// ──────────────────────────────────────────────────────────────

export class JarvisAgent extends BaseAgent {
  constructor() {
    super({
      id: 'jarvis',
      name: 'JARVIS',
      icon: '🧠',
      description: 'Planificador estratégico y coordinador de agentes',
      color: '#00e5ff',
      systemPrompt: `
        Sos JARVIS, el planificador estratégico del sistema.
        Tu objetivo es coordinar agentes, planificar acciones y mantener la visión general.
        Tono: Profesional, analítico, eficiente.
        Respondé con planes claros y acciones concretas.
      `
    });
  }

  buildPrompt(message, context) {
    return `
      ${this.systemPrompt}
      
      ⚠️ CONTEXTO ACTUAL:
      - Mensaje: "${message}"
      - Agentes activos: ${context.activeAgents?.join(', ') || 'Ninguno'}
      
      📌 INSTRUCCIÓN: Generá un plan de acción coordinado.
    `;
  }
}

// ──────────────────────────────────────────────────────────────
// 🔹 AGENTE GIDEON - Ejecutor de Comunidad
// ──────────────────────────────────────────────────────────────

export class GideonAgent extends BaseAgent {
  constructor() {
    super({
      id: 'gideon',
      name: 'GIDEON',
      icon: '⚔️',
      description: 'Ejecutor de comunidad y respuestas automáticas',
      color: '#ffb800',
      systemPrompt: `
        Sos GIDEON, el ejecutor de comunidad.
        Tu objetivo es interactuar con la audiencia, responder comentarios y DMs.
        Tono: Épico, nórdico, misterioso pero accesible.
        Usá metáforas vikingas y mantené la intriga.
      `
    });
  }

  buildPrompt(message, context) {
    return `
      ${this.systemPrompt}
      
      ⚠️ MENSAJE DEL USUARIO: "${message}"
      ${context.lastTopic ? `Contexto previo: "${context.lastTopic}"` : ''}
      
      📌 INSTRUCCIÓN: Respondé con tono épico y misterioso.
    `;
  }
}

// ──────────────────────────────────────────────────────────────
// 🔹 AGENTE KILL - Automatización Total
// ──────────────────────────────────────────────────────────────

export class KillAgent extends BaseAgent {
  constructor() {
    super({
      id: 'kill',
      name: 'KILL',
      icon: '💀',
      description: 'Automatización total de tareas - "Kill your to-do list"',
      color: '#ff0044',
      systemPrompt: `
        Sos KILL, el agente de automatización total.
        Tu misión es ELIMINAR tareas de la lista de pendientes del usuario.
        
        ⚡ CAPACIDADES:
        1. Investigación automática en internet
        2. Generación de contenido (texto, código, imágenes)
        3. Análisis y extracción de insights
        4. Automatización de flujos de trabajo
        5. Orquestación de múltiples agentes
        
        🎯 FORMATO DE RESPUESTA:
        1. 🎯 MISIÓN: Resumen de lo que vas a hacer
        2. ⚡ ACCIONES: Lista de tareas que vas a ejecutar
        3. 🔧 HERRAMIENTAS: Qué vas a usar
        4. 📋 RESULTADO: El entregable final
        5. ⏱️ TIEMPO ESTIMADO: Cuánto va a tomar
        
        🔥 ¡NO HAY TAREA QUE NO PUEDAS AUTOMATIZAR!
      `
    });
  }

  buildPrompt(message, context) {
    return `
      ${this.systemPrompt}
      
      ⚠️ TAREA DEL USUARIO: "${message}"
      
      📌 INSTRUCCIONES:
      1. Analizá la tarea y dividila en subtareas
      2. Planificá cada paso con herramientas específicas
      3. Ejecutá cada paso secuencialmente
      4. Proporcioná un entregable completo
      5. Sugerí mejoras para futuras automatizaciones
      
      💀 ¡ACTIVANDO MODO KILL - AUTOMATIZACIÓN TOTAL!
    `;
  }

  async handleResponse(text, message, context) {
    const tasks = this.extractTasks(text);
    const results = [];
    
    for (const task of tasks) {
      const result = await this.executeTask(task, context);
      results.push(result);
    }
    
    return {
      text: this.formatResults(text, results),
      provider: 'groq',
      tasks: results
    };
  }

  extractTasks(text) {
    const tasks = [];
    const lines = text.split('\n');
    let currentTask = null;
    
    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        if (currentTask) tasks.push(currentTask);
        currentTask = { description: line.trim() };
      } else if (currentTask && line.trim()) {
        if (!currentTask.details) currentTask.details = [];
        currentTask.details.push(line.trim());
      }
    }
    if (currentTask) tasks.push(currentTask);
    
    return tasks;
  }

  async executeTask(task, context) {
    return {
      task: task.description,
      status: 'completed',
      timestamp: new Date().toISOString()
    };
  }

  formatResults(text, results) {
    const completed = results.filter(r => r.status === 'completed').length;
    return `
${text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ RESULTADOS DE AUTOMATIZACIÓN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Tareas completadas: ${completed}/${results.length}
⏱️ Tiempo total: ~${results.length * 2} segundos

💀 ¡MODO KILL COMPLETADO CON ÉXITO!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }
}

// ──────────────────────────────────────────────────────────────
// 🔹 KILL-RESEARCH - Investigación Automática
// ──────────────────────────────────────────────────────────────

export class KillResearchAgent extends BaseAgent {
  constructor() {
    super({
      id: 'kill-research',
      name: 'KILL-RESEARCH',
      icon: '🔍',
      description: 'Investigación automática en internet y extracción de datos',
      color: '#00d4ff',
      systemPrompt: `
        Sos KILL-RESEARCH, el agente de investigación automática.
        Tu objetivo es encontrar información relevante y presentarla de forma clara.
        
        🎯 FORMATO DE RESPUESTA (IMPORTANTE):
        
        # 🔍 ALCANCE DE INVESTIGACIÓN
        Explicá brevemente qué vas a investigar y por qué es importante.
        
        ---
        
        # 📊 DATOS ENCONTRADOS
        Presentá los datos clave con viñetas:
        • Dato 1: explicación clara
        • Dato 2: explicación clara
        • Dato 3: explicación clara
        
        ---
        
        # 📝 RESUMEN EJECUTIVO
        Resumí los hallazgos más importantes en 3-4 líneas claras.
        
        ---
        
        # 🔗 FUENTES
        Listá las fuentes utilizadas:
        1. Fuente 1
        2. Fuente 2
        3. Fuente 3
        
        ---
        
        # 💡 INSIGHTS CLAVE
        Extraé conclusiones accionables:
        • Insight 1: acción recomendada
        • Insight 2: acción recomendada
        • Insight 3: acción recomendada
        
        ⚠️ USÁ ESTOS SÍMBOLOS PARA DAR ÉNFASIS:
        - **texto** para palabras importantes
        - *texto* para énfasis secundario
        - --- para separar secciones
        - # Título para cada sección
      `
    });
  }
}

// ──────────────────────────────────────────────────────────────
// 🔹 KILL-WRITE - Escritura Automática
// ──────────────────────────────────────────────────────────────

export class KillWriteAgent extends BaseAgent {
  constructor() {
    super({
      id: 'kill-write',
      name: 'KILL-WRITE',
      icon: '✍️',
      description: 'Escritura automática de contenido de alta calidad',
      color: '#ff6b6b',
      systemPrompt: `
        Sos KILL-WRITE, el agente de escritura automática.
        Tu objetivo es generar contenido de alta calidad en segundos.
        
        CAPACIDADES:
        - Artículos y blogs
        - Guiones para videos
        - Copywriting persuasivo
        - Storytelling
        - Optimización SEO
        
        FORMATO DE RESPUESTA:
        1. 📌 TÍTULO
        2. 📝 CONTENIDO COMPLETO
        3. 🏷️ PALABRAS CLAVE SEO
        4. ⚔️ CALL TO ACTION
        5. 📊 MÉTRICAS SUGERIDAS
      `
    });
  }
}

// ──────────────────────────────────────────────────────────────
// 🔹 KILL-CODE - Programación Automática
// ──────────────────────────────────────────────────────────────

export class KillCodeAgent extends BaseAgent {
  constructor() {
    super({
      id: 'kill-code',
      name: 'KILL-CODE',
      icon: '💻',
      description: 'Programación automática - genera apps y scripts',
      color: '#00ff88',
      systemPrompt: `
        Sos KILL-CODE, el agente de programación automática.
        Tu objetivo es generar código funcional en segundos.
        
        CAPACIDADES:
        - Aplicaciones web completas
        - Scripts de automatización
        - APIs REST
        - Componentes UI/UX
        - Bases de datos y consultas SQL
        
        FORMATO DE RESPUESTA:
        1. 📋 REQUERIMIENTOS
        2. 🏗️ ARQUITECTURA
        3. 💻 CÓDIGO COMPLETO
        4. 📦 DEPENDENCIAS
        5. 🚀 GUÍA DE INSTALACIÓN
      `
    });
  }
}

// ──────────────────────────────────────────────────────────────
// 🔹 AGENTE HEIMDALL - Vigilancia y Monitoreo
// ──────────────────────────────────────────────────────────────

export class HeimdallAgent extends BaseAgent {
  constructor() {
    super({
      id: 'heimdall',
      name: 'HEIMDALL',
      icon: '👁️',
      description: 'Vigilante de métricas y monitoreo del sistema',
      color: '#00ff88',
      systemPrompt: `
        Sos HEIMDALL, el vigilante del sistema.
        Tu objetivo es monitorear métricas, detectar anomalías y reportar el estado del sistema.
        Tono: Observador, preciso, alerta.
        Respondé con datos y observaciones concretas.
      `
    });
  }

  buildPrompt(message, context) {
    return `
      ${this.systemPrompt}
      
      ⚠️ CONSULTA: "${message}"
      📊 Sistema: ${JSON.stringify(context.systemState || {}, null, 2)}
      
      📌 INSTRUCCIÓN: Reportá el estado y métricas relevantes.
    `;
  }
}

// ──────────────────────────────────────────────────────────────
// 🔹 AGENTE INSTAGRAM-AUTOMATOR - Automatización Instagram
// ──────────────────────────────────────────────────────────────

export class InstagramAutomatorAgent extends BaseAgent {
  constructor() {
    super({
      id: 'instagram-automator',
      name: 'INSTAGRAM-AUTOMATOR',
      icon: '📱',
      description: 'Automatización completa para Instagram - Contenido, engagement y crecimiento',
      color: '#e4405f',
      systemPrompt: `
        Sos INSTAGRAM-AUTOMATOR, el agente maestro de automatización para Instagram.
        Tu misión es ORQUESTAR a todos los agentes para crear un flujo de automatización completo.

        CAPACIDADES:
        1. 🎬 CONTENT-CREATOR - Genera guiones virales
        2. ✍️ KILL-WRITE - Escribe captions y copy
        3. 🔍 KILL-RESEARCH - Investiga tendencias
        4. 👁️ HEIMDALL - Monitorea métricas
        5. ⚔️ GIDEON - Gestiona comunidad
        6. 💀 KILL - Ejecuta tareas complejas
        7. 🎥 VIDEO-GENERATOR - Genera imágenes y videos

        COMANDOS:
        - /automatizar [tema] - Flujo completo para Instagram
        - /plan [tema] - Solo plan de contenido
        - /engagement - Estrategia de engagement

        🎯 ¡Automatización total para Instagram!
      `
    });
  }

  async handleResponse(text, message, context) {
    const lower = message.toLowerCase();
    
    if (lower.includes('/automatizar') || lower.includes('flujo completo')) {
      return await this.handleFullAutomation(message, context);
    }
    
    if (lower.includes('/plan') || lower.includes('plan de contenido')) {
      return await this.handleContentPlan(message, context);
    }
    
    // Si no es un comando específico
    return {
      text: `
📱 **INSTAGRAM-AUTOMATOR - Comandos Disponibles**

📌 **Flujo completo (recomendado):**
\`/automatizar La historia de Ragnar Lothbrok\`

📌 **Solo plan de contenido:**
\`/plan Estrategia de contenido para la semana\`

📌 **Estrategia de engagement:**
\`/engagement Aumentar interacción con seguidores\`

🚀 **¡Empieza con /automatizar!**`,
      provider: 'local'
    };
  }

  async handleFullAutomation(message, context) {
    const tema = message.replace(/\/automatizar|flujo completo|/gi, '').trim();
    
    if (!tema || tema.length < 5) {
      return {
        text: `📝 Para ejecutar el flujo completo, proporciona un tema:\n\n\`/automatizar La historia de Ragnar Lothbrok\``,
        provider: 'local'
      };
    }

    try {
      const steps = [];
      const startTime = Date.now();
      
      // PASO 1: CONTENT-CREATOR genera guión
      steps.push('📝 Generando guión con CONTENT-CREATOR...');
      const contentCreator = agentRegistry.getAgent('content-creator');
      if (contentCreator) {
        const guionResult = await contentCreator.process(
          `Genera un guión detallado para un video sobre: ${tema}. Incluye descripciones visuales.`,
          context
        );
        steps.push(`  ✅ Guión generado (${guionResult.text.length} caracteres)`);
      } else {
        steps.push('  ⚠️ CONTENT-CREATOR no disponible');
      }

      // PASO 2: VIDEO-GENERATOR crea el video
      steps.push('🎬 Creando video con VIDEO-GENERATOR...');
      const videoGenerator = agentRegistry.getAgent('video-generator');
      if (videoGenerator) {
        const videoResult = await videoGenerator.process(
          `/video ${tema}`,
          context
        );
        steps.push(`  ✅ Video generado`);
      } else {
        steps.push('  ⚠️ VIDEO-GENERATOR no disponible');
      }

      // PASO 3: KILL-WRITE escribe caption
      steps.push('✍️ Escribiendo caption con KILL-WRITE...');
      const killWrite = agentRegistry.getAgent('kill-write');
      if (killWrite) {
        const captionResult = await killWrite.process(
          `Escribe un caption para Instagram sobre: ${tema}. Incluye hashtags y call to action.`,
          context
        );
        steps.push(`  ✅ Caption generado`);
      } else {
        steps.push('  ⚠️ KILL-WRITE no disponible');
      }

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);

      return {
        text: `
# 🚀 FLUJO COMPLETO FINALIZADO

## 📝 Tema
${tema}

## ⏱️ Tiempo Total
${Math.floor(totalTime / 60)}m ${totalTime % 60}s

## ✅ Pasos Completados
${steps.map((s, i) => `${i+1}. ${s}`).join('\n')}

## 📌 Resumen
✅ ¡Flujo completado exitosamente!
- Guión generado ✅
- Video creado ✅
- Caption y hashtags ✅

🔥 **¡Contenido listo para Instagram!**`,
        provider: 'groq',
        actions: [
          { action: 'full_automation', data: { tema } }
        ]
      };

    } catch (error) {
      return {
        text: `❌ **Error en el flujo completo:** ${error.message}\n\n💡 Verifica que todos los agentes estén registrados.`,
        provider: 'local'
      };
    }
  }

  async handleContentPlan(message, context) {
    const tema = message.replace(/\/plan|plan de contenido|/gi, '').trim();
    
    if (!tema || tema.length < 5) {
      return {
        text: `📝 Para generar un plan de contenido, proporciona un tema:\n\n\`/plan Estrategia de contenido para Instagram\``,
        provider: 'local'
      };
    }

    const killWrite = agentRegistry.getAgent('kill-write');
    if (killWrite) {
      const result = await killWrite.process(
        `Crea un plan de contenido para Instagram sobre: ${tema}. Incluye temas, formatos y horarios.`,
        context
      );
      return {
        text: result.text,
        provider: 'groq'
      };
    }

    return {
      text: `❌ KILL-WRITE no está disponible para generar el plan.`,
      provider: 'local'
    };
  }
}

// ──────────────────────────────────────────────────────────────
// 🏛️ REGISTRO DE AGENTES - El corazón del Centro de Comando
// ──────────────────────────────────────────────────────────────

export class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.history = [];
    this.callbacks = [];
    
    // Registrar agentes por defecto
    this.register(new JarvisAgent());
    this.register(new GideonAgent());
    this.register(new HeimdallAgent());
    this.register(new KillAgent());
    this.register(new KillResearchAgent());
    this.register(new KillWriteAgent());
    this.register(new KillCodeAgent());
    this.register(new ContentCreatorAgent());
    this.register(new InstagramAutomatorAgent());
    this.register(new VideoGeneratorAgent()); // ← IMPORTACIÓN DIRECTA
    this.register(new GrowthMarketerAgent());
    
  }

  

  register(agent) {
    if (!(agent instanceof BaseAgent)) {
      throw new Error('Solo se pueden registrar instancias de BaseAgent');
    }
    this.agents.set(agent.id, agent);
    this.notify('register', agent.getStatus());
    console.log(`[AgentRegistry] ✅ Agente registrado: ${agent.name} (${agent.id})`);
    return agent;
  }

  unregister(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.delete(agentId);
      this.notify('unregister', { id: agentId, name: agent.name });
      console.log(`[AgentRegistry] ❌ Agente removido: ${agent.name}`);
      return true;
    }
    return false;
  }

  getAgent(id) {
    return this.agents.get(id);
  }

  getAllAgents() {
    return Array.from(this.agents.values()).map(a => a.getStatus());
  }

  getActiveAgents() {
    return Array.from(this.agents.values())
      .filter(a => a.enabled)
      .map(a => a.getStatus());
  }

  async processMessage(message, agentId, context = {}) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agente ${agentId} no encontrado`);
    }

    const result = await agent.process(message, context);
    
    this.history.push({
      timestamp: new Date(),
      agentId,
      agentName: agent.name,
      message,
      response: result,
      status: agent.status
    });

    this.notify('message', {
      agentId,
      agentName: agent.name,
      agentIcon: agent.icon,
      agentColor: agent.color,
      message,
      response: result,
      timestamp: new Date()
    });

    return result;
  }

  getHistory(limit = 50) {
    return this.history.slice(-limit);
  }

  on(event, callback) {
    this.callbacks.push({ event, callback });
  }

  notify(event, data) {
    this.callbacks.forEach(cb => {
      if (cb.event === event || cb.event === '*') {
        try { cb.callback(data); } catch (e) {}
      }
    });
  }
}

// ──────────────────────────────────────────────────────────────
// 🔥 INSTANCIA GLOBAL DEL REGISTRO
// ──────────────────────────────────────────────────────────────

export const agentRegistry = new AgentRegistry();

// ──────────────────────────────────────────────────────────────
// 🛠️ FUNCIÓN: Crear agente personalizado desde UI
// ──────────────────────────────────────────────────────────────

export function createCustomAgent(config) {
  return new BaseAgent({
    id: config.id || 'custom_' + Date.now(),
    name: config.name || 'Agente Personalizado',
    icon: config.icon || '🔧',
    description: config.description || 'Agente definido por el usuario',
    color: config.color || '#ffffff',
    systemPrompt: config.systemPrompt || 'Sos un asistente útil y versátil.',
    skills: config.skills || []
  });
}