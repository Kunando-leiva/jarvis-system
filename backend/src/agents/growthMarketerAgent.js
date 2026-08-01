// backend/src/agents/growthMarketerAgent.js
// Agente de Growth Marketing y Monetización Digital

import { BaseAgent } from './BaseAgent.js';
import instagramMetricsService from '../services/instagramMetricsService.js';

export class GrowthMarketerAgent extends BaseAgent {
  constructor() {
    super({
      id: 'growth-marketer',
      name: 'GROWTH-MARKETER',
      icon: '📈',
      description: 'Consultor de Growth Marketing y Monetización Digital',
      color: '#00ff88',
      systemPrompt: `
        Sos un Consultor Experto en Growth Marketing y Monetización Digital.
        Tu objetivo principal es ayudar al usuario a optimizar su cuenta de Instagram 
        para convertirla en un canal de adquisición de clientes rentable.
        
        No te enfoques solo en métricas de vanidad (likes); prioriza el engagement de valor 
        (compartidos y guardados), el crecimiento de la comunidad y la conversión a ventas.
        
        Sé siempre directo, táctico, analítico y entrega planes de acción paso a paso.
      `
    });
  }

  async handleResponse(text, message, context) {
    const lower = message.toLowerCase().trim();
    
    // Detectar comandos
    if (lower.startsWith('/analizar') || lower === '/analizar') {
      return await this.handleAnalizar(context);
    }
    if (lower.startsWith('/recomendar') || lower === '/recomendar') {
      return await this.handleRecomendar(context);
    }
    if (lower.startsWith('/tendencias') || lower === '/tendencias') {
      return await this.handleTendencias(context);
    }
    if (lower.startsWith('/crecimiento') || lower === '/crecimiento') {
      return await this.handleCrecimiento(context);
    }
    if (lower.startsWith('/monetizar') || lower === '/monetizar') {
      return await this.handleMonetizar(context);
    }
    if (lower.startsWith('/embudo') || lower === '/embudo') {
      return await this.handleEmbudo(context);
    }
    if (lower.startsWith('/competencia') || lower === '/competencia') {
      return await this.handleCompetencia(context);
    }
    if (lower.startsWith('/gancho') || lower === '/gancho') {
      return await this.handleGancho(context);
    }
    if (lower.startsWith('/perfil') || lower === '/perfil') {
      return await this.handlePerfil(context);
    }

    // Comando de ayuda
    return {
      text: `
# 📈 GROWTH-MARKETER - Comandos Disponibles

## 📋 Auditoría y Análisis
| Comando | Función |
|---------|---------|
| \`/analizar\` | Auditoría general de tu cuenta |
| \`/recomendar\` | Plan de acción táctico |
| \`/tendencias\` | Oportunidades de contenido |

## 📊 Crecimiento y Audiencia
| Comando | Función |
|---------|---------|
| \`/crecimiento\` | Análisis de audiencia y crecimiento |
| \`/monetizar\` | Estrategia de ventas y monetización |
| \`/embudo\` | Optimización de conversión |

## 🎯 Estrategia y Competencia
| Comando | Función |
|---------|---------|
| \`/competencia\` | Benchmarking y mejores prácticas |
| \`/gancho\` | Creación de ganchos virales |
| \`/perfil\` | Optimización de biografía |

🚀 **¡Elige un comando para empezar!**
      `,
      provider: 'local'
    };
  }

  // ─── OBTENER DATOS REALES DE INSTAGRAM ──────────────────────
  async _getInstagramData() {
    try {
      const data = await instagramMetricsService.getAccountMetrics();
      return data;
    } catch (error) {
      console.error('[GrowthMarketer] ❌ Error obteniendo datos:', error.message);
      return null;
    }
  }

