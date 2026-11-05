// frontend/js/app-simple.js
// 🎯 CON SESIÓN PERSISTENTE - RECUERDA LA CONVERSACIÓN

import { voiceManager } from './modules/voice.js';

(function() {
  'use strict';

  console.log('🚀 app-simple.js cargado');

  // ============================================================
  // CONFIGURACIÓN DE SESIÓN PERSISTENTE
  // ============================================================
  function initSession() {
    let sessionId = localStorage.getItem('jarvis_session_id');
    if (!sessionId) {
      sessionId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('jarvis_session_id', sessionId);
      console.log('[JARVIS] 🆔 Nueva sesión creada:', sessionId);
    } else {
      console.log('[JARVIS] 🆔 Sesión restaurada:', sessionId);
    }
    return sessionId;
  }

  const SESSION_ID = initSession();


// frontend/js/app-simple.js
// AGREGAR DESPUÉS DE initSession()

// ============================================================
// 🧠 userId PERSISTENTE
// ============================================================
function initUserId() {
  let userId = localStorage.getItem('jarvis_user_id');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('jarvis_user_id', userId);
    console.log('[JARVIS] 🆔 Nuevo userId creado:', userId);
  } else {
    console.log('[JARVIS] 🆔 userId restaurado:', userId);
  }
  return userId;
}

const USER_ID = initUserId();

// ============================================================
// 🧠 COGNITIVE MEMORY - FUNCIONES
// ============================================================

async function saveToCognitiveMemory(text, type = 'user') {
  try {
    const response = await fetch('/api/memory/cognitive/extract-and-save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        userId: USER_ID,
        sessionId: SESSION_ID,
        tags: [type, 'chat']
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.count > 0) {
      console.log(`[CognitiveMemory] ✅ ${result.count} hechos extraídos:`, 
        result.facts.map(f => `${f.type}: ${f.metadata?.value || f.content}`).join(', ')
      );
    }
    
    return result;
  } catch (error) {
    console.error('[CognitiveMemory] Error guardando:', error);
    return null;
  }
}

async function loadPersonalInfo() {
  try {
    const response = await fetch(`/api/memory/cognitive/personal-info?userId=${USER_ID}`);
    const result = await response.json();
    
    if (result.success && result.info && Object.keys(result.info).length > 0) {
      const infoSummary = Object.entries(result.info)
        .map(([key, value]) => {
          const displayKey = key.replace(/_/g, ' ');
          return `• ${displayKey}: ${value}`;
        })
        .join('\n');
      
      setTimeout(() => {
        displayMessage(
          `🧠 **JARVIS recuerda de ti:**\n\n${infoSummary}\n\n💡 Puedes preguntarme "¿Cómo me llamo?" o "¿Cuál es mi color favorito?"`,
          'system'
        );
      }, 1000);
      
      console.log('[CognitiveMemory] 📖 Información personal cargada:', result.info);
    }
  } catch (error) {
    console.error('[CognitiveMemory] Error cargando info personal:', error);
  }
}

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
  let isVoiceEnabled = false;

  // ============================================================
  // VISUALIZADOR 3D
  // ============================================================
  function initVisualizer() {
    const canvas = document.getElementById('sphere');
    if (!canvas) {
      console.error('[Visualizer] Canvas no encontrado');
      return;
    }

    console.log('[Visualizer] Inicializando esfera 3D...');

    scene = new THREE.Scene();
    scene.background = null;

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 4.5);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    console.log('[Visualizer] Renderer creado');

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

    const ringGeom = new THREE.TorusGeometry(1.6, 0.015, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.15
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

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

    function animate() {
      requestAnimationFrame(animate);

      if (sphere) {
        sphere.rotation.x += 0.003;
        sphere.rotation.y += 0.005;
      }

      if (ring) {
        ring.rotation.z += 0.002;
      }

      currentScale += (targetScale - currentScale) * 0.08;
      if (sphere) {
        sphere.scale.set(currentScale, currentScale, currentScale);
      }

      renderer.render(scene, camera);
    }

    animate();

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

    // 🔥 LEER EN VOZ ALTA
    if (isVoiceEnabled && role !== 'user' && text && text.length > 5) {
      voiceManager.speak(text, {
        rate: 1.12,
        pitch: 1.14
      });
    }
  }


function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  
  displayMessage(text, 'user');
  
  // ✅ GUARDAR EN COGNITIVE MEMORY
  saveToCognitiveMemory(text, 'user');
  
  if (socket) {
    // ✅ ENVIAR OBJETO CON userId Y sessionId
    socket.emit('user-message', {
      message: text,
      userId: USER_ID,
      sessionId: SESSION_ID
    });
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
  
  // ✅ IDENTIFICARSE CON userId Y sessionId
  socket.emit('identify', {
    userId: USER_ID,
    sessionId: SESSION_ID
  });
  
  document.getElementById('status-label').textContent = 'JARVIS · ONLINE';
  document.getElementById('status-label').style.color = '#00e5ff';
});

