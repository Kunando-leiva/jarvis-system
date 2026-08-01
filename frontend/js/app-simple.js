// frontend/js/app-simple.js
// 🎯 ESFERA 3D LIMPIA - REACCIONA AL MICRÓFONO

(function() {
  'use strict';

  console.log('🚀 app-simple.js cargado');

  // ============================================================
  // VARIABLES GLOBALES
  // ============================================================
  let scene, camera, renderer, sphere, sphereMaterial;
  let audioContext = null;
  let analyser = null;
  let isAudioInitialized = false;
  let targetScale = 1.0;
  let currentScale = 1.0;
  let socket = null;

  // ============================================================
  // VISUALIZADOR 3D - ESFERA LIMPIA
  // ============================================================
  function initVisualizer() {
    const canvas = document.getElementById('sphere');
    if (!canvas) {
      console.error('[Visualizer] Canvas no encontrado');
      return;
    }

    console.log('[Visualizer] Inicializando esfera 3D...');

    // ESCENA
    scene = new THREE.Scene();
    scene.background = null;

    // CÁMARA
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 4.5);
    camera.lookAt(0, 0, 0);

    // RENDERER
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    console.log('[Visualizer] Renderer creado');

    // ============================================================
    // ESFERA PRINCIPAL - LIMPIA
    // ============================================================
    const geometry = new THREE.SphereGeometry(1.2, 64, 64);
    sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.3,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
      shininess: 100
    });
    
    sphere = new THREE.Mesh(geometry, sphereMaterial);
    sphere.position.set(0, 0, 0);
    scene.add(sphere);

    console.log('[Visualizer] Esfera creada');

    // ============================================================
    // ESFERA INTERIOR - SÓLIDA CON BRILLO
    // ============================================================
    const innerGeom = new THREE.SphereGeometry(0.5, 32, 32);
    const innerMat = new THREE.MeshPhongMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.2,
      shininess: 200
    });
    const innerSphere = new THREE.Mesh(innerGeom, innerMat);
    innerSphere.position.set(0, 0, 0);
    scene.add(innerSphere);

    // ============================================================
    // ANILLO DECORATIVO (opcional, para darle estilo)
    // ============================================================
    const ringGeom = new THREE.TorusGeometry(1.6, 0.015, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.15
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    // ============================================================
    // LUCES
    // ============================================================
    const light1 = new THREE.DirectionalLight(0xff4444, 0.8);
    light1.position.set(2, 2, 2);
    scene.add(light1);
    
    const light2 = new THREE.DirectionalLight(0x44aaff, 0.8);
    light2.position.set(-2, -1, -1);
    scene.add(light2);
    
    const ambient = new THREE.AmbientLight(0x222244, 0.6);
    scene.add(ambient);

    const light3 = new THREE.DirectionalLight(0x00e5ff, 0.3);
    light3.position.set(0, -3, 0);
    scene.add(light3);

    console.log('[Visualizer] Luces creadas');

    // ============================================================
    // MICRÓFONO
    // ============================================================
    function initAudio() {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((stream) => {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            isAudioInitialized = true;
            console.log('[Visualizer] 🎤 Micrófono conectado!');
          })
          .catch((err) => {
            console.warn('[Visualizer] ⚠️ No se pudo acceder al micrófono:', err.message);
          });
      } catch (e) {
        console.warn('[Visualizer] ⚠️ AudioContext no soportado.');
      }
    }

    const micBtn = document.getElementById('mic-btn');
    if (micBtn) {
      micBtn.addEventListener('click', function() {
        if (!isAudioInitialized) {
          initAudio();
          console.log('[Visualizer] Audio inicializado por clic');
        }
        if (window._recognition && !this.classList.contains('listening')) {
          this.classList.add('listening');
          window._recognition.start();
        }
      });
    }

    // ============================================================
    // BUCLE DE ANIMACIÓN
    // ============================================================
    function animate() {
      requestAnimationFrame(animate);

      // Rotación suave de la esfera
      if (sphere) {
        sphere.rotation.x += 0.003;
        sphere.rotation.y += 0.005;
      }

      // Rotación del anillo
      if (ring) {
        ring.rotation.z += 0.002;
      }

      // ============================================================
      // REACCIÓN AL MICRÓFONO
      // ============================================================
      if (isAudioInitialized && analyser) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;

        if (average > 5) {
          // ESCALA: la esfera crece
          targetScale = 1.0 + (average / 255) * 0.5;
          
          // COLOR: cambia de azul a rojo según el volumen
          const hue = 0.6 - (average / 255) * 0.5;
          if (sphereMaterial) {
            sphereMaterial.color.setHSL(Math.max(0, Math.min(1, hue)), 1, 0.5);
            sphereMaterial.emissive.setHSL(Math.max(0, Math.min(1, hue)), 1, 0.5);
            sphereMaterial.emissiveIntensity = 0.5 + (average / 255) * 0.8;
          }
        } else {
          targetScale = 1.0;
          if (sphereMaterial) {
            sphereMaterial.color.setHex(0x00e5ff);
            sphereMaterial.emissive.setHex(0x00e5ff);
            sphereMaterial.emissiveIntensity = 0.3;
          }
        }
      }

      // Suavizar la escala (interpolación)
      currentScale += (targetScale - currentScale) * 0.08;
      if (sphere) {
        sphere.scale.set(currentScale, currentScale, currentScale);
      }

      renderer.render(scene, camera);
    }

    animate();

    // REDIMENSIONAR
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    console.log('[Visualizer] ✅ Esfera 3D iniciada correctamente');
  }

  // ============================================================
  // FUNCIONES DEL CHAT
  // ============================================================
  function formatText(text) {
    if (!text) return '';
    let formatted = text;
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/^# (.*)$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^---$/gm, '<hr>');
    formatted = formatted.replace(/^-\s(.*)$/gm, '• $1');
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    formatted = formatted.replace(/```([\s\S]*?)```/g, function(match, code) {
      return '<pre><code>' + code.trim() + '</code></pre>';
    });
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }

  function displayMessage(text, role) {
    const container = document.getElementById('response-container');
    if (!container) return;
    
    container.classList.add('show');
    container.style.display = 'block';
    
    const agents = {
      user: { icon: '👤', name: 'Tú', color: '#8a94a8' },
      system: { icon: '⚡', name: 'SISTEMA', color: '#6a7a8a' },
      jarvis: { icon: '🧠', name: 'JARVIS', color: '#00e5ff' },
      gideon: { icon: '⚔️', name: 'GIDEON', color: '#ffb800' },
      heimdall: { icon: '👁️', name: 'HEIMDALL', color: '#00ff88' },
      kill: { icon: '💀', name: 'KILL', color: '#ff0044' }
    };
    
    const agent = agents[role] || agents.system;
    
    const item = document.createElement('div');
    item.className = 'response-item';
    item.innerHTML = `
      <span class="response-icon">${agent.icon}</span>
      <span class="response-name" style="color:${agent.color}">${agent.name}</span>
      <span class="response-time">${new Date().toLocaleTimeString()}</span>
      <div class="response-text">${formatText(text)}</div>
    `;
    
    container.appendChild(item);
    container.scrollTop = container.scrollHeight;

    while (container.children.length > 50) {
      container.removeChild(container.children[0]);
    }
  }

  function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    displayMessage(text, 'user');
    
    if (socket) {
      socket.emit('user-message', text);
    }
    
    input.value = '';
  }

  // ============================================================
  // SOCKET
  // ============================================================
  function connectSocket() {
    if (socket) return;
    
    socket = io('http://localhost:5000');
    
    socket.on('connect', function() {
      console.log('✅ Socket conectado');
      document.getElementById('status-label').textContent = 'JARVIS · ONLINE';
      document.getElementById('status-label').style.color = '#00e5ff';
    });
    
    socket.on('disconnect', function() {
      console.log('❌ Socket desconectado');
      document.getElementById('status-label').textContent = 'OFFLINE';
      document.getElementById('status-label').style.color = '#ff6b6b';
    });
    
    socket.on('ai-response', function(data) {
      if (data.text) {
        const provider = data.provider?.toUpperCase() || data.mode || 'SISTEMA';
        displayMessage(data.text, provider.toLowerCase());
        
        // 🔥 PULSO VISUAL CUANDO JARVIS HABLA
        if (sphereMaterial) {
          sphereMaterial.color.setHex(0x00e5ff);
          sphereMaterial.emissiveIntensity = 0.8;
          targetScale = 1.3;
          setTimeout(() => {
            targetScale = 1.0;
            sphereMaterial.emissiveIntensity = 0.3;
          }, 800);
        }
      }
    });
    
    socket.on('state-change', function(data) {
      if (data.mode) {
        displayMessage('🔄 Modo cambiado a **' + data.mode + '**', 'system');
        document.getElementById('status-label').textContent = data.mode + ' · ONLINE';
      }
    });
  }

  // ============================================================
  // MICRÓFONO - RECONOCIMIENTO DE VOZ
  // ============================================================
  function setupMicrophone() {
    const micBtn = document.getElementById('mic-btn');
    if (!micBtn) return;
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      window._recognition = recognition;
      
      recognition.onresult = function(event) {
        const text = event.results[0][0].transcript;
        const input = document.getElementById('chat-input');
        if (input) {
          input.value = text;
          micBtn.classList.remove('listening');
          setTimeout(sendMessage, 300);
        }
      };
      
      recognition.onerror = function() {
        micBtn.classList.remove('listening');
      };
      
      recognition.onend = function() {
        micBtn.classList.remove('listening');
      };
    } else {
      micBtn.style.opacity = '0.3';
      micBtn.title = 'Micrófono no soportado';
    }
  }

  // ============================================================
  // DRIVE CONVERTER
  // ============================================================
  // frontend/js/app-simple.js - Reemplazar la función setupDriveConverter

