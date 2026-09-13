import 'dotenv/config';

// Cliente mínimo da OpenRouter (API compatível OpenAI) com retry/backoff.
// Uso interno do agente de avaliação (só modelos :free).
// Docs: https://openrouter.ai/docs/api-reference/overview

const BASE_URL = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');

function cfg() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    const err = new Error('OPENROUTER_API_KEY não configurada.');
    err.code = 'AUTH';
    throw err;
  }
  return {
    key,
    model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free',
    timeoutMs: Number(process.env.OPENROUTER_TIMEOUT_MS) || 120000,
    maxRetries: Number(process.env.OPENROUTER_MAX_RETRIES) || 5,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function classificarErro(status, corpo) {
  const err = new Error(`OpenRouter ${status}: ${String(corpo?.error?.message || corpo?.message || '').slice(0, 300) || 'erro'}`);
  err.status = status;
  if (status === 401 || status === 403) err.code = 'AUTH';
  else if (status === 429) err.code = 'RATE';
  else if (status >= 500 || status === 408) err.code = 'TRANSIENT';
  else err.code = 'FATAL';
  return err;
}

export async function chat({ messages, model, maxTokens }) {
  const { key, model: defaultModel, timeoutMs } = cfg();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5173',
        'X-Title': process.env.OPENROUTER_APP_TITLE || 'SGOA',
      },
      body: JSON.stringify({
        model: model || defaultModel,
        messages,
        max_tokens: maxTokens || 2500,
      }),
    });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) {
      const e = classificarErro(res.status, corpo);
      const retryAfter = Number(res.headers.get('retry-after'));
      if (Number.isFinite(retryAfter) && retryAfter > 0) e.retryAfterMs = retryAfter * 1000;
      throw e;
    }
    const texto = corpo?.choices?.[0]?.message?.content?.trim();
    if (!texto) {
      const err = new Error('OpenRouter retornou resposta vazia.');
      err.code = 'TRANSIENT';
      throw err;
    }
    return texto;
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error(`OpenRouter timeout após ${timeoutMs}ms.`);
      e.code = 'TRANSIENT';
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Retry com backoff exponencial. 429 respeita Retry-After; AUTH/FATAL não retentam.
export async function chatComRetry(args, { maxRetries, onRetry } = {}) {
  const limite = maxRetries ?? Number(process.env.OPENROUTER_MAX_RETRIES) ?? 5;
  let tentativa = 0;
  for (;;) {
    try {
      return await chat(args);
    } catch (err) {
      tentativa += 1;
      if (err.code === 'AUTH' || err.code === 'FATAL' || tentativa > limite) throw err;
      const retryAfter = Number(err.retryAfterMs);
      const espera = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : Math.min(2000 * 2 ** (tentativa - 1), 60000);
      onRetry?.({ tentativa, esperaMs: espera, erro: err.message });
      await sleep(espera);
    }
  }
}