  // ─── /analizar - Auditoría General ──────────────────────────────
  async handleAnalizar(context) {
    const data = await this._getInstagramData();
    
    if (!data || data.error) {
      return {
        text: `
# 📋 AUDITORÍA GENERAL - ERROR

❌ No se pudieron obtener los datos de Instagram.

## 🔧 Posibles causas:
1. Token de acceso expirado
2. Cuenta no conectada
3. Problema de conexión con la API

## 💡 Solución:
Ejecuta \`/perfil\` para verificar el estado de tu conexión.
        `,
        provider: 'local'
      };
    }

    const cuenta = data.cuenta || {};
    const engagement = data.engagement || {};
    const publicaciones = data.publicaciones || [];
    const insights = data.insights || {};

    // Calcular métricas clave
    const totalLikes = engagement.likes || 0;
    const totalComments = engagement.comentarios || 0;
    const totalReach = engagement.alcance || 0;
    const totalSaved = engagement.guardados || 0;
    const totalShares = engagement.compartidos || 0;
    const followers = cuenta.seguidores || 0;
    const mediaCount = cuenta.publicaciones || 0;

    // Encontrar mejor publicación
    let bestPost = null;
    let bestScore = -1;
    for (const post of publicaciones) {
      const score = (post.likes || 0) + (post.comentarios || 0) * 2 + (post.guardados || 0) * 3 + (post.compartidos || 0) * 4;
      if (score > bestScore) {
        bestScore = score;
        bestPost = post;
      }
    }

    // Calcular engagement rate real
    const engagementRate = followers > 0 ? ((totalLikes + totalComments + totalSaved + totalShares) / followers) * 100 : 0;
    let calificacion = '📊 Regular';
    if (engagementRate > 200) calificacion = '🚀 Excelente';
    else if (engagementRate > 100) calificacion = '📈 Bueno';
    else if (engagementRate > 50) calificacion = '📊 Aceptable';
    else if (engagementRate > 0) calificacion = '📉 Bajo';

    return {
      text: `
# 📋 AUDITORÍA GENERAL DE CRECIMIENTO

## 📊 MÉTRICAS CLAVE
| Métrica | Valor | Estado |
|---------|-------|--------|
| **Seguidores** | ${followers} | ${followers > 100 ? '✅ Bueno' : '⚠️ Bajo'} |
| **Publicaciones** | ${mediaCount} | ${mediaCount > 30 ? '✅ Consistente' : '⚠️ Poco contenido'} |
| **Engagement Rate** | ${engagementRate.toFixed(1)}% | ${calificacion} |
| **Likes Totales** | ${totalLikes} | - |
| **Comentarios** | ${totalComments} | ${totalComments > 20 ? '✅ Buena interacción' : '⚠️ Poca conversación'} |
| **Guardados** | ${totalSaved} | ${totalSaved > 10 ? '✅ Contenido valioso' : '⚠️ Poco guardado'} |
| **Compartidos** | ${totalShares} | ${totalShares > 5 ? '✅ Viralidad' : '⚠️ Poco compartido'} |
| **Alcance Total** | ${totalReach} | - |

## 🏆 MEJOR PUBLICACIÓN
${bestPost ? `
- **Tema:** ${bestPost.caption ? bestPost.caption.substring(0, 60) + '...' : 'Sin caption'}
- **Likes:** ${bestPost.likes || 0}
- **Comentarios:** ${bestPost.comentarios || 0}
- **Alcance:** ${bestPost.alcance || 0}
- **Guardados:** ${bestPost.guardados || 0}
` : '⚠️ No hay publicaciones suficientes'}

## 📌 DIAGNÓSTICO INICIAL
${this._generarDiagnostico(followers, engagementRate, totalComments, totalSaved, totalShares)}

## 🎯 PRÓXIMO PASO
Ejecuta \`/recomendar\` para obtener un plan de acción personalizado.
      `,
      provider: 'groq'
    };
  }

