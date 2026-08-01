// frontend/js/components/Particles.js
// 🎯 Sistema de partículas de fondo

export class Particles {
  constructor() {
    this.container = null;
    this.initialized = false;
  }

  init(containerId = 'particles-js') {
    if (this.initialized) return;
    
    this.container = document.getElementById(containerId);
    if (!this.container) {
      // Crear contenedor si no existe
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 0;
        pointer-events: none;
      `;
      document.body.prepend(this.container);
    }
    
    if (typeof particlesJS === 'undefined') {
      console.warn('⚠️ particles.js no cargado');
      return;
    }
    
    this.initialized = true;
    
    particlesJS(containerId, {
      particles: {
        number: {
          value: 100,
          density: {
            enable: true,
            value_area: 800
          }
        },
        color: {
          value: '#00e5ff'
        },
        shape: {
          type: 'circle'
        },
        opacity: {
          value: 0.5,
          random: true,
          anim: {
            enable: true,
            speed: 1,
            opacity_min: 0.1,
            sync: false
          }
        },
        size: {
          value: 2,
          random: true,
          anim: {
            enable: true,
            speed: 2,
            size_min: 0.1,
            sync: false
          }
        },
        line_linked: {
          enable: true,
          distance: 150,
          color: '#00e5ff',
          opacity: 0.2,
          width: 1
        },
        move: {
          enable: true,
          speed: 1,
          direction: 'none',
          random: true,
          straight: false,
          out_mode: 'out',
          bounce: false,
          attract: {
            enable: true,
            rotateX: 600,
            rotateY: 1200
          }
        }
      },
      interactivity: {
        detect_on: 'canvas',
        events: {
          onhover: {
            enable: true,
            mode: 'repulse'
          },
          onclick: {
            enable: true,
            mode: 'push'
          },
          resize: true
        }
      },
      retina_detect: true
    });
  }

  updateTheme(theme) {
    const colors = {
      JARVIS: '#00e5ff',
      GIDEON: '#ffb800',
      HEIMDALL: '#00ff88',
      KILL: '#ff0044'
    };
    
    const color = colors[theme] || '#00e5ff';
    
    // Re-inicializar con nuevo color
    if (this.initialized && typeof particlesJS !== 'undefined') {
      const containerId = this.container?.id || 'particles-js';
      // Simplemente re-inicializar
      // Nota: particles.js no soporta cambio dinámico fácilmente
      // Se puede recargar la página o re-inicializar
    }
  }
}