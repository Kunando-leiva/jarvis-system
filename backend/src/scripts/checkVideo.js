import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta del video a verificar
const videoPath = 'C:/Users/Soledad/Desktop/MiCerebroDigital/videos/video2.mp4';

console.log('🔍 VERIFICACIÓN COMPLETA DE VIDEO PARA INSTAGRAM REELS\n');
console.log('=' .repeat(60));

if (!fs.existsSync(videoPath)) {
  console.log('❌ Archivo NO encontrado en:', videoPath);
  process.exit(1);
}

// 1. INFORMACIÓN BÁSICA DEL ARCHIVO
const stats = fs.statSync(videoPath);
const ext = path.extname(videoPath).toLowerCase();

console.log('\n📁 INFORMACIÓN DEL ARCHIVO:');
console.log(`  📍 Ruta: ${videoPath}`);
console.log(`  📏 Tamaño: ${(stats.size / (1024 * 1024)).toFixed(2)} MB ${stats.size / (1024 * 1024) > 100 ? '⚠️ EXCEDE 100MB' : '✅ OK'}`);
console.log(`  📝 Extensión: ${ext} ${ext === '.mp4' ? '✅ OK' : '❌ Debe ser .mp4 o .mov'}`);
console.log(`  📅 Última modificación: ${new Date(stats.mtime).toLocaleString()}`);

// 2. VERIFICAR CABECERA MP4
const buffer = Buffer.alloc(12);
const fd = fs.openSync(videoPath, 'r');
fs.readSync(fd, buffer, 0, 12, 0);
fs.closeSync(fd);

const isMP4 = buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70;
console.log(`\n🎬 ESTRUCTURA MP4:`);
console.log(`  ${isMP4 ? '✅ Es un MP4 válido (cabecera ftyp detectada)' : '❌ No es un MP4 válido'}`);

// 3. VERIFICAR CON FFPROBE
console.log('\n📊 ANÁLISIS DE VIDEO CON FFPROBE:');

