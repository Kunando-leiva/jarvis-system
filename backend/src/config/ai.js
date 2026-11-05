// backend/src/core/aiProvider.js
import 'dotenv/config';

export const AI_PROVIDERS = {
  GROQ: {
    name: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
    key: process.env.GROQ_API_KEY,
  },
  GEMINI: {
    name: 'gemini',
    url: (key, model) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    key: process.env.GEMINI_API_KEY,
  },
  OPENROUTER: {
    name: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: process.env.OPENROUTER_MODEL || 'llama-3.1-8b-instant',
    key: process.env.OPENROUTER_API_KEY,
  },
  // ✅ NUEVO: OLLAMA (local, sin límites)
  OLLAMA: {
    name: 'ollama',
    url: process.env.OLLAMA_URL || 'http://localhost:11434/api/chat',
    model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
    key: null, // No necesita API key
  },
};

const TIMEOUT_MS = 30000; // Aumentado para Ollama (puede ser más lento)

function withTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}

// ─── GROQ ──────────────────────────────────────────────────────
export async function callGroq(message, systemPrompt = '') {
  const cfg = AI_PROVIDERS.GROQ;
  if (!cfg.key) throw new Error('GROQ_API_KEY no configurada');

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: message });

  const { signal, clear } = withTimeout(TIMEOUT_MS);
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: 0.7,
      }),
      signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Groq error ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Groq: respuesta vacía');
    return text;
  } finally {
    clear();
  }
}

// ─── GEMINI ────────────────────────────────────────────────────
export async function callGemini(message, systemPrompt = '') {
  const cfg = AI_PROVIDERS.GEMINI;
  if (!cfg.key) throw new Error('GEMINI_API_KEY no configurada');

  const body = {
    contents: [{ parts: [{ text: message }] }],
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const { signal, clear } = withTimeout(TIMEOUT_MS);
  try {
    const res = await fetch(cfg.url(cfg.key, cfg.model), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini error ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini: respuesta vacía');
    return text;
  } finally {
    clear();
  }
}

// ─── OPENROUTER ────────────────────────────────────────────────
export async function callOpenRouter(message, systemPrompt = '') {
  const cfg = AI_PROVIDERS.OPENROUTER;
  if (!cfg.key) throw new Error('OPENROUTER_API_KEY no configurada');

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: message });

  const { signal, clear } = withTimeout(TIMEOUT_MS);
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
      }),
      signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenRouter: respuesta vacía');
    return text;
  } finally {
    clear();
  }
}

// ─── ✅ NUEVO: OLLAMA (local, sin límites) ────────────────────
export async function callOllama(message, systemPrompt = '') {
  const cfg = AI_PROVIDERS.OLLAMA;

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: message });

  const { signal, clear } = withTimeout(TIMEOUT_MS);
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        stream: false,
        options: {
          temperature: 0.7,
        },
      }),
      signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Ollama error ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const text = data?.message?.content;
    if (!text) throw new Error('Ollama: respuesta vacía');
    return text;
  } finally {
    clear();
  }
}

// ─── PROVIDER ROUTER ──────────────────────────────────────────
export async function callAI(message, systemPrompt = '', provider = null) {
  // Si no se especifica provider, usar el que está en .env o fallback
  const selectedProvider = provider || process.env.AI_PROVIDER || 'groq';

  // Si hay rate limit o error, intentar con el siguiente
  const providers = [selectedProvider, 'ollama', 'groq', 'openrouter', 'gemini'];
  const uniqueProviders = [...new Set(providers)];

  let lastError = null;

  for (const providerName of uniqueProviders) {
    try {
      switch (providerName) {
        case 'ollama':
          return await callOllama(message, systemPrompt);
        case 'groq':
          return await callGroq(message, systemPrompt);
        case 'openrouter':
          return await callOpenRouter(message, systemPrompt);
        case 'gemini':
          return await callGemini(message, systemPrompt);
        default:
          continue;
      }
    } catch (error) {
      lastError = error;
      console.warn(`[AIProvider] Error con ${providerName}:`, error.message);
      // Si es Ollama y falla, continuar con el siguiente
      if (providerName === 'ollama') continue;
      // Si es rate limit (429), pasar al siguiente
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        continue;
      }
      // Si es error de créditos (402), pasar al siguiente
      if (error.message.includes('402') || error.message.includes('credits')) {
        continue;
      }
      // Para otros errores, esperar a que falle todo
      continue;
    }
  }

  // Si todos fallaron, devolver el mensaje de fallback
  console.error('[AIProvider] Todos los proveedores fallaron:', lastError?.message);
  return FALLBACK_TEXT;
}

export const FALLBACK_TEXT =
  'Estoy teniendo problemas técnicos en este momento. Por favor, intentá nuevamente en unos segundos.';