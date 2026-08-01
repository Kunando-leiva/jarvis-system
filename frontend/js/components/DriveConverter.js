// frontend/js/components/DriveConverter.js
// 🎯 Componente de conversión de Google Drive

import { toast } from '../utils/dom.js';

export class DriveConverter {
  constructor() {
    this.section = document.getElementById('drive-converter-section');
    this.urlInput = document.getElementById('drive-url');
    this.convertBtn = document.getElementById('convert-drive-btn');
    this.resultDiv = document.getElementById('drive-result');
    this.convertedUrl = document.getElementById('drive-converted-url');
    this.copyBtn = document.getElementById('copy-drive-url');
    this.createBtn = document.getElementById('create-post-from-drive');
    this.statusDiv = document.getElementById('drive-status');
    this.coverInput = document.getElementById('cover-url');
    this.closeBtn = document.getElementById('close-drive-section');
    this.toggleBtn = document.getElementById('drive-toggle-btn');
    
    this.setupListeners();
  }

  setupListeners() {
    if (this.convertBtn) {
      this.convertBtn.addEventListener('click', () => this.convert());
    }
    
    if (this.copyBtn) {
      this.copyBtn.addEventListener('click', () => this.copy());
    }
    
    if (this.createBtn) {
      this.createBtn.addEventListener('click', () => this.create());
    }
    
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggle());
    }
    
    if (this.section) {
      this.section.addEventListener('click', (e) => e.stopPropagation());
    }
  }

  convert() {
    const url = this.urlInput?.value?.trim();
    if (!url) {
      this.status('⚠️ Por favor, pega una URL de Google Drive', '#ff6b6b');
      return;
    }
    
    const match = url.match(/file\/d\/([^/?#]+)/);
    if (!match) {
      this.status('❌ No se pudo extraer el ID. Verifica la URL.', '#ff6b6b');
      return;
    }
    
    const fileId = match[1];
    const directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
    
    if (this.convertedUrl) {
      this.convertedUrl.value = directUrl;
    }
    if (this.resultDiv) {
      this.resultDiv.style.display = 'block';
    }
    
    this.status('✅ URL convertida correctamente', '#00e5ff');
  }

  copy() {
    const url = this.convertedUrl?.value;
    if (!url) return;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        toast('📋 URL copiada al portapapeles');
      }).catch(() => this.fallbackCopy(url));
    } else {
      this.fallbackCopy(url);
    }
  }

  fallbackCopy(text) {
    if (this.convertedUrl) {
      this.convertedUrl.select();
      document.execCommand('copy');
      toast('📋 URL copiada al portapapeles');
    }
  }

  create() {
    const url = this.convertedUrl?.value;
    if (!url) {
      this.status('⚠️ Primero convierte una URL', '#ff6b6b');
      return;
    }
    
    const titulo = prompt('📝 Título del video:');
    if (!titulo) return;
    
    const now = new Date();
    const fechaDefault = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0') + ' ' + 
      String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0') + ':00';
    
    const fecha = prompt('📅 Fecha de publicación (YYYY-MM-DD HH:MM:SS):', fechaDefault);
    if (!fecha) return;
    
    const hashtagsInput = prompt('🏷️ Hashtags (separados por coma):', '#vikingos, #valhalla, #leyendas, #historiavikinga, #reelsdehistoria');
    const hashtags = hashtagsInput ? hashtagsInput.split(',').map(h => h.trim()) : [];
    
    const descripcion = prompt('📝 Descripción:') || titulo;
    const coverUrl = this.coverInput?.value?.trim() || '';
    
    const data = {
      titulo,
      fecha_publicacion: fecha,
      video_url: url,
      hashtags,
      descripcion,
      llamada_accion: '⚔️ ¡Síguenos para más historias vikingas!',
      cover_url: coverUrl || null,
      palabras_clave: [],
      respuestas: {}
    };
    
    this.status('⏳ Creando publicación...', '#ffb800');
    
    fetch('/api/create-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(result => {
      if (result.success) {
        this.status('✅ ¡Publicación creada en Obsidian!', '#00c853');
        if (this.resultDiv) this.resultDiv.style.display = 'none';
        if (this.urlInput) this.urlInput.value = '';
        toast('📝 Publicación creada');
        
        if (confirm('✅ Publicación creada. ¿Quieres publicar ahora?')) {
          fetch('/api/publish-all-pending', { method: 'POST' })
            .then(res => res.json())
            .then(publishResult => {
              if (publishResult.success) {
                toast('🚀 ¡Publicación enviada a Instagram!');
                this.close();
              }
            });
        }
      } else {
        this.status('❌ Error: ' + result.error, '#ff6b6b');
      }
    })
    .catch(err => {
      this.status('❌ Error: ' + err.message, '#ff6b6b');
    });
  }

  status(message, color = '#8892a8') {
    if (this.statusDiv) {
      this.statusDiv.innerHTML = message;
      this.statusDiv.style.color = color;
    }
  }

  toggle() {
    if (this.section) {
      this.section.style.display = this.section.style.display === 'block' ? 'none' : 'block';
    }
  }

  close() {
    if (this.section) {
      this.section.style.display = 'none';
    }
  }
}