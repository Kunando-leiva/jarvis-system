// frontend/js/core/config.js
// 🎯 Configuración central

export const CONFIG = {
  serverUrl: 'http://localhost:5000',
  
  agents: {
    jarvis: {
      id: 'jarvis',
      name: 'JARVIS',
      icon: '🧠',
      color: '#00e5ff',
      description: 'Planificador estratégico y coordinador de agentes',
      status: 'online'
    },
    gideon: {
      id: 'gideon',
      name: 'GIDEON',
      icon: '⚔️',
      color: '#ffb800',
      description: 'Ejecutor de comunidad y respuestas automáticas',
      status: 'online'
    },
    heimdall: {
      id: 'heimdall',
      name: 'HEIMDALL',
      icon: '👁️',
      color: '#00ff88',
      description: 'Vigilante de métricas y monitoreo del sistema',
      status: 'online'
    },
    kill: {
      id: 'kill',
      name: 'KILL',
      icon: '💀',
      color: '#ff0044',
      description: 'Automatización total de tareas',
      status: 'online'
    },
    'kill-research': {
      id: 'kill-research',
      name: 'KILL-RESEARCH',
      icon: '🔍',
      color: '#00d4ff',
      description: 'Investigación automática en internet',
      status: 'online'
    },
    'kill-write': {
      id: 'kill-write',
      name: 'KILL-WRITE',
      icon: '✍️',
      color: '#ff6b6b',
      description: 'Generación de contenido de alta calidad',
      status: 'online'
    },
    'kill-code': {
      id: 'kill-code',
      name: 'KILL-CODE',
      icon: '💻',
      color: '#00ff88',
      description: 'Programación automática',
      status: 'online'
    },
    'content-creator': {
      id: 'content-creator',
      name: 'CONTENT-CREATOR',
      icon: '🎬',
      color: '#ff6b6b',
      description: 'Genera guiones virales para Reels/TikTok',
      status: 'online'
    }
  },
  
  themes: {
    JARVIS: { accent: '#00e5ff', accentDim: 'rgba(0,229,255,0.15)', accentGlow: 'rgba(0,229,255,0.6)', core: '#e0fbff' },
    GIDEON: { accent: '#ffb800', accentDim: 'rgba(255,184,0,0.15)', accentGlow: 'rgba(255,184,0,0.6)', core: '#fff4dc' },
    HEIMDALL: { accent: '#00ff88', accentDim: 'rgba(0,255,136,0.15)', accentGlow: 'rgba(0,255,136,0.6)', core: '#d4fff0' },
    KILL: { accent: '#ff0044', accentDim: 'rgba(255,0,68,0.15)', accentGlow: 'rgba(255,0,68,0.6)', core: '#ffd4dc' }
  }
};

export const DEFAULT_AGENT = 'jarvis';
export const DEFAULT_THEME = 'JARVIS';