/**
 * Kufizim i thjeshtë në kujtesë. Mjafton për një instancë; kur platforma të
 * kalojë në disa instanca, i njëjti ndërfaq zëvendësohet me Redis pa e prekur
 * kodin thirrës.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export const RATE_LIMITS = {
  post: { limit: 12, windowMs: 60 * 60 * 1000 },
  comment: { limit: 40, windowMs: 60 * 60 * 1000 },
  upload: { limit: 10, windowMs: 60 * 60 * 1000 },
  follow: { limit: 80, windowMs: 60 * 60 * 1000 },
  message: { limit: 120, windowMs: 60 * 60 * 1000 },
  report: { limit: 20, windowMs: 24 * 60 * 60 * 1000 },
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;

export type RateLimitKind = keyof typeof RATE_LIMITS;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMinutes: number;
};

export function rateLimit(kind: RateLimitKind, identifier: string): RateLimitResult {
  const { limit, windowMs } = RATE_LIMITS[kind];
  const key = `${kind}:${identifier}`;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMinutes: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMinutes: Math.max(1, Math.ceil((existing.resetAt - now) / 60000)),
    };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, retryAfterMinutes: 0 };
}

export function rateLimitMessage(result: RateLimitResult) {
  return `Po shkon shumë shpejt. Provo prapë pas ${result.retryAfterMinutes} minutash.`;
}
