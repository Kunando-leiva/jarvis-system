import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// =============================================
// 🔥 IMPORTAR FIREBASE ADMIN (con require)
// =============================================

let admin = null;
let db = null;
let isFirebaseConnected = false;

try {
  // Usar require para importar firebase-admin
  admin = require('firebase-admin');
  console.log('[Firebase] ✅ firebase-admin importado correctamente');
  console.log('[Firebase] 📦 Versión:', admin.SDK_VERSION || 'desconocida');
} catch (error) {
  console.error('[Firebase] ❌ Error importando firebase-admin:', error.message);
  console.log('[Firebase] ⚠️ Usando modo simulado');
}

// =============================================
// 🔥 INICIALIZAR FIREBASE
// =============================================

if (admin) {
  try {
    // Ruta al archivo de clave de servicio
    const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
    console.log(`[Firebase] 📁 Buscando clave en: ${serviceAccountPath}`);
    
    if (fs.existsSync(serviceAccountPath)) {
      console.log('[Firebase] ✅ Archivo de clave encontrado');
      
      // Leer el archivo JSON manualmente
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      
      // Verificar que admin tiene credential
      if (admin.credential && typeof admin.credential.cert === 'function') {
        console.log('[Firebase] ✅ admin.credential.cert disponible');
        
        if (!admin.apps || admin.apps.length === 0) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          console.log('[Firebase] ✅ Inicializado con clave de servicio');
        } else {
          console.log('[Firebase] ✅ Ya inicializado');
        }
        
        db = admin.firestore();
        isFirebaseConnected = true;
        console.log('[Firebase] ✅ Firestore listo para usar');
        console.log(`[Firebase] 📁 Proyecto: ${serviceAccount.project_id}`);
      } else {
        console.log('[Firebase] ❌ admin.credential.cert NO disponible');
        console.log('[Firebase] 🔍 admin.credential:', admin.credential);
        console.log('[Firebase] ⚠️ Usando modo simulado');
      }
    } else {
      console.log('[Firebase] ⚠️ No se encontró serviceAccountKey.json');
      console.log('[Firebase] 💡 Coloca el archivo en: backend/serviceAccountKey.json');
      console.log('[Firebase] ⚠️ Usando modo simulado');
    }
  } catch (error) {
    console.error('[Firebase] ❌ Error:', error.message);
    console.log('[Firebase] ⚠️ Usando modo simulado');
  }
} else {
  console.log('[Firebase] ⚠️ Modo simulado (firebase-admin no disponible)');
}

// =============================================
// 🧠 SERVICIO DE MEMORIA
// =============================================

class MemoryService {
  
  async saveMessage(sessionId, role, content, metadata = {}) {
    try {
      if (!isFirebaseConnected) {
        console.log(`[Memory] 💾 [SIMULADO] ${role}: ${content.substring(0, 50)}...`);
        return true;
      }
      
      const messageRef = db.collection('sessions').doc(sessionId).collection('messages');
      await messageRef.add({
        role,
        content,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata,
      });
      
      console.log(`[Memory] 💾 Mensaje guardado en sesión: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('[Memory] ❌ Error guardando mensaje:', error.message);
      return false;
    }
  }

  async getConversationHistory(sessionId, limit = 20) {
    try {
      if (!isFirebaseConnected) {
        return [];
      }
      
      const messagesRef = db.collection('sessions').doc(sessionId).collection('messages');
      const snapshot = await messagesRef
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      const messages = [];
      snapshot.forEach(doc => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      
      return messages.reverse();
    } catch (error) {
      console.error('[Memory] ❌ Error obteniendo historial:', error.message);
      return [];
    }
  }

  async saveContext(sessionId, context) {
    try {
      if (!isFirebaseConnected) {
        console.log(`[Memory] 📝 [SIMULADO] Contexto guardado`);
        return true;
      }
      
      await db.collection('sessions').doc(sessionId).set({
        context,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      
      console.log(`[Memory] 📝 Contexto guardado para sesión: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('[Memory] ❌ Error guardando contexto:', error.message);
      return false;
    }
  }

  async getContext(sessionId) {
    try {
      if (!isFirebaseConnected) {
        return {};
      }
      
      const doc = await db.collection('sessions').doc(sessionId).get();
      if (doc.exists) {
        return doc.data().context || {};
      }
      return {};
    } catch (error) {
      console.error('[Memory] ❌ Error obteniendo contexto:', error.message);
      return {};
    }
  }

  async savePublication(publicationData) {
    try {
      if (!isFirebaseConnected) {
        console.log(`[Memory] 📤 [SIMULADO] Publicación: ${publicationData.titulo}`);
        return true;
      }
      
      await db.collection('publications').add({
        ...publicationData,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log(`[Memory] 📤 Publicación guardada: ${publicationData.titulo}`);
      return true;
    } catch (error) {
      console.error('[Memory] ❌ Error guardando publicación:', error.message);
      return false;
    }
  }

  async getPublications(limit = 50) {
    try {
      if (!isFirebaseConnected) {
        return [];
      }
      
      const snapshot = await db.collection('publications')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      const publications = [];
      snapshot.forEach(doc => {
        publications.push({ id: doc.id, ...doc.data() });
      });
      
      return publications;
    } catch (error) {
      console.error('[Memory] ❌ Error obteniendo publicaciones:', error.message);
      return [];
    }
  }

  async saveSystemState(state) {
    try {
      if (!isFirebaseConnected) {
        console.log(`[Memory] 💻 [SIMULADO] Estado: ${state.mode}`);
        return true;
      }
      
      await db.collection('system').doc('state').set({
        ...state,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      
      console.log('[Memory] 💻 Estado del sistema guardado');
      return true;
    } catch (error) {
      console.error('[Memory] ❌ Error guardando estado:', error.message);
      return false;
    }
  }

  async getSystemState() {
    try {
      if (!isFirebaseConnected) {
        return { mode: 'JARVIS' };
      }
      
      const doc = await db.collection('system').doc('state').get();
      if (doc.exists) {
        return doc.data();
      }
      return { mode: 'JARVIS' };
    } catch (error) {
      console.error('[Memory] ❌ Error obteniendo estado:', error.message);
      return { mode: 'JARVIS' };
    }
  }

  async clearSession(sessionId) {
    try {
      if (!isFirebaseConnected) {
        console.log(`[Memory] 🧹 [SIMULADO] Historial limpiado`);
        return true;
      }
      
      const messagesRef = db.collection('sessions').doc(sessionId).collection('messages');
      const snapshot = await messagesRef.get();
      
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      console.log(`[Memory] 🧹 Historial limpiado para sesión: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('[Memory] ❌ Error limpiando historial:', error.message);
      return false;
    }
  }
}

export default new MemoryService();