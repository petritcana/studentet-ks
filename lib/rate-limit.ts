/**
 * Kufizim shpejtësie në kujtesë.
 *
 * Mjafton për një instancë. Kur platforma të kalojë në disa, i njëjti ndërfaq
 * zëvendësohet me Redis pa e prekur kodin thirrës.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export const RATE_LIMITS = {
  post: { limit: 12, windowMs: 3_600_000 },
  comment: { limit: 40, windowMs: 3_600_000 },
  upload: { limit: 5, windowMs: 86_400_000 },
  // Fotot e një postimi nuk hyjne te kufiri i materialeve: një album i vetëm do
  // ta shteronte ditën e studentit. Numërohet çdo skedar, jo çdo copë e tij.
  media: { limit: 200, windowMs: 86_400_000 },
  // Hapja e dhomave kufizohet vecmas: spam-i i dhomave e ben zbulimin te padobishem.
  voiceRoom: { limit: 10, windowMs: 86_400_000 },
  follow: { limit: 80, windowMs: 3_600_000 },
  // Ftesat në dhomat e zërit: mjaft për një grup studimi, pak për të dërguar spam.
  voiceInvite: { limit: 40, windowMs: 3_600_000 },
  // Raportet e testuesve: mjaft për një seancë të gjatë testimi, pak për spam.
  feedback: { limit: 30, windowMs: 3_600_000 },
  passwordReset: { limit: 5, windowMs: 3_600_000 },
  message: { limit: 120, windowMs: 3_600_000 },
  report: { limit: 20, windowMs: 86_400_000 },
  register: { limit: 5, windowMs: 3_600_000 },
  // Kodet e emailit: mjaft sa të korrigjohet një gabim shkrimi, jo sa të mbushet
  // kutia e dikujt tjetër me kode që nuk i kërkoi.
  emailCode: { limit: 8, windowMs: 3_600_000 },
  ai: { limit: 200, windowMs: 86_400_000 },
  exchange: { limit: 6, windowMs: 86_400_000 },
} as const;

export type RateLimitKind = keyof typeof RATE_LIMITS;

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterMinutes: number };

export function rateLimitKey(value: string) {
  return value;
}

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
      retryAfterMinutes: Math.max(1, Math.ceil((existing.resetAt - now) / 60_000)),
    };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, retryAfterMinutes: 0 };
}

/** A ka arritur kufirin, pa e numëruar këtë kërkesë. Për rastet ku numërohen vetëm gabimet. */
export function isRateLimited(kind: RateLimitKind, identifier: string): boolean {
  const existing = buckets.get(`${kind}:${identifier}`);
  return Boolean(existing && existing.resetAt > Date.now() && existing.count >= RATE_LIMITS[kind].limit);
}
