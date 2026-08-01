import 'dotenv/config';

export const AI_PROVIDERS = {
  GROQ: {
    name: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    key: process.env.GROQ_API_KEY,
  },
  GEMINI: {
    name: 'gemini',
    url: (key, model) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    key: process.env.GEMINI_API_KEY,
  },
  OPENROUTER: {
    name: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
    key: process.env.OPENROUTER_API_KEY,
  },
};

const TIMEOUT_MS = 10000;

function withTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}

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

export const FALLBACK_TEXT =
  'Estoy teniendo problemas técnicos en este momento. Por favor, intentá nuevamente en unos segundos.';