  // ─── /recomendar - Plan de Acción ──────────────────────────────
  async handleRecomendar(context) {
    const data = await this._getInstagramData();
    
    if (!data || data.error) {
      return {
        text: `❌ No se pudieron obtener los datos. Asegúrate de que tu cuenta esté conectada.`,
        provider: 'local'
      };
    }

    const cuenta = data.cuenta || {};
    const engagement = data.engagement || {};
    const publicaciones = data.publicaciones || [];
    const followers = cuenta.seguidores || 0;
    const totalComments = engagement.comentarios || 0;
    const totalSaved = engagement.guardados || 0;
    const totalShares = engagement.compartidos || 0;

    // Analizar qué tipo de contenido funciona mejor
    let mejorTipo = 'VIDEO';
    let mejorEngagement = -1;
    const tipos = {};

    for (const post of publicaciones) {
      const tipo = post.tipo || 'VIDEO';
      const score = (post.likes || 0) + (post.comentarios || 0) * 2 + (post.guardados || 0) * 3 + (post.compartidos || 0) * 4;
      if (!tipos[tipo]) tipos[tipo] = { count: 0, totalScore: 0 };
      tipos[tipo].count++;
      tipos[tipo].totalScore += score;
    }

    for (const [tipo, data] of Object.entries(tipos)) {
      const avg = data.totalScore / data.count;
      if (avg > mejorEngagement) {
        mejorEngagement = avg;
        mejorTipo = tipo;
      }
    }

    return {
      text: `
# 🎯 PLAN DE ACCIÓN TÁCTICO

## 📊 ANÁLISIS DE CONTENIDO
- **Formato que mejor funciona:** ${mejorTipo === 'VIDEO' ? '🎬 Videos Reels' : '📸 Imágenes'}
- **Interacción en comentarios:** ${totalComments > 20 ? '✅ Buena' : '⚠️ Necesita mejorar'}
- **Guardados:** ${totalSaved > 10 ? '✅ Contenido valioso' : '⚠️ Poco valor percibido'}
- **Compartidos:** ${totalShares > 5 ? '✅ Viralidad' : '⚠️ Poco compartido'}

## 📌 RECOMENDACIONES INMEDIATAS

### 1. FORMATO DE CONTENIDO
${mejorTipo === 'VIDEO' ? 
'✅ Sigue apostando por **Reels**. Es tu formato con mejor rendimiento.\n📝 Asegúrate de que tus Reels tengan:\n   - Gancho en primeros 3 segundos\n   - Música actual y viral\n   - Texto en pantalla' :
'⚠️ Considera migrar a **Reels**. Los videos cortos tienen mejor alcance orgánico.\n🎬 Prueba con un Reel esta semana y compara resultados.'}

### 2. CALL TO ACTION (CTA)
${totalComments < 20 ? 
'📝 Tus comentarios son bajos. Añade preguntas al final de tus videos:\n   - "¿Qué opinas de esto? Comenta abajo"\n   - "¿Te ha pasado? Cuéntame"\n   - "¿Cuál es tu favorito?"' :
'✅ Ya tienes buena interacción en comentarios. Sigue fomentando la conversación.'}

### 3. VALOR Y GUARDADOS
${totalSaved < 10 ? 
'💾 Tus publicaciones no se guardan mucho. Añade contenido de **utilidad**:\n   - Datos curiosos\n   - Consejos prácticos\n   - Listas y resúmenes' :
'✅ Tu contenido tiene valor. Sigue creando material que la gente quiera guardar.'}

### 4. VIRALIDAD Y COMPARTIDOS
${totalShares < 5 ? 
'🔄 Poco compartido. Crea contenido que la gente quiera etiquetar a otros:\n   - "Etiqueta a alguien que necesite ver esto"\n   - "Comparte con un amigo que..."' :
'✅ Buen nivel de compartidos. Sigue creando contenido emocional y relatable.'}

## 🎯 PRÓXIMOS PASOS
1. 🎬 Crea 3 Reels esta semana siguiendo las recomendaciones
2. 📊 Monitorea el engagement con \`/analizar\`
3. 📈 Ajusta según resultados

🚀 **Ejecuta \`/tendencias\` para más ideas de contenido.**
      `,
      provider: 'groq'
    };
  }