function setupDriveConverter() {
  const toggleBtn = document.getElementById('drive-toggle-btn');
  const section = document.getElementById('drive-converter-section');
  const closeBtn = document.getElementById('close-drive-section');
  const convertBtn = document.getElementById('convert-drive-btn');
  const addRespuestaBtn = document.getElementById('add-respuesta-btn');
  const respuestasContainer = document.getElementById('respuestas-container');

  // Variables para almacenar la URL convertida
  let convertedUrl = '';

  // --- ABRIR/CERRAR MODAL ---
  if (toggleBtn && section) {
    toggleBtn.addEventListener('click', function() {
      section.style.display = section.style.display === 'block' ? 'none' : 'block';
      if (section.style.display === 'block') {
        // Pre-fill fecha con la actual
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('post-fecha').value = `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    });
  }

  if (closeBtn && section) {
    closeBtn.addEventListener('click', function() {
      section.style.display = 'none';
    });
  }

  // --- AÑADIR CAMPO DE RESPUESTA ---
  if (addRespuestaBtn && respuestasContainer) {
    addRespuestaBtn.addEventListener('click', function() {
      const div = document.createElement('div');
      div.style.cssText = 'display:grid; grid-template-columns: 1fr 2fr auto; gap:6px; margin-bottom:6px; align-items:center;';
      div.innerHTML = `
        <input type="text" placeholder="Palabra clave" class="respuesta-clave" style="padding:6px 8px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:#fff; font-size:0.75rem;">
        <input type="text" placeholder="Respuesta..." class="respuesta-valor" style="padding:6px 8px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:#fff; font-size:0.75rem;">
        <button class="eliminar-respuesta" style="background:rgba(255,60,60,0.2); border:none; border-radius:4px; color:#ff6b6b; cursor:pointer; padding:4px 8px; font-size:0.7rem;">✕</button>
      `;
      const eliminarBtn = div.querySelector('.eliminar-respuesta');
      eliminarBtn.addEventListener('click', function() {
        div.remove();
      });
      respuestasContainer.appendChild(div);
    });
  }

  // --- CONVERTIR Y CREAR ---
  if (convertBtn) {
    convertBtn.addEventListener('click', function() {
      const urlInput = document.getElementById('drive-url');
      const url = urlInput.value.trim();
      
      // 1. Validar y convertir URL
      const match = url.match(/file\/d\/([^/?#]+)/);
      if (!match) {
        alert('❌ URL de Google Drive inválida. Asegúrate de copiar la URL completa.');
        return;
      }
      const fileId = match[1];
      convertedUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
      console.log('[Drive] URL convertida:', convertedUrl);

      // 2. Recolectar datos del formulario
      const titulo = document.getElementById('post-titulo').value.trim();
      const fecha = document.getElementById('post-fecha').value;
      const hashtagsInput = document.getElementById('post-hashtags').value.trim();
      const descripcion = document.getElementById('post-descripcion').value.trim();
      const cta = document.getElementById('post-cta').value.trim();
      const cover = document.getElementById('post-cover').value.trim();

      if (!titulo) {
        alert('⚠️ El campo "Título" es obligatorio.');
        return;
      }
      if (!fecha) {
        alert('⚠️ La "Fecha de Publicación" es obligatoria.');
        return;
      }

      // Parsear hashtags
      const hashtags = hashtagsInput ? hashtagsInput.split(',').map(h => h.trim()).filter(h => h.startsWith('#')) : [];

      // 3. Recolectar respuestas personalizadas
      const respuestas = {};
      const claves = document.querySelectorAll('.respuesta-clave');
      const valores = document.querySelectorAll('.respuesta-valor');
      
      if (claves.length > 0 && claves.length === valores.length) {
        for (let i = 0; i < claves.length; i++) {
          const clave = claves[i].value.trim().toLowerCase();
          const valor = valores[i].value.trim();
          if (clave && valor) {
            respuestas[clave] = valor;
          }
        }
      }
      
      // Añadir respuesta "default" si no existe
      if (!respuestas['default']) {
        // Podrías preguntar o establecer un valor por defecto aquí
        // respuestas['default'] = 'Respuesta por defecto...';
        // console.log('[Drive] Usando respuesta default.');
      }

      // 4. Construir payload final
      const data = {
        titulo: titulo,
        fecha_publicacion: fecha.replace('T', ' '), // Convertir a formato que espera el backend
        video_url: convertedUrl,
        hashtags: hashtags.length > 0 ? hashtags : ['#vikingos', '#valhalla', '#reinoDeValhalla'],
        descripcion: descripcion || titulo,
        llamada_accion: cta || '⚔️ ¡Síguenos para más historias!',
        cover_url: cover || null,
        palabras_clave: Object.keys(respuestas),
        respuestas: respuestas
      };

      console.log('[Drive] Datos a enviar:', data);

      // 5. Enviar al backend
      const statusDiv = document.getElementById('drive-status') || createStatusDiv(section);
      statusDiv.innerHTML = '⏳ Creando publicación...';
      statusDiv.style.color = '#ffb800';

      fetch('/api/create-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          statusDiv.innerHTML = '✅ ¡Publicación creada en Obsidian!';
          statusDiv.style.color = '#00c853';
          // Resetear formulario
          urlInput.value = '';
          document.getElementById('post-titulo').value = '';
          document.getElementById('post-hashtags').value = '';
          document.getElementById('post-descripcion').value = '';
          document.getElementById('post-cta').value = '';
          document.getElementById('post-cover').value = '';
          respuestasContainer.innerHTML = ''; // Limpiar respuestas
          
          // Preguntar si quiere publicar ahora
          if (confirm('✅ Publicación creada. ¿Quieres publicarla ahora en Instagram?')) {
            statusDiv.innerHTML = '🚀 Publicando en Instagram...';
            statusDiv.style.color = '#ffb800';
            fetch('/api/publish-all-pending', { method: 'POST' })
              .then(res => res.json())
              .then(publishResult => {
                if (publishResult.success && publishResult.total > 0) {
                  statusDiv.innerHTML = `✅ ¡Publicación enviada a Instagram! (${publishResult.procesados} publicados)`;
                  statusDiv.style.color = '#00c853';
                } else {
                  statusDiv.innerHTML = '⚠️ No se publicó nada. Revisa los archivos programados.';
                  statusDiv.style.color = '#ffb800';
                }
              })
              .catch(err => {
                statusDiv.innerHTML = `❌ Error publicando: ${err.message}`;
                statusDiv.style.color = '#ff6b6b';
              });
          } else {
            // Cerrar modal después de un tiempo
            setTimeout(() => {
              if (section) section.style.display = 'none';
            }, 2000);
          }
        } else {
          statusDiv.innerHTML = `❌ Error: ${result.error || 'Error desconocido'}`;
          statusDiv.style.color = '#ff6b6b';
        }
      })
      .catch(err => {
        statusDiv.innerHTML = `❌ Error de red: ${err.message}`;
        statusDiv.style.color = '#ff6b6b';
      });
    });
  }

  // Función auxiliar para crear el div de estado si no existe
  function createStatusDiv(parent) {
    let statusDiv = document.getElementById('drive-status');
    if (!statusDiv) {
      statusDiv = document.createElement('div');
      statusDiv.id = 'drive-status';
      statusDiv.style.cssText = 'margin-top:8px;font-size:0.75rem;min-height:18px;color:#8892a8;';
      parent.appendChild(statusDiv);
    }
    return statusDiv;
  }
}

  // ============================================================
  // INICIALIZACIÓN
  // ============================================================
  function init() {
    console.log('🚀 Iniciando JARVIS...');
    
    // Visualizador 3D
    initVisualizer();
    
    // Socket
    connectSocket();
    
    // Micrófono
    setupMicrophone();
    
    // Drive
    setupDriveConverter();
    
    // Chat
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    
    if (input) {
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
      });
    }
    
    if (sendBtn) {
      sendBtn.addEventListener('click', sendMessage);
    }
    
    // Mensaje de bienvenida
    setTimeout(function() {
      displayMessage(
        '⚡ **JARVIS activo**\n\n' +
        'Comandos: /help\n' +
        'Agente: JARVIS (🧠 Planificador)',
        'system'
      );
    }, 500);
    
    console.log('✅ JARVIS iniciado');
  }

  // ─── EJECUTAR ──────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();