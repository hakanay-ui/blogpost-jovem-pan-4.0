// Retry com exponential backoff para chamadas HTTP externas (Perplexity, Lovable AI, RSS).
// Usa Retry-After quando presente em 429.

export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: (attempt: number, error: unknown) => boolean;
};

const DEFAULTS: Required<Pick<RetryOptions, "maxAttempts" | "baseDelayMs" | "maxDelayMs">> = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs } = { ...DEFAULTS, ...opts };
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;
      if (opts.retryOn && !opts.retryOn(attempt, err)) break;
      const jitter = Math.random() * 250;
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1) + jitter, maxDelayMs);
      console.warn(`[retry] attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(delay)}ms`, err);
      await sleep(delay);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// Wrapper para fetch que trata 5xx/429 como retriable e respeita Retry-After.
export async function fetchWithRetry(
  input: string | URL,
  init?: RequestInit,
  opts: RetryOptions = {},
): Promise<Response> {
  const { maxAttempts, baseDelayMs, maxDelayMs } = { ...DEFAULTS, ...opts };
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(input, init);
      if (res.status === 429 || res.status >= 500) {
        if (attempt === maxAttempts) return res;
        const retryAfter = res.headers.get("retry-after");
        const serverDelay = retryAfter ? Number(retryAfter) * 1000 : null;
        const jitter = Math.random() * 250;
        const backoff = Math.min(baseDelayMs * 2 ** (attempt - 1) + jitter, maxDelayMs);
        const delay = Number.isFinite(serverDelay) && serverDelay! > 0 ? serverDelay! : backoff;
        console.warn(`[fetchWithRetry] ${res.status} ${input} — retry ${attempt}/${maxAttempts} em ${Math.round(delay)}ms`);
        await sleep(delay);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;
      const jitter = Math.random() * 250;
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1) + jitter, maxDelayMs);
      console.warn(`[fetchWithRetry] network error — retry ${attempt}/${maxAttempts} em ${Math.round(delay)}ms`, err);
      await sleep(delay);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
