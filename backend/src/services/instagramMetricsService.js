// backend/src/services/instagramMetricsService.js
// Servicio de métricas de Instagram - VERSIÓN LIMPIA Y CORREGIDA

import axios from 'axios';

class InstagramMetricsService {
  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
    this.igUserId = process.env.INSTAGRAM_BUSINESS_ID || '17841415579405374';
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutos
  }

  /**
   * OBTENER DATOS BÁSICOS DE LA CUENTA
   */
  async _fetchAccountData() {
    try {
      console.log('[Instagram Metrics] 📡 Obteniendo datos de la cuenta...');
      
      const url = `${this.baseUrl}/${this.igUserId}`;
      const params = {
        fields: 'id,username,name,biography,followers_count,follows_count,media_count',
        access_token: this.accessToken
      };
      
      const response = await axios.get(url, { params, timeout: 10000 });
      console.log(`[Instagram Metrics] ✅ Datos obtenidos: ${response.data.followers_count} seguidores, ${response.data.media_count} publicaciones`);
      return response.data;
      
    } catch (error) {
      console.error('[Instagram Metrics] ❌ Error obteniendo datos de cuenta:', error.response?.data || error.message);
      return {};
    }
  }

  /**
   * OBTENER PUBLICACIONES RECIENTES
   */
  async _fetchRecentPosts(limit = 20) {
    try {
      const url = `${this.baseUrl}/${this.igUserId}/media`;
      const params = {
        fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count,insights.metric(impressions,reach,likes,comments,saved,shares)',
        limit: limit,
        access_token: this.accessToken
      };
      
      const response = await axios.get(url, { params, timeout: 10000 });
      return response.data.data || [];
      
    } catch (error) {
      console.error('[Instagram Metrics] ❌ Error obteniendo publicaciones:', error.message);
      return [];
    }
  }

  /**
   * OBTENER VALOR DE INSIGHT DE UNA PUBLICACIÓN
   */
  _getPostInsightValue(post, metricName) {
    try {
      if (!post.insights || !post.insights.data) return 0;
      const item = post.insights.data.find(i => i.name === metricName);
      if (item && item.values && item.values.length > 0) {
        return item.values[0].value || 0;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * CALIFICAR ENGAGEMENT
   */
  _calificarEngagement(followers, likes, comments) {
    if (followers === 0) return 'Sin datos';
    const rate = ((likes + comments) / followers) * 100;
    if (rate > 5) return '🚀 Excelente';
    if (rate > 3) return '📈 Bueno';
    if (rate > 1) return '📊 Regular';
    if (rate > 0) return '📉 Bajo';
    return 'Sin datos';
  }

  /**
   * OBTENER TODAS LAS MÉTRICAS REALES DE LA CUENTA
   */
  async getAccountMetrics() {
    try {
      console.log('[Instagram Metrics] 📊 Obteniendo TODAS las métricas reales...');
      
      // 1. Datos de la cuenta (REALES)
      let accountData = {};
      try {
        accountData = await this._fetchAccountData();
        console.log(`[Instagram Metrics] ✅ Cuenta: ${accountData.followers_count} seguidores, ${accountData.media_count} publicaciones`);
      } catch (e) {
        console.warn('[Instagram Metrics] ⚠️ No se pudo obtener datos de cuenta:', e.message);
      }
      
      // 2. Publicaciones recientes (REALES)
      const postsData = await this._fetchRecentPosts(20);
      console.log(`[Instagram Metrics] ✅ Publicaciones: ${postsData.length} posts`);
      
      // 3. Calcular totales desde publicaciones
      let totalLikes = 0;
      let totalComments = 0;
      let totalReach = 0;
      let totalSaved = 0;
      let totalShares = 0;
      let totalImpressions = 0;
      
      for (const post of postsData) {
        totalLikes += post.like_count || 0;
        totalComments += post.comments_count || 0;
        totalReach += this._getPostInsightValue(post, 'reach');
        totalSaved += this._getPostInsightValue(post, 'saved');
        totalShares += this._getPostInsightValue(post, 'shares');
        totalImpressions += this._getPostInsightValue(post, 'impressions');
      }
      
      // 4. Construir respuesta
      return {
        cuenta: {
          id: accountData.id || 'No disponible',
          username: accountData.username || 'No disponible',
          nombre: accountData.name || 'No disponible',
          biografia: accountData.biography || 'No disponible',
          seguidores: accountData.followers_count || 0,
          seguidos: accountData.follows_count || 0,
          publicaciones: accountData.media_count || 0,
          categoria: accountData.category || 'No especificada'
        },
        insights: {
          alcance_total: { valor: totalReach, disponible: totalReach > 0 },
          likes_totales: { valor: totalLikes, disponible: totalLikes > 0 },
          comentarios_totales: { valor: totalComments, disponible: totalComments > 0 },
          guardados_totales: { valor: totalSaved, disponible: totalSaved > 0 },
          compartidos_totales: { valor: totalShares, disponible: totalShares > 0 },
          impresiones_totales: { valor: totalImpressions, disponible: totalImpressions > 0 }
        },
        publicaciones: postsData.map(p => ({
          id: p.id || 'No disponible',
          tipo: p.media_type || 'No disponible',
          url: p.permalink || 'No disponible',
          fecha: p.timestamp || 'No disponible',
          likes: p.like_count || 0,
          comentarios: p.comments_count || 0,
          caption: p.caption ? p.caption.substring(0, 200) : 'Sin caption',
          alcance: this._getPostInsightValue(p, 'reach'),
          impresiones: this._getPostInsightValue(p, 'impressions'),
          guardados: this._getPostInsightValue(p, 'saved'),
          compartidos: this._getPostInsightValue(p, 'shares'),
          insights_disponibles: p.insights?.data?.length || 0
        })),
        engagement: {
          seguidores: accountData.followers_count || 0,
          likes: totalLikes,
          comentarios: totalComments,
          alcance: totalReach,
          guardados: totalSaved,
          compartidos: totalShares,
          engagement_rate: accountData.followers_count > 0 ? ((totalLikes + totalComments + totalSaved + totalShares) / accountData.followers_count) * 100 : 0,
          calificacion: this._calificarEngagement(accountData.followers_count || 0, totalLikes, totalComments)
        },
        estado: {
          token_valido: !!this.accessToken,
          usuario_id: this.igUserId,
          ultima_actualizacion: new Date().toISOString(),
          tipo_cuenta: accountData.business_account ? 'Business' : 'Creador/Personal',
          fuentes: {
            cuenta: accountData.id ? 'real' : 'no_disponible',
            publicaciones: postsData.length > 0 ? `real (${postsData.length})` : 'no_disponible'
          }
        }
      };
      
    } catch (error) {
      console.error('[Instagram Metrics] ❌ Error:', error.message);
      return this._errorResponse(error.message);
    }
  }

  /**
   * RESPUESTA DE ERROR
   */
  _errorResponse(mensaje) {
    return {
      error: true,
      mensaje: mensaje,
      estado: {
        token_valido: !!this.accessToken,
        usuario_id: this.igUserId,
        error: mensaje
      },
      cuenta: {
        username: 'No disponible (error de conexión)',
        seguidores: 'No disponible',
        publicaciones: 'No disponible'
      },
      insights: {
        alcance: { valor: 'No disponible', disponible: false },
        impresiones: { valor: 'No disponible', disponible: false },
        me_gustas: { valor: 'No disponible', disponible: false },
        comentarios: { valor: 'No disponible', disponible: false },
        guardados: { valor: 'No disponible', disponible: false },
        compartidos: { valor: 'No disponible', disponible: false }
      },
      publicaciones: [],
      engagement: {
        seguidores: 'No disponible',
        likes: 'No disponible',
        comentarios: 'No disponible',
        engagement_rate: 'No disponible',
        calificacion: '❌ Error de conexión'
      }
    };
  }

  /**
   * OBTENER MÉTRICAS DE PUBLICACIONES
   */
  async getPostMetrics(limit = 10) {
    try {
      const posts = await this._fetchRecentPosts(limit);
      return posts;
    } catch (error) {
      console.error('[Instagram Metrics] ❌ Error:', error.message);
      return [];
    }
  }

  /**
   * OBTENER MÉTRICAS DE COMENTARIOS
   */
  async getCommentsMetrics(limit = 20) {
    try {
      const posts = await this._fetchRecentPosts(5);
      const allComments = [];
      for (const post of posts) {
        try {
          const url = `${this.baseUrl}/${post.id}/comments`;
          const params = {
            fields: 'id,username,text,timestamp,like_count',
            limit: limit,
            access_token: this.accessToken
          };
          const response = await axios.get(url, { params, timeout: 5000 });
          if (response.data && response.data.data) {
            allComments.push(...response.data.data.map(c => ({ ...c, post_id: post.id })));
          }
        } catch (e) {
          // Ignorar
        }
      }
      return allComments;
    } catch (error) {
      console.error('[Instagram Metrics] ❌ Error:', error.message);
      return [];
    }
  }

  /**
   * CALCULAR ENGAGEMENT RATE
   */
  calculateEngagementRate(followers, likes, comments) {
    if (!followers || followers === 0) return 0;
    return ((likes + comments) / followers) * 100;
  }

  /**
   * LIMPIAR CACHÉ
   */
  clearCache() {
    this.cache.clear();
    console.log('[Instagram Metrics] 🧹 Caché limpiado');
  }

  /**
   * INSIGHTS POR PERÍODO
   */
  async getInsightsByPeriod(period = 'day', days = 30) {
    try {
      const posts = await this._fetchRecentPosts(days);
      const data = posts.map(p => ({
        date: p.timestamp ? p.timestamp.split('T')[0] : 'Sin fecha',
        likes: p.like_count || 0,
        comments: p.comments_count || 0,
        reach: this._getPostInsightValue(p, 'reach'),
        saved: this._getPostInsightValue(p, 'saved'),
        shares: this._getPostInsightValue(p, 'shares')
      }));
      
      return {
        period,
        days,
        data,
        total: {
          likes: data.reduce((sum, d) => sum + d.likes, 0),
          comments: data.reduce((sum, d) => sum + d.comments, 0),
          reach: data.reduce((sum, d) => sum + d.reach, 0)
        },
        estado: data.length > 0 ? 'datos_reales' : 'sin_datos',
        mensaje: data.length > 0 ? `✅ ${data.length} publicaciones analizadas` : '⚠️ No hay datos disponibles'
      };
    } catch (error) {
      return { period, days, data: [], error: error.message, estado: 'error' };
    }
  }

  /**
   * MEJORES HORARIOS
   */
  async getBestTimes() {
    try {
      const posts = await this._fetchRecentPosts(50);
      
      if (!posts || posts.length === 0) {
        return { bestHours: [], bestDays: [], totalPosts: 0, mensaje: '⚠️ No hay publicaciones suficientes' };
      }
      
      const hourStats = {};
      const dayStats = {};
      
      for (const post of posts) {
        if (!post.timestamp) continue;
        const date = new Date(post.timestamp);
        const hour = date.getHours();
        const day = date.getDay();
        
        if (!hourStats[hour]) hourStats[hour] = { count: 0, likes: 0, comments: 0 };
        if (!dayStats[day]) dayStats[day] = { count: 0, likes: 0, comments: 0 };
        
        hourStats[hour].count++;
        hourStats[hour].likes += post.like_count || 0;
        hourStats[hour].comments += post.comments_count || 0;
        
        dayStats[day].count++;
        dayStats[day].likes += post.like_count || 0;
        dayStats[day].comments += post.comments_count || 0;
      }
      
      const bestHours = Object.keys(hourStats).map(hour => ({
        hour: parseInt(hour),
        count: hourStats[hour].count,
        engagement: (hourStats[hour].likes + hourStats[hour].comments) / (hourStats[hour].count || 1)
      })).sort((a, b) => b.engagement - a.engagement).slice(0, 5);
      
      const bestDays = Object.keys(dayStats).map(day => ({
        day: parseInt(day),
        dayName: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][day],
        count: dayStats[day].count,
        engagement: (dayStats[day].likes + dayStats[day].comments) / (dayStats[day].count || 1)
      })).sort((a, b) => b.engagement - a.engagement);
      
      return {
        bestHours,
        bestDays,
        totalPosts: posts.length,
        estado: 'datos_reales',
        mensaje: `✅ Analizados ${posts.length} publicaciones`
      };
    } catch (error) {
      return { bestHours: [], bestDays: [], totalPosts: 0, error: error.message, estado: 'error' };
    }
  }

  /**
   * PUBLICACIONES CON TIMELINE
   */
  async getPostsWithTimeline(limit = 20) {
    try {
      const posts = await this._fetchRecentPosts(limit);
      return posts.map(p => ({
        id: p.id || 'No disponible',
        tipo: p.media_type || 'No disponible',
        url: p.permalink || 'No disponible',
        timestamp: p.timestamp || new Date().toISOString(),
        like_count: p.like_count || 0,
        comments_count: p.comments_count || 0,
        caption: p.caption ? p.caption.substring(0, 150) : 'Sin caption',
        alcance: this._getPostInsightValue(p, 'reach'),
        impresiones: this._getPostInsightValue(p, 'impressions'),
        guardados: this._getPostInsightValue(p, 'saved'),
        compartidos: this._getPostInsightValue(p, 'shares'),
        insights: p.insights || { data: [] }
      }));
    } catch (error) {
      console.error('[Instagram Metrics] ❌ Error:', error.message);
      return [];
    }
  }

  /**
   * DATOS SIMULADOS (FALLBACK)
   */
  getSimulatedMetrics() {
    return {
      username: 'reino_valhalla',
      name: 'Reino de Valhalla',
      followers_count: 119,
      media_count: 37,
      biography: '⚔️ Descubrí el mito, la sangre y la gloria del Norte.',
      insights: { data: [] }
    };
  }

  /**
   * FORZAR ACTUALIZACIÓN
   */
  async forceRefresh() {
    console.log('[Instagram Metrics] 🔄 Forzando actualización...');
    this.clearCache();
    const data = await this.getAccountMetrics();
    return {
      ...data,
      actualizado: new Date().toISOString()
    };
  }
}

export default new InstagramMetricsService();