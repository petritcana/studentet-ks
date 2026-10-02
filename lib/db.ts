import { Prisma, PrismaClient } from "@prisma/client";
import { dbMetricsEnabled, recordQuery } from "./db-metrics";
import { defaultAvatarFor } from "./default-avatar";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Për çdo model: fusha e relacionit dhe modeli ku të çon. */
const RELATIONS = new Map(
  Prisma.dmmf.datamodel.models.map((model) => [
    model.name,
    new Map(model.fields.filter((field) => field.kind === "object").map((field) => [field.name, field.type])),
  ]),
);

/**
 * Kudo ku lexohet `User.avatar` me `select`, lexohet edhe `gender`, që avatari i
 * parazgjedhur të dijë cilin të japë. Ndjek relacionet: `post.author.avatar` mbulohet.
 */
function selectGender(model: string, args: unknown) {
  if (!args || typeof args !== "object") return;
  const relations = RELATIONS.get(model);
  for (const key of ["select", "include"] as const) {
    const selection = (args as Record<string, unknown>)[key];
    if (!selection || typeof selection !== "object") continue;
    const fields = selection as Record<string, unknown>;
    if (key === "select" && model === "User" && fields.avatar === true && fields.gender === undefined) {
      fields.gender = true;
    }
    for (const [field, value] of Object.entries(fields)) {
      const related = relations?.get(field);
      if (related && value && typeof value === "object") selectGender(related, value);
    }
  }
}

function isPlain(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Plotëson avatarin që mungon me atë të gjinisë. Objektet mbeten të thjeshta. */
function fillAvatars(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) fillAvatars(item);
    return;
  }
  if (!isPlain(value)) return;
  if ("avatar" in value && "gender" in value && value.avatar == null) {
    value.avatar = defaultAvatarFor(value.gender as string | null);
  }
  for (const child of Object.values(value)) {
    if (child && typeof child === "object") fillAvatars(child);
  }
}

function createClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // Kush nuk ka foto merr avatarin e gjinisë së vet (`lib/default-avatar.ts`), në
  // çdo lexim, edhe brenda relacioneve. Në bazë `avatar` mbetet null. Bëhet me
  // shtrirje pyetjeje, jo me fushë të llogaritur: kjo e fundit u ngjit objekteve një
  // simbol, dhe React-i nuk i kalon ato te komponentët e klientit.
  const client = base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, args, query }) {
          selectGender(model, args);
          const result = await query(args);
          fillAvatars(result);
          return result;
        },
      },
    },
  }) as unknown as PrismaClient;

  if (!dbMetricsEnabled()) return client;

  // Matja rri jashtë rrugës normale: pa `DB_METRICS=1` klienti mbetet i paprekur.
  return client.$extends({
    query: {
      async $allOperations({ args, query }) {
        const started = Date.now();
        const result = await query(args);
        recordQuery(Date.now() - started);
        return result;
      },
    },
  }) as unknown as PrismaClient;
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** Fushat vargje ruhen si JSON sepse skema mbetet e bartshme mes SQLite dhe Postgres. */
export function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function serializeList(value: string[]): string {
  return JSON.stringify(value);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function parseNumbers(value: string | null | undefined): number[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "number") : [];
  } catch {
    return [];
  }
}
