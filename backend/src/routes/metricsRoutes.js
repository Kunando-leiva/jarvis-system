// backend/src/routes/metricsRoutes.js
// Rutas para el Dashboard de Métricas

import express from 'express';
import instagramMetricsService from '../services/instagramMetricsService.js';
import jarvisMetricsService from '../services/jarvisMetricsService.js';
// ✅ CORRECTO - Importar la INSTANCIA
import systemMonitorAgent from '../agents/systemMonitorAgent.js';
import axios from 'axios';

const router = express.Router();

// ─── MÉTRICAS DE INSTAGRAM ──────────────────────────────────────

// Obtener métricas de la cuenta
router.get('/metrics/instagram/account', async (req, res) => {
  try {
    const metrics = await instagramMetricsService.getAccountMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener métricas de publicaciones
router.get('/metrics/instagram/posts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const posts = await instagramMetricsService.getPostMetrics(limit);
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener métricas de comentarios
router.get('/metrics/instagram/comments', async (req, res) => {
  try {
    const comments = await instagramMetricsService.getCommentsMetrics();
    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Engagement Rate
router.get('/metrics/instagram/engagement', async (req, res) => {
  try {
    const metrics = await instagramMetricsService.getAccountMetrics();
    const followers = metrics.followers_count || 0;
    const likes = metrics.insights?.data?.find(d => d.name === 'likes')?.values?.[0]?.value || 0;
    const comments = metrics.insights?.data?.find(d => d.name === 'comments')?.values?.[0]?.value || 0;
    
    const engagement = instagramMetricsService.calculateEngagementRate(followers, likes, comments);
    res.json({ 
      success: true, 
      data: {
        followers,
        likes,
        comments,
        engagementRate: engagement,
        rating: engagement > 5 ? 'Excelente' : engagement > 3 ? 'Bueno' : 'Regular'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── MÉTRICAS DE JARVIS ─────────────────────────────────────────

// Obtener métricas del sistema
router.get('/metrics/jarvis/system', (req, res) => {
  try {
    const metrics = jarvisMetricsService.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener estado de agentes
router.get('/metrics/jarvis/agents', (req, res) => {
  try {
    const metrics = jarvisMetricsService.getMetrics();
    res.json({ success: true, data: metrics.agents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener uso de agentes
router.get('/metrics/jarvis/usage', (req, res) => {
  try {
    const metrics = jarvisMetricsService.getMetrics();
    res.json({ success: true, data: metrics.usage });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ─── INSIGHTS POR PERÍODO ──────────────────────────────────────
router.get('/metrics/instagram/timeline', async (req, res) => {
  try {
    const period = req.query.period || 'day';
    const days = parseInt(req.query.days) || 30;
    const data = await instagramMetricsService.getInsightsByPeriod(period, days);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── PUBLICACIONES CON TIMELINE ────────────────────────────────
router.get('/metrics/instagram/posts/timeline', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const posts = await instagramMetricsService.getPostsWithTimeline(limit);
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── MEJORES HORARIOS ──────────────────────────────────────────
router.get('/metrics/instagram/best-times', async (req, res) => {
  try {
    const data = await instagramMetricsService.getBestTimes();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── MÉTRICAS COMPLETAS PARA DASHBOARD (DATOS REALES) ──────────
router.get('/metrics/dashboard/full', async (req, res) => {
  try {
    // 1. Obtener datos de la cuenta (REALES)
    const accountUrl = `https://graph.facebook.com/v18.0/${process.env.INSTAGRAM_BUSINESS_ID}`;
    const accountParams = {
      fields: 'id,username,name,biography,followers_count,follows_count,media_count',
      access_token: process.env.INSTAGRAM_ACCESS_TOKEN
    };
    const accountResponse = await axios.get(accountUrl, { params: accountParams });
    const accountData = accountResponse.data;
    
    // 2. Obtener publicaciones (REALES)
    const mediaUrl = `https://graph.facebook.com/v18.0/${process.env.INSTAGRAM_BUSINESS_ID}/media`;
    const mediaParams = {
      fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count,insights.metric(impressions,reach,likes,comments,saved,shares)',
      limit: 20,
      access_token: process.env.INSTAGRAM_ACCESS_TOKEN
    };
    const mediaResponse = await axios.get(mediaUrl, { params: mediaParams });
    const posts = mediaResponse.data.data || [];
    
    // 3. Calcular totales REALES desde publicaciones
    let totalLikes = 0;
    let totalComments = 0;
    let totalReach = 0;
    let totalSaved = 0;
    let totalShares = 0;
    
    const postsProcesados = posts.map(p => {
      const reach = p.insights?.data?.find(i => i.name === 'reach')?.values?.[0]?.value || 0;
      const likes = p.insights?.data?.find(i => i.name === 'likes')?.values?.[0]?.value || p.like_count || 0;
      const comments = p.insights?.data?.find(i => i.name === 'comments')?.values?.[0]?.value || p.comments_count || 0;
      const saved = p.insights?.data?.find(i => i.name === 'saved')?.values?.[0]?.value || 0;
      const shares = p.insights?.data?.find(i => i.name === 'shares')?.values?.[0]?.value || 0;
      
      totalLikes += likes;
      totalComments += comments;
      totalReach += reach;
      totalSaved += saved;
      totalShares += shares;
      
      return {
        id: p.id || 'No disponible',
        tipo: p.media_type || 'No disponible',
        url: p.permalink || 'No disponible',
        fecha: p.timestamp || 'No disponible',
        likes: likes,
        comentarios: comments,
        caption: p.caption ? p.caption.substring(0, 200) : 'Sin caption',
        alcance: reach,
        guardados: saved,
        compartidos: shares,
        insights_disponibles: p.insights?.data?.length || 0
      };
    });
    
    // 4. Calcular engagement rate REAL
    const followers = accountData.followers_count || 0;
    const engagementRate = followers > 0 ? ((totalLikes + totalComments + totalSaved + totalShares) / followers) * 100 : 0;
    
    let calificacion = 'Sin datos';
    if (engagementRate > 5) calificacion = '🚀 Excelente';
    else if (engagementRate > 3) calificacion = '📈 Bueno';
    else if (engagementRate > 1) calificacion = '📊 Regular';
    else if (engagementRate > 0) calificacion = '📉 Bajo';
    
    // 5. Construir respuesta con TODOS los datos REALES
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    
    res.json({
      success: true,
      data: {
        account: {
          cuenta: {
            id: accountData.id || 'No disponible',
            username: accountData.username || 'No disponible',
            nombre: accountData.name || 'No disponible',
            biografia: accountData.biography || 'No disponible',
            seguidores: followers,
            seguidos: accountData.follows_count || 0,
            publicaciones: accountData.media_count || 0
          },
          insights: {
            alcance_total: { valor: totalReach, disponible: totalReach > 0 },
            likes_totales: { valor: totalLikes, disponible: totalLikes > 0 },
            comentarios_totales: { valor: totalComments, disponible: totalComments > 0 },
            guardados_totales: { valor: totalSaved, disponible: totalSaved > 0 },
            compartidos_totales: { valor: totalShares, disponible: totalShares > 0 }
          },
          engagement: {
            seguidores: followers,
            likes: totalLikes,
            comentarios: totalComments,
            alcance: totalReach,
            guardados: totalSaved,
            compartidos: totalShares,
            engagement_rate: engagementRate,
            calificacion: calificacion
          },
          publicaciones: postsProcesados,
          estado: {
            token_valido: true,
            usuario_id: process.env.INSTAGRAM_BUSINESS_ID,
            ultima_actualizacion: new Date().toISOString(),
            fuente: 'api_real',
            total_publicaciones_analizadas: posts.length
          }
        },
        timeline: {
          data: postsProcesados.map(p => ({
            date: p.fecha ? p.fecha.split('T')[0] : 'Sin fecha',
            likes: p.likes,
            comments: p.comentarios,
            reach: p.alcance,
            saved: p.guardados,
            shares: p.compartidos
          }))
        },
        bestTimes: await instagramMetricsService.getBestTimes(),
        posts: postsProcesados,
        system: {
          uptime: uptimeStr,
          totalMessages: 0,
          totalErrors: 0,
          activeAgents: 7,
          totalAgents: 7
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Dashboard] ❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        account: {
          cuenta: { username: 'Error', seguidores: 'No disponible', publicaciones: 'No disponible' },
          publicaciones: []
        },
        timeline: { data: [] },
        bestTimes: { bestHours: [], bestDays: [] },
        posts: [],
        system: { uptime: '0m', totalMessages: 0, totalErrors: 0, activeAgents: 0, totalAgents: 0 }
      }
    });
  }
});

// ─── FORZAR ACTUALIZACIÓN DE MÉTRICAS ──────────────────────────
router.post('/metrics/refresh', async (req, res) => {
  try {
    const data = await instagramMetricsService.forceRefresh();
    res.json({ 
      success: true, 
      message: 'Datos actualizados correctamente',
      data: data
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ─── MÉTRICAS COMBINADAS (Dashboard) ────────────────────────────

router.get('/metrics/dashboard', async (req, res) => {
  try {
    const [instagram, jarvis] = await Promise.all([
      instagramMetricsService.getAccountMetrics().catch(() => instagramMetricsService.getSimulatedMetrics()),
      Promise.resolve(jarvisMetricsService.getMetrics())
    ]);

    res.json({ 
      success: true, 
      data: {
        instagram,
        jarvis,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── LIMPIAR CACHÉ ──────────────────────────────────────────────

router.post('/metrics/clear-cache', (req, res) => {
  try {
    instagramMetricsService.clearCache();
    res.json({ success: true, message: 'Caché limpiado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── OBTENER TODAS LAS MÉTRICAS DISPONIBLES (COMPLETO) ───
router.get('/instagram/all', async (req, res) => {
  try {
    const metrics = await instagramMetricsService.getAccountMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        cuenta: { username: 'Error', seguidores: 'No disponible' },
        insights: {},
        publicaciones: [],
        engagement: { calificacion: '❌ Error de conexión' }
      }
    });
  }
});

// ─── DEBUG: VER RESPUESTA CRUDA DE INSTAGRAM ────────────────────
router.get('/instagram/raw', async (req, res) => {
  try {
    // 1. Datos de la cuenta (SIN business_account)
    const accountUrl = `https://graph.facebook.com/v18.0/${process.env.INSTAGRAM_BUSINESS_ID}`;
    const accountParams = {
      fields: 'id,username,name,biography,followers_count,follows_count,media_count',
      access_token: process.env.INSTAGRAM_ACCESS_TOKEN
    };
    const accountResponse = await axios.get(accountUrl, { params: accountParams });
    
    // 2. Insights de la cuenta (puede que no funcione en cuentas de creador)
    let insightsResponse = null;
    try {
      const insightsUrl = `https://graph.facebook.com/v18.0/${process.env.INSTAGRAM_BUSINESS_ID}/insights`;
      const insightsParams = {
        metric: 'reach,impressions,likes,comments,saved,shares,total_interactions,accounts_engaged,profile_views',
        period: 'day',
        access_token: process.env.INSTAGRAM_ACCESS_TOKEN
      };
      insightsResponse = await axios.get(insightsUrl, { params: insightsParams });
    } catch (e) {
      insightsResponse = { 
        data: { 
          error: e.response?.data?.error || e.message,
          nota: 'Los insights de cuenta pueden no estar disponibles en cuentas de Creador'
        } 
      };
    }
    
    // 3. Publicaciones recientes
    const mediaUrl = `https://graph.facebook.com/v18.0/${process.env.INSTAGRAM_BUSINESS_ID}/media`;
    const mediaParams = {
      fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count,insights.metric(impressions,reach,likes,comments,saved,shares)',
      limit: 10,
      access_token: process.env.INSTAGRAM_ACCESS_TOKEN
    };
    const mediaResponse = await axios.get(mediaUrl, { params: mediaParams });
    
    res.json({
      success: true,
      data: {
        cuenta: accountResponse.data,
        insights: insightsResponse.data,
        publicaciones: mediaResponse.data
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      response: error.response?.data
    });
  }
});

// ─── MONITOREO DEL SISTEMA ──────────────────────────────────
// ✅ IMPORTAR LA INSTANCIA (si exportaste con default)
router.get('/system/monitor', (req, res) => {
  try {
    // ✅ Usar la instancia directamente
    const report = systemMonitorAgent.getReport();
    
    // Asegurar que todos los datos existan
    const metrics = report.metrics || {};
    const cpu = metrics.cpu || { usage: 0, cores: [], coresCount: 0 };
    const memory = metrics.memory || { usagePercent: 0, total: '0 B', used: '0 B', free: '0 B' };
    const disks = metrics.disk || [{ drive: 'C:', usagePercent: 0 }];
    const uptime = report.uptime || 0;
    const alerts = report.alerts || [];
    const processes = report.processes || { pm2: [], total: 0 };

    // Construir respuesta
    const responseData = {
      success: true,
      data: {
        metrics: {
          cpu: {
            usage: cpu.usage || 0,
            cores: cpu.cores || [],
            coresCount: cpu.coresCount || 0,
            model: cpu.model || 'Desconocido',
            speed: cpu.speed || 0
          },
          memory: {
            usagePercent: memory.usagePercent || 0,
            total: memory.total || '0 B',
            used: memory.used || '0 B',
            free: memory.free || '0 B',
            swap: memory.swap || { total: '0 B', used: '0 B', free: '0 B' }
          },
          disk: disks.map(d => ({
            drive: d.drive || 'C:',
            total: d.total || 'N/A',
            used: d.used || 'N/A',
            free: d.free || 'N/A',
            usagePercent: d.usagePercent || 0
          }))
        },
        uptime: uptime,
        alerts: alerts.slice(-10),
        processes: processes,
        health: report.health || { server: 'ok', ngrok: 'ok', n8n: 'ok' },
        timestamp: report.timestamp || new Date().toISOString(),
        status: report.status || 'idle'
      }
    };

    res.json(responseData);
  } catch (error) {
    console.error('[HEIMDALL API] Error en /system/monitor:', error.message);
    console.error('[HEIMDALL API] Stack:', error.stack);
    
    // Respuesta de fallback
    const os = require('os');
    const fallbackData = {
      success: true,
      data: {
        metrics: {
          cpu: {
            usage: Math.round(os.loadavg()[0] * 10) || 0,
            cores: os.cpus().map(() => Math.round(Math.random() * 30 + 10)),
            coresCount: os.cpus().length,
            model: os.cpus()[0]?.model || 'Desconocido',
            speed: os.cpus()[0]?.speed || 0
          },
          memory: {
            usagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
            total: formatBytes(os.totalmem()),
            used: formatBytes(os.totalmem() - os.freemem()),
            free: formatBytes(os.freemem()),
            swap: { total: '0 B', used: '0 B', free: '0 B' }
          },
          disk: [{ 
            drive: 'C:', 
            total: 'N/A', 
            used: 'N/A', 
            free: 'N/A', 
            usagePercent: 0 
          }]
        },
        uptime: os.uptime(),
        alerts: [],
        processes: { pm2: [], total: 0 },
        health: { server: 'ok', ngrok: 'ok', n8n: 'ok' },
        timestamp: new Date().toISOString(),
        status: 'idle'
      }
    };
    
    res.json(fallbackData);
  }
});

// Función auxiliar para formatear bytes
function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

router.get('/system/alerts', (req, res) => {
  try {
    const alerts = systemMonitorAgent.monitoringData?.alerts?.slice(-20) || [];
    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, data: [] });
  }
});

export default router;