// backend/src/services/instagramMultiAccountService.js
// Servicio para manejar múltiples cuentas de Instagram

export const CUENTAS = {
  valhalla: {
    id: 'valhalla',
    nombre: 'Reino de Valhalla',
    username: 'reino_valhalla',
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN_VALHALLA,
    businessId: process.env.INSTAGRAM_BUSINESS_ID_VALHALLA || '17841415579405374',
    pageId: process.env.FACEBOOK_PAGE_ID_VALHALLA,
    emoji: '🏰',
    color: '#00e5ff'
  },
  alhornodirecto: {
    id: 'alhornodirecto',
    nombre: 'Alhorno Directo',
    username: 'alhornodirecto',
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN_ALHORNO,
    businessId: process.env.INSTAGRAM_BUSINESS_ID_ALHORNO || '17841442269419568',
    pageId: process.env.FACEBOOK_PAGE_ID_ALHORNO || '1260265530508456',
    emoji: '🔥',
    color: '#ff6b35'
  }
};

class InstagramMultiAccountService {
  constructor() {
    this.cuentaActiva = 'valhalla';
    this.vaultPath = process.env.VAULT_PATH || 'C:/Users/Soledad/Desktop/MiCerebroDigital';
    this.publicUrl = process.env.PUBLIC_URL || 'https://untrue-drainage-cahoots.ngrok-free.dev';
  }

  /**
   * Obtener la cuenta activa
   */
  getCuentaActiva() {
    return this.cuentaActiva;
  }

  /**
   * Cambiar la cuenta activa
   */
  setCuentaActiva(cuentaId) {
    if (!CUENTAS[cuentaId]) {
      throw new Error(`Cuenta "${cuentaId}" no encontrada. Disponibles: ${Object.keys(CUENTAS).join(', ')}`);
    }
    this.cuentaActiva = cuentaId;
    console.log(`[MultiAccount] 🔄 Cuenta activa: ${CUENTAS[cuentaId].nombre} (@${CUENTAS[cuentaId].username})`);
    return this.cuentaActiva;
  }

  /**
   * Obtener datos de una cuenta específica
   */
  getCuenta(cuentaId) {
    const cuenta = CUENTAS[cuentaId];
    if (!cuenta) {
      throw new Error(`Cuenta "${cuentaId}" no encontrada`);
    }
    return cuenta;
  }

  /**
   * Obtener todas las cuentas disponibles
   */
  getCuentasDisponibles() {
    return Object.keys(CUENTAS).map(id => ({
      id,
      ...CUENTAS[id],
      configurada: !!CUENTAS[id].accessToken && !!CUENTAS[id].businessId
    }));
  }

  /**
   * Obtener la configuración para una cuenta (para el servicio de publicación)
   */
  getConfigParaCuenta(cuentaId) {
    const cuenta = this.getCuenta(cuentaId);
    return {
      accessToken: cuenta.accessToken,
      igUserId: cuenta.businessId,
      pageId: cuenta.pageId,
      nombre: cuenta.nombre,
      username: cuenta.username
    };
  }

  /**
   * Verificar si una cuenta está configurada correctamente
   */
  async verificarCuenta(cuentaId) {
    const cuenta = this.getCuenta(cuentaId);
    
    if (!cuenta.accessToken) {
      return { success: false, error: 'Token no configurado' };
    }
    if (!cuenta.businessId) {
      return { success: false, error: 'Business ID no configurado' };
    }

    try {
      // Verificar token llamando a la API
      const url = `https://graph.facebook.com/v18.0/${cuenta.businessId}`;
      const params = {
        fields: 'id,username,name,biography,followers_count',
        access_token: cuenta.accessToken
      };
      
      const response = await fetch(url, { params });
      const data = await response.json();
      
      if (data.error) {
        return { success: false, error: data.error.message };
      }
      
      return {
        success: true,
        cuenta: {
          id: data.id,
          username: data.username,
          name: data.name,
          seguidores: data.followers_count
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener métricas de una cuenta específica
   */
  async obtenerMetricas(cuentaId) {
    const cuenta = this.getCuenta(cuentaId);
    
    try {
      const url = `https://graph.facebook.com/v18.0/${cuenta.businessId}`;
      const params = {
        fields: 'id,username,name,biography,followers_count,follows_count,media_count',
        access_token: cuenta.accessToken
      };
      
      const response = await fetch(url, { params });
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      return {
        success: true,
        cuenta: {
          id: data.id,
          username: data.username,
          name: data.name,
          biography: data.biography,
          followers: data.followers_count,
          following: data.follows_count,
          posts: data.media_count
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new InstagramMultiAccountService();