try {
  // Verificar si ffprobe está instalado
  execSync('ffprobe -version', { stdio: 'ignore' });
  
  // Obtener información del video de forma más directa
  const videoInfo = execSync(
    `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,bit_rate -of default=noprint_wrappers=1 "${videoPath}"`,
    { encoding: 'utf8' }
  );
  
  const audioInfo = execSync(
    `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,channels,sample_rate -of default=noprint_wrappers=1 "${videoPath}"`,
    { encoding: 'utf8' }
  );
  
  const durationInfo = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 "${videoPath}"`,
    { encoding: 'utf8' }
  );
  
  // Parsear la información del video
  const videoData = {};
  videoInfo.split('\n').filter(line => line.includes('=')).forEach(line => {
    const [key, value] = line.split('=');
    videoData[key] = value;
  });
  
  // Parsear la información del audio
  const audioData = {};
  audioInfo.split('\n').filter(line => line.includes('=')).forEach(line => {
    const [key, value] = line.split('=');
    audioData[key] = value;
  });
  
  // Parsear la duración
  const durationData = {};
  durationInfo.split('\n').filter(line => line.includes('=')).forEach(line => {
    const [key, value] = line.split('=');
    durationData[key] = value;
  });
  
  // Obtener valores con manejo de errores
  const codec = videoData.codec_name || 'desconocido';
  const width = parseInt(videoData.width) || 0;
  const height = parseInt(videoData.height) || 0;
  const fpsStr = videoData.r_frame_rate || '0/0';
  const fpsParts = fpsStr.split('/');
  const fps = fpsParts.length === 2 ? parseInt(fpsParts[0]) / parseInt(fpsParts[1]) : 0;
  const bitrate = parseInt(videoData.bit_rate) || 0;
  const duration = parseFloat(durationData.duration) || 0;
  const audioCodec = audioData.codec_name || 'desconocido';
  const channels = parseInt(audioData.channels) || 0;
  const sampleRate = parseInt(audioData.sample_rate) || 0;
  
  // Mostrar información del video
  console.log('\n  🎥 STREAM DE VIDEO:');
  console.log(`    Códec: ${codec} ${codec === 'h264' ? '✅ OK' : codec === 'hevc' ? '✅ OK' : '❌ Debe ser H264 o HEVC'}`);
  console.log(`    Resolución: ${width}x${height} ${width === 1080 && height === 1920 ? '✅ 9:16 Perfecto' : width && height ? '⚠️ Debe ser 1080x1920 (9:16)' : '❌ No detectado'}`);
  console.log(`    Framerate: ${fps.toFixed(1)} fps ${fps >= 23 && fps <= 60 ? '✅ OK' : '⚠️ Debe ser entre 23-60 fps'}`);
  console.log(`    Bitrate: ${(bitrate / 1000000).toFixed(2)} Mbps ${bitrate <= 25000000 ? '✅ OK (<25 Mbps)' : '⚠️ Debe ser <25 Mbps'}`);
  console.log(`    Duración: ${duration.toFixed(1)}s ${duration >= 3 && duration <= 900 ? '✅ OK (3s-15min)' : '⚠️ Debe ser entre 3s y 15min'}`);
  
  // Mostrar información del audio
  console.log('\n  🔊 STREAM DE AUDIO:');
  console.log(`    Códec: ${audioCodec} ${audioCodec === 'aac' ? '✅ OK' : '⚠️ Debe ser AAC'}`);
  console.log(`    Canales: ${channels} ${channels === 1 || channels === 2 ? '✅ OK' : '⚠️ Debe ser mono o stereo'}`);
  console.log(`    Sample Rate: ${(sampleRate / 1000).toFixed(1)} kHz ${sampleRate <= 48000 ? '✅ OK' : '⚠️ Debe ser ≤48kHz'}`);
  
  // VERIFICACIÓN FINAL
  console.log('\n🎯 VERIFICACIÓN FINAL:');
  const isCodecOk = codec === 'h264' || codec === 'hevc';
  const isResolutionOk = width === 1080 && height === 1920;
  const isFpsOk = fps >= 23 && fps <= 60;
  const isDurationOk = duration >= 3 && duration <= 900;
  const isBitrateOk = bitrate <= 25000000;
  const isAudioOk = audioCodec === 'aac';
  const isSampleRateOk = sampleRate <= 48000;
  const isChannelsOk = channels === 1 || channels === 2;
  
  if (isCodecOk && isResolutionOk && isFpsOk && isDurationOk && isBitrateOk && isAudioOk && isSampleRateOk && isChannelsOk) {
    console.log('  🎉 ¡EL VIDEO CUMPLE CON TODOS LOS REQUISITOS DE INSTAGRAM REELS!');
    console.log('\n  ✅ Puedes publicar este video en Instagram.');
  } else {
    console.log('  ⚠️ EL VIDEO NO CUMPLE CON TODOS LOS REQUISITOS:');
    if (!isCodecOk) console.log('    - Códec: debe ser H264 o HEVC (actual: ' + codec + ')');
    if (!isResolutionOk) console.log('    - Resolución: debe ser 1080x1920 (9:16) (actual: ' + width + 'x' + height + ')');
    if (!isFpsOk) console.log('    - Framerate: debe ser entre 23-60 fps (actual: ' + fps.toFixed(1) + ' fps)');
    if (!isDurationOk) console.log('    - Duración: debe ser entre 3-60 segundos (actual: ' + duration.toFixed(1) + 's)');
    if (!isBitrateOk) console.log('    - Bitrate: debe ser < 25 Mbps (actual: ' + (bitrate / 1000000).toFixed(2) + ' Mbps)');
    if (!isAudioOk) console.log('    - Audio: debe ser AAC (actual: ' + audioCodec + ')');
    if (!isSampleRateOk) console.log('    - Sample Rate: debe ser ≤48kHz (actual: ' + (sampleRate / 1000).toFixed(1) + ' kHz)');
    if (!isChannelsOk) console.log('    - Canales: debe ser mono o stereo (actual: ' + channels + ')');
  }
  
} catch (error) {
  console.log('  ⚠️ FFprobe no está instalado. Instala FFmpeg para un análisis completo.');
  console.log('  📥 Descarga FFmpeg desde: https://ffmpeg.org/download.html');
}

console.log('\n' + '=' .repeat(60));