// ✅ RECIBIR CONFIRMACIÓN DE IDENTIFICACIÓN
socket.on('identified', function(data) {
  console.log('[Socket] ✅ Identificado:', data);
  if (data.cognitiveMemoryAvailable) {
    console.log('[Socket] 🧠 CognitiveMemory disponible');
  }
});
    
    socket.on('disconnect', function() {
      console.log('❌ Socket desconectado');
      document.getElementById('status-label').textContent = 'OFFLINE';
      document.getElementById('status-label').style.color = '#ff6b6b';
    });
    
    // frontend/js/app-simple.js
// DENTRO DE connectSocket(), socket.on('ai-response')

socket.on('ai-response', function(data) {
  if (data.text) {
    const provider = data.provider?.toUpperCase() || data.mode || 'SISTEMA';
    const role = provider.toLowerCase();
    
    displayMessage(data.text, role);
    
    // ✅ GUARDAR RESPUESTA EN COGNITIVE MEMORY
    if (role !== 'system' && data.text.length > 10) {
      saveToCognitiveMemory(data.text, 'response');
    }
    
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
  // MICRÓFONO
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
      
      micBtn.addEventListener('click', function() {
        if (!isAudioInitialized) {
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
        
        if (window._recognition && !this.classList.contains('listening')) {
          this.classList.add('listening');
          window._recognition.start();
        }
      });
    } else {
      micBtn.style.opacity = '0.3';
      micBtn.title = 'Micrófono no soportado';
    }
  }

  // ============================================================
  // DRIVE CONVERTER
  // ============================================================
  function setupDriveConverter() {
    const toggleBtn = document.getElementById('drive-toggle-btn');
    const section = document.getElementById('drive-converter-section');
    const closeBtn = document.getElementById('close-drive-section');
    const convertBtn = document.getElementById('convert-drive-btn');
    const addRespuestaBtn = document.getElementById('add-respuesta-btn');
    const respuestasContainer = document.getElementById('respuestas-container');

    if (toggleBtn && section) {
      toggleBtn.addEventListener('click', function() {
        section.style.display = section.style.display === 'block' ? 'none' : 'block';
        if (section.style.display === 'block') {
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

    if (convertBtn) {
      convertBtn.addEventListener('click', function() {
        const urlInput = document.getElementById('drive-url');
        const url = urlInput.value.trim();
        
        const match = url.match(/file\/d\/([^/?#]+)/);
        if (!match) {
          alert('❌ URL de Google Drive inválida. Asegúrate de copiar la URL completa.');
          return;
        }
        const fileId = match[1];
        const convertedUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
        console.log('[Drive] URL convertida:', convertedUrl);

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

        const hashtags = hashtagsInput ? hashtagsInput.split(',').map(h => h.trim()).filter(h => h.startsWith('#')) : [];

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

        const data = {
          titulo: titulo,
          fecha_publicacion: fecha.replace('T', ' '),
          video_url: convertedUrl,
          hashtags: hashtags.length > 0 ? hashtags : ['#vikingos', '#valhalla', '#reinoDeValhalla'],
          descripcion: descripcion || titulo,
          llamada_accion: cta || '⚔️ ¡Síguenos para más historias!',
          cover_url: cover || null,
          palabras_clave: Object.keys(respuestas),
          respuestas: respuestas
        };

        console.log('[Drive] Datos a enviar:', data);

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
            urlInput.value = '';
            document.getElementById('post-titulo').value = '';
            document.getElementById('post-hashtags').value = '';
            document.getElementById('post-descripcion').value = '';
            document.getElementById('post-cta').value = '';
            document.getElementById('post-cover').value = '';
            respuestasContainer.innerHTML = '';
            
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
  }

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

  // ============================================================
  // CONTROLES DE VOZ
  // ============================================================
  function setupVoiceControls() {
    voiceManager.init('es-ES');
    
    // ─── BOTÓN DE VOZ ──────────────────────────────────────
    const bottomBar = document.getElementById('bottom-bar');
    if (bottomBar) {
      const voiceBtn = document.createElement('button');
      voiceBtn.id = 'voice-toggle-btn';
      voiceBtn.innerHTML = '🔇';
      voiceBtn.title = 'Activar voz de JARVIS';
      voiceBtn.style.cssText = `
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #c9d1e0;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.2s;
        opacity: 0.5;
      `;
      
      voiceBtn.addEventListener('click', () => {
        isVoiceEnabled = !isVoiceEnabled;
        voiceManager.toggle(isVoiceEnabled);
        
        if (isVoiceEnabled) {
          voiceBtn.innerHTML = '🔊';
          voiceBtn.style.opacity = '1';
          voiceBtn.style.borderColor = '#00e5ff';
          voiceBtn.style.color = '#00e5ff';
          voiceBtn.title = 'Desactivar voz';
          
          const statusLabel = document.getElementById('status-label');
          if (statusLabel) {
            const originalText = statusLabel.textContent;
            statusLabel.textContent = '🔊 VOZ ACTIVADA';
            statusLabel.style.color = '#00e5ff';
            setTimeout(() => {
              statusLabel.textContent = originalText;
              statusLabel.style.color = '';
            }, 1500);
          }
        } else {
          voiceBtn.innerHTML = '🔇';
          voiceBtn.style.opacity = '0.5';
          voiceBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          voiceBtn.style.color = '#c9d1e0';
          voiceBtn.title = 'Activar voz';
        }
      });
      
      const driveBtn = document.getElementById('drive-toggle-btn');
      if (driveBtn) {
        driveBtn.parentNode.insertBefore(voiceBtn, driveBtn.nextSibling);
      } else {
        bottomBar.appendChild(voiceBtn);
      }
      
      console.log('[Voice] ✅ Botón de voz agregado');
    }
    
    // ─── BOTÓN PANEL DE VOZ ──────────────────────────────
    const voicePanelBtn = document.getElementById('voice-panel-btn');
    if (voicePanelBtn) {
      voicePanelBtn.addEventListener('click', () => {
        window.openVoicePanel();
      });
      console.log('[Voice] ✅ Botón de panel de voz agregado');
    }

    // ─── COMANDOS ──────────────────────────────────────────
    const originalHandleCommand = window.handleCommand;
    window.handleCommand = function(text) {
      const lower = text.toLowerCase().trim();
      
      if (lower === '/voice') {
        const voiceBtn = document.getElementById('voice-toggle-btn');
        if (voiceBtn) voiceBtn.click();
        return true;
      }
      
      if (lower === '/voicestatus') {
        const status = voiceManager.getStatus();
        displayMessage(
          `🔊 **Estado de voz**\n\n` +
          `- Activada: ${status.enabled ? '✅ Sí' : '❌ No'}\n` +
          `- Voz actual: ${status.voice || 'No disponible'}\n` +
          `- Velocidad: ${status.rate}\n` +
          `- Tono: ${status.pitch}\n` +
          `- Voces disponibles: ${status.voicesCount}`,
          'system'
        );
        return true;
      }
      
      if (lower === '/voicepanel') {
        window.openVoicePanel();
        return true;
      }
      
      if (typeof originalHandleCommand === 'function') {
        return originalHandleCommand(text);
      }
      return false;
    };
  }

  // ============================================================
  // PANEL DE VOZ
  // ============================================================
  window.openVoicePanel = function() {
    const panel = document.getElementById('voice-panel');
    if (panel) {
      panel.classList.add('show');
      updateVoicePanel();
    }
  };

  window.closeVoicePanel = function() {
    const panel = document.getElementById('voice-panel');
    if (panel) {
      panel.classList.remove('show');
    }
  };

  function updateVoicePanel() {
    const status = voiceManager.getStatus();
    
    const select = document.getElementById('voice-select');
    if (select) {
      const voices = voiceManager.getVoices();
      const currentVoice = status.voice;
      
      select.innerHTML = '';
      voices.forEach((v, i) => {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${v.name} (${v.lang})`;
        if (v.name === currentVoice) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      
      document.getElementById('indicator-voices').textContent = voices.length;
    }
    
    document.getElementById('rate-slider').value = status.rate;
    document.getElementById('pitch-slider').value = status.pitch;
    document.getElementById('rate-value').textContent = status.rate.toFixed(2);
    document.getElementById('pitch-value').textContent = status.pitch.toFixed(2);
    document.getElementById('indicator-rate').textContent = status.rate.toFixed(2);
    document.getElementById('indicator-pitch').textContent = status.pitch.toFixed(2);
    
    const dot = document.getElementById('voice-status-dot');
    const text = document.getElementById('voice-status-text');
    const voiceName = document.getElementById('voice-status-voice');
    
    if (status.enabled) {
      dot.className = 'status-dot active';
      text.textContent = 'Activada';
      text.style.color = '#00c853';
    } else {
      dot.className = 'status-dot';
      text.textContent = 'Desactivada';
      text.style.color = '#ff6b6b';
    }
    
    voiceName.textContent = status.voice || 'Sin voz seleccionada';
  }

  window.applyPreset = function(btn) {
    const rate = parseFloat(btn.dataset.rate);
    const pitch = parseFloat(btn.dataset.pitch);
    
    document.getElementById('rate-slider').value = rate;
    document.getElementById('pitch-slider').value = pitch;
    document.getElementById('rate-value').textContent = rate.toFixed(2);
    document.getElementById('pitch-value').textContent = pitch.toFixed(2);
    document.getElementById('indicator-rate').textContent = rate.toFixed(2);
    document.getElementById('indicator-pitch').textContent = pitch.toFixed(2);
    
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };

  window.testVoice = function() {
    const text = 'Hola, soy JARVIS. Esta es mi voz configurada. ¿Qué te parece?';
    voiceManager.speak(text);
  };

  window.applyVoiceSettings = function() {
    const rate = parseFloat(document.getElementById('rate-slider').value);
    const pitch = parseFloat(document.getElementById('pitch-slider').value);
    const select = document.getElementById('voice-select');
    const voiceIndex = parseInt(select.value);
    const voices = voiceManager.getVoices();
    
    voiceManager.rate = rate;
    voiceManager.pitch = pitch;
    
    if (voiceIndex >= 0 && voiceIndex < voices.length) {
      voiceManager.voice = voices[voiceIndex];
    }
    
    document.getElementById('indicator-rate').textContent = rate.toFixed(2);
    document.getElementById('indicator-pitch').textContent = pitch.toFixed(2);
    document.getElementById('rate-value').textContent = rate.toFixed(2);
    document.getElementById('pitch-value').textContent = pitch.toFixed(2);
    
    const status = voiceManager.getStatus();
    document.getElementById('voice-status-voice').textContent = status.voice || 'Sin voz';
    
    showToast('✅ Configuración de voz aplicada');
    
    setTimeout(() => {
      if (voiceManager.enabled) {
        voiceManager.speak('Configuración aplicada correctamente.');
      }
    }, 300);
  };

  // ─── EVENTOS SLIDERS ─────────────────────────────────────
  document.getElementById('rate-slider')?.addEventListener('input', function() {
    document.getElementById('rate-value').textContent = parseFloat(this.value).toFixed(2);
    document.getElementById('indicator-rate').textContent = parseFloat(this.value).toFixed(2);
  });

  document.getElementById('pitch-slider')?.addEventListener('input', function() {
    document.getElementById('pitch-value').textContent = parseFloat(this.value).toFixed(2);
    document.getElementById('indicator-pitch').textContent = parseFloat(this.value).toFixed(2);
  });

  document.getElementById('voice-select')?.addEventListener('change', function() {
    const voices = voiceManager.getVoices();
    const index = parseInt(this.value);
    if (index >= 0 && index < voices.length) {
      document.getElementById('voice-status-voice').textContent = voices[index].name;
    }
  });

  function showToast(message) {
    const existing = document.querySelector('.voice-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'voice-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(10, 15, 30, 0.95);
      border: 1px solid #00e5ff;
      padding: 10px 24px;
      border-radius: 8px;
      color: #e8edf5;
      font-family: 'Rajdhani', sans-serif;
      font-size: 0.85rem;
      z-index: 10000;
      animation: fadeInUp 0.3s ease;
      box-shadow: 0 0 40px rgba(0, 229, 255, 0.15);
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ============================================================
  // INICIALIZACIÓN
  // ============================================================
  function init() {
    console.log('🚀 Iniciando JARVIS...');
    console.log('🆔 Session ID persistente:', SESSION_ID);
    
    initVisualizer();
    connectSocket();
    setupMicrophone();
    setupDriveConverter();
    setupVoiceControls();
    
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
    
    setTimeout(function() {
      displayMessage(
        '⚡ **JARVIS activo**\n\n' +
        'Comandos: /help, /voice, /voicestatus, /voicepanel\n' +
        'Agente: JARVIS (🧠 Planificador)\n\n' +
        '💡 **Tu sesión es persistente:** Puedes refrescar la página y recordaré nuestra conversación.\n\n' +
        '🔊 **Voz:** Usa /voice o el botón 🔊 para activar la voz de JARVIS.\n' +
        '🎛️ **Ecualizador:** Usa /voicepanel o el botón 🎛️ para ajustar la voz.',
        'system'
      );
    }, 500);
    
    console.log('✅ JARVIS iniciado');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();