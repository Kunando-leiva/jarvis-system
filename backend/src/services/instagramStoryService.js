import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import cron from 'node-cron';
import instagramMultiAccountService from './instagramMultiAccountService.js';
import { sendActionToN8n } from './n8nService.js';

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v27.0';
const STATUSES = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  PROCESSING: 'PROCESSING',
  PUBLISHED: 'PUBLISHED',
  MANUAL_ACTION_REQUIRED: 'MANUAL_ACTION_REQUIRED',
  MANUALLY_PUBLISHED: 'MANUALLY_PUBLISHED',
  FAILED: 'FAILED'
});

class InstagramStoryService {
  constructor() {
    this.baseDir = path.join(
      process.env.VAULT_PATH || path.resolve(process.cwd(), '../MiCerebroDigital'),
      'Instagram_Content',
      'Historias'
    );
    this.started = false;
    this.processing = false;
  }

  ensureDirectory() {
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  validate(input) {
    const errors = [];
    if (!input || typeof input !== 'object') errors.push('Se requiere un objeto de historia.');
    if (!input?.title || typeof input.title !== 'string') errors.push('title es obligatorio.');
    if (!['image', 'video'].includes(input?.mediaType)) errors.push('mediaType debe ser image o video.');
    if (!/^https:\/\//i.test(input?.mediaUrl || '')) errors.push('mediaUrl debe ser una URL HTTPS pública accesible por Meta.');
    if (!input?.scheduledAt || Number.isNaN(Date.parse(input.scheduledAt))) errors.push('scheduledAt debe ser una fecha ISO válida.');
    if (input?.linkUrl) {
      try {
        const parsed = new URL(input.linkUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) errors.push('linkUrl debe utilizar HTTP o HTTPS.');
      } catch {
        errors.push('linkUrl no es una URL válida.');
      }
    }
    if (input?.linkUrl && !input?.linkLabel) errors.push('linkLabel es obligatorio cuando se proporciona linkUrl.');
    if (errors.length) {
      const error = new Error(errors.join(' '));
      error.statusCode = 400;
      throw error;
    }
  }

  async create(input) {
    this.validate(input);
    const accountId = input.accountId || instagramMultiAccountService.getCuentaActiva();
    const account = instagramMultiAccountService.getConfigParaCuenta(accountId);
    if (!account.accessToken || !account.igUserId) {
      const error = new Error(`La cuenta ${accountId} no tiene token o Instagram Business ID configurado.`);
      error.statusCode = 409;
      throw error;
    }

    this.ensureDirectory();
    const id = `story_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id,
      type: 'STORY',
      title: input.title.trim(),
      mediaType: input.mediaType,
      mediaUrl: input.mediaUrl,
      scheduledAt: new Date(input.scheduledAt).toISOString(),
      accountId,
      linkUrl: input.linkUrl || null,
      linkLabel: input.linkLabel || null,
      status: STATUSES.SCHEDULED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notificationSentAt: null,
      instagramMediaId: null,
      error: null
    };
    this.write(record);
    return record;
  }

  filePath(id) {
    if (!/^story_[a-zA-Z0-9_-]+$/.test(id)) {
      const error = new Error('ID de historia inválido.');
      error.statusCode = 400;
      throw error;
    }
    return path.join(this.baseDir, `${id}.json`);
  }

  write(record) {
    this.ensureDirectory();
    const target = this.filePath(record.id);
    const temp = `${target}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(record, null, 2), 'utf8');
    fs.renameSync(temp, target);
  }

  read(id) {
    const target = this.filePath(id);
    if (!fs.existsSync(target)) {
      const error = new Error('Historia no encontrada.');
      error.statusCode = 404;
      throw error;
    }
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  }

  list() {
    this.ensureDirectory();
    return fs.readdirSync(this.baseDir)
      .filter(name => /^story_[a-zA-Z0-9_-]+\.json$/.test(name))
      .map(name => JSON.parse(fs.readFileSync(path.join(this.baseDir, name), 'utf8')))
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }

  async publish(record) {
    const account = instagramMultiAccountService.getConfigParaCuenta(record.accountId);
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${account.igUserId}/media`;
    const params = new URLSearchParams({
      media_type: 'STORIES',
      [record.mediaType === 'video' ? 'video_url' : 'image_url']: record.mediaUrl,
      access_token: account.accessToken
    });
    const created = await axios.post(url, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 120000
    });
    const creationId = created.data?.id;
    if (!creationId) throw new Error('Meta no devolvió un ID de contenedor.');

    if (record.mediaType === 'video') {
      let ready = false;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const status = await axios.get(`https://graph.facebook.com/${GRAPH_VERSION}/${creationId}`, {
          params: { fields: 'status_code,status', access_token: account.accessToken },
          timeout: 30000
        });
        if (status.data?.status_code === 'FINISHED') { ready = true; break; }
        if (status.data?.status_code === 'ERROR') throw new Error(status.data.status || 'Meta no pudo procesar el video.');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      if (!ready) throw new Error('Tiempo agotado esperando el procesamiento del video.');
    }

    const published = await axios.post(
      `https://graph.facebook.com/${GRAPH_VERSION}/${account.igUserId}/media_publish`,
      new URLSearchParams({ creation_id: creationId, access_token: account.accessToken }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 60000 }
    );
    if (!published.data?.id) throw new Error('Meta no devolvió el ID de la historia publicada.');
    record.status = STATUSES.PUBLISHED;
    record.instagramMediaId = published.data.id;
    record.updatedAt = new Date().toISOString();
    record.error = null;
    this.write(record);
  }

  async notifyManualAction(record) {
    const sent = await sendActionToN8n({
      action: 'instagram_story_manual_action_required',
      payload: {
        id: record.id,
        title: record.title,
        mediaType: record.mediaType,
        mediaUrl: record.mediaUrl,
        accountId: record.accountId,
        linkUrl: record.linkUrl,
        linkLabel: record.linkLabel,
        scheduledAt: record.scheduledAt,
        instructions: 'Publicá esta historia desde Instagram y agregá el sticker de enlace con la URL y el texto indicados. La API oficial no permite crear ese sticker.'
      },
      textResponse: `La historia "${record.title}" está lista. Requiere agregar manualmente el sticker de enlace en Instagram.`
    });
    if (sent) {
      record.notificationSentAt = new Date().toISOString();
      record.updatedAt = record.notificationSentAt;
      this.write(record);
    }
  }

  async notifyPublishFailure(record) {
    const sent = await sendActionToN8n({
      action: 'instagram_story_publish_failed',
      payload: { id: record.id, title: record.title, accountId: record.accountId, error: record.error },
      textResponse: `Falló la publicación de la historia "${record.title}".`
    });
    if (sent) {
      record.notificationSentAt = new Date().toISOString();
      record.updatedAt = record.notificationSentAt;
      this.write(record);
    }
  }

  async processDue() {
    // Evita que dos ticks del cron procesen la misma historia en paralelo.
    if (this.processing) return;
    this.processing = true;
    try {
      const now = Date.now();
      for (const record of this.list()) {
      // Reintentar avisos que n8n no confirmó, sin volver a publicar el medio.
      if (record.status === STATUSES.MANUAL_ACTION_REQUIRED && !record.notificationSentAt) {
        await this.notifyManualAction(record);
        continue;
      }
      if (record.status === STATUSES.FAILED && !record.notificationSentAt) {
        await this.notifyPublishFailure(record);
        continue;
      }
      if (record.status !== STATUSES.SCHEDULED || Date.parse(record.scheduledAt) > now) continue;

      // Meta's official publishing API does not support the interactive link sticker.
      // Never publish a link-required story without its promised clickable sticker.
      if (record.linkUrl) {
        record.status = STATUSES.MANUAL_ACTION_REQUIRED;
        record.updatedAt = new Date().toISOString();
        record.notificationSentAt = null;
        this.write(record);
        await this.notifyManualAction(record);
        continue;
      }

      try {
        record.status = STATUSES.PROCESSING;
        record.updatedAt = new Date().toISOString();
        this.write(record);
        await this.publish(record);
      } catch (error) {
        record.status = STATUSES.FAILED;
        record.error = error.response?.data?.error?.message || error.message;
        record.notificationSentAt = null;
        record.updatedAt = new Date().toISOString();
        this.write(record);
        await this.notifyPublishFailure(record);
      }
      }
    } finally {
      this.processing = false;
    }
  }

  startScheduler() {
    if (this.started) return;
    this.started = true;
    cron.schedule('* * * * *', () => {
      this.processDue().catch(error => console.error('[Instagram Stories] Scheduler error:', error.message));
    });
  }

  markManualCompleted(id, instagramMediaId = null) {
    const record = this.read(id);
    if (record.status !== STATUSES.MANUAL_ACTION_REQUIRED) {
      const error = new Error('La historia no está esperando una acción manual.');
      error.statusCode = 409;
      throw error;
    }
    record.status = STATUSES.MANUALLY_PUBLISHED;
    record.instagramMediaId = instagramMediaId;
    record.updatedAt = new Date().toISOString();
    record.manualCompletedAt = record.updatedAt;
    this.write(record);
    return record;
  }
}

export { STATUSES };
export default new InstagramStoryService();
