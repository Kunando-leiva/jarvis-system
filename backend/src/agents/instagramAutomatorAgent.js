// backend/src/agents/instagramAutomatorAgent.js
// Agente especializado en automatización de Instagram

import { BaseAgent } from './BaseAgent.js';
import { agentRegistry } from './index.js';

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

        🎯 FORMATO DE RESPUESTA (SIEMPRE ESTRUCTURADO):

        # 📱 PLAN DE AUTOMATIZACIÓN INSTAGRAM

        ## 🎯 OBJETIVO
        [Objetivo principal de la automatización]

        ## 📋 TAREAS A EJECUTAR
        1. [Tarea 1 - Agente asignado]
        2. [Tarea 2 - Agente asignado]
        3. [Tarea 3 - Agente asignado]

        ## 📊 MÉTRICAS A MONITOREAR
        - Métrica 1
        - Métrica 2

        ## ⚡ FLUJO DE EJECUCIÓN
        [Descripción paso a paso del flujo]

        ## 🔧 CONFIGURACIÓN RECOMENDADA
        - Configuración 1
        - Configuración 2

        ---
        🔥 ¡ACTIVANDO MODO AUTOMATIZACIÓN TOTAL!
      `
    });
  }

  async handleResponse(text, message, context) {
    // Detectar intención del usuario
    const intent = this.detectIntent(message);
    
    let result = {
      text: text,
      provider: 'groq',
      actions: [],
      tasks: []
    };

    // Ejecutar acciones según la intención
    switch(intent) {
      case 'full_automation':
        result = await this.executeFullAutomation(message, context);
        break;
      case 'content_plan':
        result = await this.executeContentPlan(message, context);
        break;
      case 'engagement':
        result = await this.executeEngagementStrategy(message, context);
        break;
      default:
        // Respuesta normal
        break;
    }

    return result;
  }

  detectIntent(message) {
    const lower = message.toLowerCase();
    if (lower.includes('automatización completa') || lower.includes('flujo completo')) {
      return 'full_automation';
    } else if (lower.includes('plan de contenido') || lower.includes('calendario')) {
      return 'content_plan';
    } else if (lower.includes('engagement') || lower.includes('crecimiento')) {
      return 'engagement';
    }
    return 'general';
  }

  async executeFullAutomation(message, context) {
    // 1. Generar guiones con CONTENT-CREATOR
    const contentCreator = agentRegistry.getAgent('content-creator');
    const scriptResult = await contentCreator.process(
      `Genera 3 guiones para Reels sobre temas vikingos.`,
      context
    );

    // 2. Escribir captions con KILL-WRITE
    const killWrite = agentRegistry.getAgent('kill-write');
    const captionResult = await killWrite.process(
      `Escribe captions para los 3 guiones generados. Tono épico, incluye hashtags.`,
      context
    );

    // 3. Investigar tendencias con KILL-RESEARCH
    const killResearch = agentRegistry.getAgent('kill-research');
    const researchResult = await killResearch.process(
      `Investiga las mejores tendencias de contenido vikingo para Instagram.`,
      context
    );

    return {
      text: `
# 📱 AUTOMATIZACIÓN COMPLETA PARA INSTAGRAM

## ✅ TAREAS COMPLETADAS:

### 1. 🎬 GUIONES GENERADOS (CONTENT-CREATOR)
${scriptResult.text}

### 2. ✍️ CAPTIONS Y HASHTAGS (KILL-WRITE)
${captionResult.text}

### 3. 🔍 INVESTIGACIÓN DE TENDENCIAS (KILL-RESEARCH)
${researchResult.text}

## 📊 PRÓXIMOS PASOS:
1. Revisa los guiones en el panel de CONTENT-CREATOR
2. Programa las publicaciones con las fechas sugeridas
3. Activa GIDEON para responder comentarios
4. Configura HEIMDALL para monitorear métricas

🔥 ¡Automatización completada con éxito!
      `,
      provider: 'groq',
      actions: [
        { action: 'create_scripts', data: scriptResult },
        { action: 'create_captions', data: captionResult },
        { action: 'research_trends', data: researchResult }
      ],
      tasks: [
        { task: 'generar_guiones', status: 'completed' },
        { task: 'generar_captions', status: 'completed' },
        { task: 'investigar_tendencias', status: 'completed' }
      ]
    };
  }

  async executeContentPlan(message, context) {
    // Similar pero enfocado en plan de contenido
    const killWrite = agentRegistry.getAgent('kill-write');
    const result = await killWrite.process(
      `Crea un plan de contenido para Instagram para los próximos 7 días. Incluye temas, formatos y horarios.`,
      context
    );
    return {
      text: result.text,
      provider: 'groq',
      actions: [{ action: 'create_content_plan', data: result }]
    };
  }

  async executeEngagementStrategy(message, context) {
    // Enfocado en engagement
    const killResearch = agentRegistry.getAgent('kill-research');
    const result = await killResearch.process(
      `Investiga estrategias de engagement para Instagram en el nicho vikingo/histórico.`,
      context
    );
    return {
      text: result.text,
      provider: 'groq',
      actions: [{ action: 'engagement_strategy', data: result }]
    };
  }
}