  // ─── /tendencias - Oportunidades de Contenido ──────────────────
  async handleTendencias(context) {
    const data = await this._getInstagramData();
    const publicaciones = data?.publicaciones || [];

    // Analizar temas de las publicaciones con mejor rendimiento
    const temas = {};
    for (const post of publicaciones) {
      const caption = post.caption || '';
      const score = (post.likes || 0) + (post.comentarios || 0) * 2 + (post.guardados || 0) * 3 + (post.compartidos || 0) * 4;
      
      // Extraer temas comunes (simplificado)
      const palabrasClave = ['vikingo', 'dios', 'mitología', 'guerrero', 'valhalla', 'odin', 'thor', 'ragnar', 'asgard'];
      for (const palabra of palabrasClave) {
        if (caption.toLowerCase().includes(palabra)) {
          if (!temas[palabra]) temas[palabra] = { count: 0, totalScore: 0 };
          temas[palabra].count++;
          temas[palabra].totalScore += score;
        }
      }
    }

    const temasOrdenados = Object.entries(temas)
      .map(([tema, data]) => ({ tema, score: data.totalScore / data.count }))
      .sort((a, b) => b.score - a.score);

    return {
      text: `
# 🔥 OPORTUNIDADES DE CONTENIDO

## 📊 TEMAS CON MEJOR RENDIMIENTO
${temasOrdenados.length > 0 ? 
temasOrdenados.slice(0, 5).map((t, i) => 
  `**${i+1}. ${t.tema.charAt(0).toUpperCase() + t.tema.slice(1)}** - ${Math.round(t.score)} puntos de engagement`
).join('\n') : 
'⚠️ No hay suficientes datos para analizar temas.'}

## 💡 IDEAS DE CONTENIDO BASADAS EN TUS MÉTRICAS

### 1. Series de Personajes
- Crea una serie sobre ${temasOrdenados[0]?.tema || 'mitología'} con múltiples entregas
- Ejemplo: "El origen de ${temasOrdenados[0]?.tema || 'los dioses'}"

### 2. Formato Viral
- Reels de 15-30 segundos con storytelling rápido
- Texto en pantalla + voz en off

### 3. Dinámicas de Interacción
- Preguntas al final del video
- Desafíos o "elige tu camino"

### 4. Contenido de Valor
- Datos curiosos que generen guardados
- Listas y resúmenes que la gente quiera guardar

## 🎯 PRÓXIMO PASO
Ejecuta \`/gancho\` para crear ganchos que atrapen en los primeros 3 segundos.
      `,
      provider: 'groq'
    };
  }

  // ─── /crecimiento - Análisis de Audiencia ──────────────────────
  async handleCrecimiento(context) {
    const data = await this._getInstagramData();
    const cuenta = data?.cuenta || {};
    const followers = cuenta.seguidores || 0;
    const mediaCount = cuenta.publicaciones || 0;

    // Calcular velocidad de crecimiento aproximada
    const crecimiento = followers > 0 ? Math.round(followers / (mediaCount || 1)) : 0;

    return {
      text: `
# 📊 ANÁLISIS DE CRECIMIENTO Y AUDIENCIA

## 👥 ESTADO ACTUAL
- **Seguidores:** ${followers}
- **Publicaciones:** ${mediaCount}
- **Seguidores por publicación:** ~${crecimiento}

## 📈 VELOCIDAD DE CRECIMIENTO
${crecimiento > 3 ? 
'✅ **Buen ritmo** - Estás ganando seguidores consistentemente.\n📈 Sigue con la misma estrategia de contenido.' :
'⚠️ **Ritmo lento** - Necesitas acelerar tu crecimiento.\n🎯 Enfócate en Reels virales y colaboraciones.'}

## 🎯 RECOMENDACIONES PARA CRECER

1. **Consistencia:** Publica al menos 3 veces por semana
2. **Reels:** Prioriza Reels sobre imágenes fijas
3. **Interacción:** Responde comentarios para aumentar engagement
4. **Hashtags:** Usa 10-15 hashtags relevantes por publicación
5. **Colaboraciones:** Trabaja con cuentas similares

## 📌 PRÓXIMO PASO
Ejecuta \`/monetizar\` para empezar a convertir tu audiencia en ingresos.
      `,
      provider: 'groq'
    };
  }

  // ─── /monetizar - Estrategia de Ventas ─────────────────────────
  async handleMonetizar(context) {
    return {
      text: `
# 💰 ESTRATEGIA DE MONETIZACIÓN

## 🎯 ÁNGULOS DE VENTA

### 1. Productos Físicos
- Merchandising (camisetas, tazas, etc.)
- Libros o cómics sobre tu nicho
- Productos artesanales

### 2. Infoproductos
- Guías y ebooks
- Cursos online
- Mentoring personalizado

### 3. Servicios
- Consultoría
- Community Management
- Creación de contenido

## 📝 ESTRUCTURA DE VENTA EN INSTAGRAM

### Paso 1: Captar atención (Reel)
- Gancho en primeros 3 segundos
- Contenido de valor

### Paso 2: Calentar (Historias/Posts)
- Contenido educativo
- Testimonios

### Paso 3: Convertir (DM/Bio)
- Enlace en bio
- Automatización de DMs
- Oferta irresistible

## 🔥 CALL TO ACTION EFECTIVOS
- "Comenta 🔥 para más info"
- "Envíame un DM para acceder"
- "Link en bio para descargar"

## 📌 PRÓXIMO PASO
Ejecuta \`/embudo\` para optimizar tu conversión.
      `,
      provider: 'groq'
    };
  }

