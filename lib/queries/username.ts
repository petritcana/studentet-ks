import { db } from "@/lib/db";
import { normalizeUsername, usernameVariant } from "@/lib/username";

/**
 * Gjen një emër përdoruesi të lirë dhe e rezervon duke krijuar përdoruesin.
 *
 * Dy studentë që regjistrohen në të njëjtin çast mund ta gjejnë të njëjtin emër
 * të lirë, prandaj kontrolli nuk mjafton: krijimi provohet vërtet dhe, kur baza
 * e refuzon si të dyfishtë, provohet varianti tjetër. Uniciteti mbrohet nga
 * kufizimi i bazës, jo nga shpresa.
 */
export async function createWithUniqueUsername<T>(
  base: string,
  create: (username: string) => Promise<T>,
  maxAttempts = 30,
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const username = normalizeUsername(usernameVariant(base, attempt));

    const taken = await db.user.findFirst({ where: { username }, select: { id: true } });
    if (taken) continue;

    try {
      return await create(username);
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }

  // Pas tridhjetë provash, emri i bazës është i papërdorshëm. Një prapashtesë e
  // rastësishme është zgjidhja e fundit, jo e para.
  return create(normalizeUsername(`${base}.${Math.random().toString(36).slice(2, 6)}`));
}

/** Emri i lirë i radhës, pa krijuar asgjë. Përdoret te migrimi i llogarive të vjetra. */
export async function nextFreeUsername(base: string, taken: Set<string> = new Set()): Promise<string> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = normalizeUsername(usernameVariant(base, attempt));
    if (taken.has(candidate)) continue;
    const exists = await db.user.findFirst({ where: { username: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return normalizeUsername(`${base}.${Math.random().toString(36).slice(2, 6)}`);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
