// backend/src/controllers/dmController.js
// 🎯 Lógica de procesamiento de DMs

import { 
  procesarDMInstagram, 
  registrarDMRespondido, 
  obtenerDMsRespondidos 
} from '../services/instagramDMService.js';
import { getCurrentMode } from '../state/appState.js';

export async function procesarDM(req, res) {
  const { id, user, text, timestamp, recipient_id } = req.body;

  if (!id || !text) {
    return res.status(400).json({ 
      error: 'Faltan parámetros requeridos (id, text)' 
    });
  }

  const dmsProcesados = obtenerDMsRespondidos();
  if (dmsProcesados.includes(id)) {
    console.log(`[Gideon DM Warning] ⚠️ DM ID ${id} ya fue respondido. Ignorando duplicado.`);
    return res.status(200).json({ 
      success: true, 
      message: 'DM Duplicado ignorado' 
    });
  }

  console.log(`[Gideon DM Engine] 📨 Procesando DM de @${user}: "${text}"`);

  try {
    const resultado = await procesarDMInstagram({
      id,
      user,
      text,
      timestamp: timestamp || Date.now().toString(),
      recipient_id
    });

    registrarDMRespondido(id);

    return res.status(200).json({ 
      success: true, 
      message: 'DM procesado exitosamente',
      data: resultado
    });

  } catch (error) {
    console.error('[Gideon DM Loop Error] ❌', error.message);
    return res.status(500).json({ 
      error: 'Error interno en módulo DM',
      details: error.message 
    });
  }
}