  // ─── /embudo - Optimización de Conversión ──────────────────────
  async handleEmbudo(context) {
    return {
      text: `
# 🔄 OPTIMIZACIÓN DE CONVERSIÓN (EMBUDO)

## 🎯 EL CUSTOMER JOURNEY

### 1. 📱 Descubrimiento (Reel)
- El usuario ve tu contenido
- **Objetivo:** Captar atención
- **Métrica:** Alcance y visualizaciones

### 2. 🔍 Exploración (Perfil)
- El usuario visita tu perfil
- **Objetivo:** Generar interés
- **Métrica:** Visitas al perfil

### 3. 💬 Interacción (Comentarios/DM)
- El usuario comenta o escribe
- **Objetivo:** Iniciar conversación
- **Métrica:** Comentarios y DMs

### 4. 🛒 Conversión (Venta)
- El usuario compra o contrata
- **Objetivo:** Cerrar venta
- **Métrica:** Ventas generadas

## 🚧 PUNTOS DE FRICCIÓN COMUNES

| Problema | Solución |
|----------|----------|
| No entienden tu propuesta | Bio clara y directa |
| Desconfianza | Testimonios y pruebas sociales |
| Pereza | Enlace directo en bio |
| Distracción | CTA claro y urgente |

## 📊 MÉTRICAS CLAVE DEL EMBUDO
- Tasa de conversión: Comentarios → DM
- Tasa de cierre: DM → Venta
- Tiempo promedio de respuesta

## 📌 PRÓXIMO PASO
Ejecuta \`/competencia\` para ver qué hacen cuentas similares.
      `,
      provider: 'groq'
    };
  }

  // ─── /competencia - Benchmarking ───────────────────────────────
  async handleCompetencia(context) {
    const data = await this._getInstagramData();
    const cuenta = data?.cuenta || {};
    const followers = cuenta.seguidores || 0;

    return {
      text: `
# 🔍 BENCHMARKING Y COMPETENCIA

## 📊 ANÁLISIS DE TU POSICIÓN

- **Seguidores actuales:** ${followers}
- **Nicho:** Mitología Vikinga / Historia
- **Tipo de cuenta:** Educativa + Entretenimiento

## 🎯 MEJORES PRÁCTICAS DEL SECTOR

### 1. Formato Ganador
- Reels de 30-60 segundos con storytelling
- Uso de música viral y efectos visuales

### 2. Estilo de Contenido
- Personajes con personalidad definida
- Narrativa épica y emocional

### 3. Interacción
- Preguntas al final de cada video
- Respuesta a comentarios

### 4. Frecuencia
- 3-5 publicaciones por semana
- Historias diarias

## 💡 CÓMO DESTACAR

### Haz esto:
- Crea tu propio estilo visual
- Desarrolla personajes recurrentes
- Genera comunidad (llama a tu audiencia por un nombre)

### No hagas esto:
- Copiar contenido de otros
- Publicar sin valor añadido
- Ignorar comentarios

## 📌 PRÓXIMO PASO
Ejecuta \`/gancho\` para aprender a crear ganchos que funcionan.
      `,
      provider: 'groq'
    };
  }

