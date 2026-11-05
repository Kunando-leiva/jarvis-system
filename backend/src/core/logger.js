// backend/src/core/logger.js
// Sistema de logs centralizado con trazabilidad

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// Configuración de niveles
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

// Colores para consola
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  debug: 'gray',
  trace: 'magenta',
};

winston.addColors(colors);

// Formato personalizado con traceId
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format((info) => {
    // Asegurar que traceId esté presente
    if (!info.traceId) {
      info.traceId = global.traceId || 'no-trace';
    }
    return info;
  })(),
  winston.format.printf(({ timestamp, level, message, traceId, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${traceId}] ${level.toUpperCase()}: ${message}${metaStr}`;
  })
);

// Crear el logger
export const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { service: 'jarvis-system' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        customFormat
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.uncolorize(),
        customFormat
      ),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.uncolorize(),
        customFormat
      ),
    }),
  ],
});

// Función para crear un contexto con traceId
export function createTraceContext() {
  const traceId = uuidv4();
  global.traceId = traceId;
  return { traceId };
}

// Función para ejecutar con traceId
export async function withTraceContext(fn) {
  const context = createTraceContext();
  try {
    return await fn(context);
  } finally {
    global.traceId = null;
  }
}

// Exportar métodos helper
export const log = {
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  trace: (message, meta = {}) => logger.trace(message, meta),
};

export default logger;