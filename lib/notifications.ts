export const NOTIFICATION_CATEGORIES = [
  "academic",
  "social",
  "career",
  "groups",
  "materials",
  "xp",
  "pro",
  "competition",
  "system",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/** Maksimumi i push-eve ne ditë. Gjithcka tjetër rri brenda aplikacionit. */
export const MAX_PUSH_PER_DAY = 2;

/** Ora pas se ciles nuk dergohet push. Askush nuk do njoftime ne mesnate. */
export const QUIET_HOUR = 21;

export type Channel = "inApp" | "push" | "email";

export type ChannelSettings = Record<Channel, boolean>;

/** Parazgjedhjet: brenda aplikacionit po, push jo, email vetëm permbledhja javore. */
export const DEFAULT_CHANNELS: ChannelSettings = { inApp: true, push: false, email: false };

export type PushDecision = { send: boolean; reason?: "disabled" | "quota" | "quiet_hours" };

/**
 * A duhet derguar push tani.
 *
 * Tri kushte, te gjitha te domosdoshme: përdoruesi e ka ndezur, kuota ditore nuk
 * është mbushur, dhe nuk është oret e qetesise.
 */
export function shouldSendPush(input: {
  enabled: boolean;
  sentToday: number;
  hour: number;
}): PushDecision {
  if (!input.enabled) return { send: false, reason: "disabled" };
  if (input.sentToday >= MAX_PUSH_PER_DAY) return { send: false, reason: "quota" };
  if (input.hour >= QUIET_HOUR || input.hour < 8) return { send: false, reason: "quiet_hours" };
  return { send: true };
}

export type Groupable = {
  id: string;
  groupKey: string | null;
  actorName?: string | null;
  createdAt: string;
};

export type Grouped<T extends Groupable> = T & {
  /** Sa njoftime te tjera u bashkuan këtu. Zero do te thote një i vetëm. */
  others: number;
  /** Emrat e aktoreve, për rreshtin "Arta, Blerimi dhe 3 te tjere". */
  actors: string[];
};

export function groupNotifications<T extends Groupable>(items: T[]): Grouped<T>[] {
  const result: Grouped<T>[] = [];
  const index = new Map<string, number>();

  for (const item of items) {
    const key = item.groupKey;

    if (!key) {
      result.push({ ...item, others: 0, actors: item.actorName ? [item.actorName] : [] });
      continue;
    }

    const existing = index.get(key);
    if (existing === undefined) {
      index.set(key, result.length);
      result.push({ ...item, others: 0, actors: item.actorName ? [item.actorName] : [] });
      continue;
    }

    const target = result[existing];
    target.others += 1;
    if (item.actorName && !target.actors.includes(item.actorName)) {
      target.actors.push(item.actorName);
    }
  }

  return result;
}

/**
 * Teksti i aktoreve, si celes plus vlera.
 *
 * Kthen celesin e duhur që komponenti ta perktheje: kurrë një varg te gatshem,
 * sepse renditja e emrave ndryshon mes gjuheve.
 */
export function actorSummary(actors: string[]): {
  key: "one" | "two" | "many";
  values: Record<string, string | number>;
} {
  if (actors.length <= 1) return { key: "one", values: { name: actors[0] ?? "" } };
  if (actors.length === 2) return { key: "two", values: { first: actors[0], second: actors[1] } };
  return {
    key: "many",
    values: { first: actors[0], second: actors[1], count: actors.length - 2 },
  };
}