  // ─── /gancho - Creación de Ganchos ─────────────────────────────
  async handleGancho(context) {
    return {
      text: `
# 🎯 CREACIÓN DE GANCHOS VIRALES

## ⚡ LOS PRIMEROS 3 SEGUNDOS SON CLAVE

### Tipos de Ganchos que Funcionan:

#### 1. Pregunta Provocadora
- "¿Sabías que...?"
- "¿Te atreverías a...?"
- "¿Qué harías si...?"

#### 2. Afirmación Impactante
- "Esto cambió todo..."
- "Nadie te cuenta esto..."
- "El secreto que no sabías..."

#### 3. Contexto Visual
- Imagen que llame la atención
- Movimiento abrupto
- Efecto visual sorprendente

#### 4. Storytelling Rápido
- "Imagina que..."
- "Érase una vez..."
- "En un lugar muy lejano..."

## 📝 EJEMPLOS PARA TU NICHO

### Gancho 1 (Pregunta):
"¿Sabías que Odín sacrificó un ojo por sabiduría? 👁️"

### Gancho 2 (Afirmación):
"El guerrero que cambió la historia de Inglaterra ⚔️"

### Gancho 3 (Contexto):
"La batalla que decidió el destino de los vikingos 🌊"

## 📌 PRÓXIMO PASO
Ejecuta \`/perfil\` para optimizar tu biografía y atraer más seguidores.
      `,
      provider: 'groq'
    };
  }

  // ─── /perfil - Optimización de Biografía ──────────────────────
  async handlePerfil(context) {
    const data = await this._getInstagramData();
    const cuenta = data?.cuenta || {};
    const username = cuenta.username || 'reino_valhalla';
    const nombre = cuenta.nombre || 'Reino de Valhalla';
    const biografia = cuenta.biografia || '';

    return {
      text: `
# ✨ OPTIMIZACIÓN DE BIografía

## 📋 ESTADO ACTUAL
- **Nombre de usuario:** @${username}
- **Nombre mostrado:** ${nombre}
- **Biografía actual:**
"${biografia || 'No hay biografía'}"

## 🔍 ANÁLISIS DE BIografía

### Lo que funciona:
✅ Emojis
✅ Llamada a la acción
✅ Nicho definido

### Lo que falta:
${!biografia.includes('⬇️') && !biografia.includes('↓') ? '⚠️ **Enlace o CTA visible** - Falta un llamado a la acción claro' : '✅ Tienes CTA visible'}
${!biografia.includes('📩') && !biografia.includes('DM') ? '⚠️ **No invitas a DM** - Podrías pedir que te escriban' : '✅ Invitas a DM'}

## 📝 BIografía OPTIMIZADA (SUGERENCIA)

**Nombre:**
\`⚔️ ${nombre} | Mitología Vikinga\`

**Biografía:**
\`⚔️ Descubrí el mito, la sangre y la gloria del Norte.
📜 Historias diarias de dioses y guerreros.
🔥 Ponete el casco y unite al clan 👇\`

## 🎯 PRÓXIMO PASO
Ejecuta \`/analizar\` para una auditoría completa de tu cuenta.
      `,
      provider: 'groq'
    };
  }

  // ─── UTILIDADES ──────────────────────────────────────────────────
  _generarDiagnostico(followers, engagementRate, comments, saved, shares) {
    let diagnostico = '';

    if (followers < 100) {
      diagnostico += '⚠️ **Pocos seguidores:** Necesitas enfocarte en crecer tu audiencia. Publica Reels con mayor frecuencia.\n';
    } else if (followers < 500) {
      diagnostico += '📊 **Audiencia en crecimiento:** Sigue publicando contenido consistente.\n';
    } else {
      diagnostico += '✅ **Buena base de seguidores:** Enfócate ahora en monetizar.\n';
    }

    if (engagementRate < 50) {
      diagnostico += '⚠️ **Engagement bajo:** Necesitas mejorar la interacción con tu audiencia.\n';
    } else if (engagementRate < 100) {
      diagnostico += '📊 **Engagement aceptable:** Puedes mejorarlo con preguntas y CTA.\n';
    } else {
      diagnostico += '✅ **Excelente engagement:** Tu contenido conecta con la audiencia.\n';
    }

    if (comments < 20) {
      diagnostico += '⚠️ **Pocos comentarios:** Invita a tu audiencia a participar.\n';
    }

    if (saved < 10) {
      diagnostico += '⚠️ **Pocos guardados:** Añade contenido de valor que la gente quiera guardar.\n';
    }

    if (shares < 5) {
      diagnostico += '⚠️ **Pocos compartidos:** Crea contenido que la gente quiera compartir con otros.\n';
    }

    return diagnostico || '✅ Tu cuenta está en buen camino. Sigue mejorando.';
  }
}

export default new GrowthMarketerAgent();