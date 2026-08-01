// backend/src/services/voiceService.js
// Sistema de Voz con Web Speech API y ElevenLabs

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VoiceService {
  constructor() {
    this.elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel
    this.speechCache = new Map();
    this.audioDir = path.join(__dirname, '../../audio');
    
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
    }
  }

  // ──────────────────────────────────────────────────────────
  // 🔹 TEXT-TO-SPEECH con ElevenLabs
  // ──────────────────────────────────────────────────────────

  async textToSpeech(text, options = {}) {
    const voiceId = options.voiceId || this.voiceId;
    const cacheKey = `${voiceId}:${text.substring(0, 100)}`;
    
    // Verificar caché
    if (this.speechCache.has(cacheKey)) {
      console.log('[Voice] ✅ Usando caché de audio');
      return this.speechCache.get(cacheKey);
    }

    try {
      console.log('[Voice] 🎤 Generando audio con ElevenLabs...');
      
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
      
      const response = await axios({
        method: 'POST',
        url,
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsKey
        },
        data: {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: options.stability || 0.5,
            similarity_boost: options.similarityBoost || 0.75
          }
        },
        responseType: 'arraybuffer'
      });

      const audioBuffer = Buffer.from(response.data);
      
      // Guardar en caché
      this.speechCache.set(cacheKey, audioBuffer);
      
      // Guardar archivo temporal
      const filename = `speech_${Date.now()}.mp3`;
      const filePath = path.join(this.audioDir, filename);
      fs.writeFileSync(filePath, audioBuffer);
      
      console.log('[Voice] ✅ Audio generado correctamente');
      
      return {
        buffer: audioBuffer,
        path: filePath,
        url: `/api/audio/${filename}`
      };

    } catch (error) {
      console.error('[Voice] ❌ Error en ElevenLabs:', error.response?.data || error.message);
      
      // FALLBACK: Web Speech API (en el frontend)
      console.log('[Voice] ⚠️ Usando fallback de Web Speech');
      return {
        buffer: null,
        path: null,
        url: null,
        fallback: true
      };
    }
  }

  // ──────────────────────────────────────────────────────────
  // 🔹 SPEECH-TO-TEXT con Whisper (local o API)
  // ──────────────────────────────────────────────────────────

  async speechToText(audioBuffer) {
    try {
      console.log('[Voice] 🎙️ Transcribiendo audio...');
      
      // Usar Whisper API de OpenAI
      const formData = new FormData();
      formData.append('file', audioBuffer, 'audio.wav');
      formData.append('model', 'whisper-1');
      
      const response = await axios({
        method: 'POST',
        url: 'https://api.openai.com/v1/audio/transcriptions',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
        data: formData
      });

      console.log('[Voice] ✅ Transcripción completada');
      return response.data.text;

    } catch (error) {
      console.error('[Voice] ❌ Error en Whisper:', error.response?.data || error.message);
      throw new Error('Error transcribiendo audio');
    }
  }

  // ──────────────────────────────────────────────────────────
  // 🧹 LIMPIAR CACHÉ
  // ──────────────────────────────────────────────────────────

  clearCache() {
    this.speechCache.clear();
    console.log('[Voice] 🧹 Caché de audio limpiado');
  }
}

export default new VoiceService();