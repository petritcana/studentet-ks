/** Prania: online, i larguar, jashtë linje. */

/** Sa shpesh e njofton shfletuesi serverin se studenti është ende aty. */
export const HEARTBEAT_SECONDS = 60;

/** Aktiv brenda këtij afati do të thotë online. */
export const ONLINE_WINDOW_SECONDS = 90;

/** Mes online-it dhe jashtë linje: i larguar, ende në shfletues por jo aktiv. */
export const AWAY_WINDOW_SECONDS = 10 * 60;

export type PresenceStatus = "online" | "away" | "offline";

/**
 * Statusi nga koha e fundit e parë.
 *
 * Dritarja e online-it është pak më e gjerë se rrahja, që një rrahje e vonuar nga
 * rrjeti të mos e nxjerrë studentin jashtë linje për një sekondë.
 */
export function presenceStatus(lastSeenAt: Date | null, now: Date = new Date()): PresenceStatus {
  if (!lastSeenAt) return "offline";

  const seconds = (now.getTime() - lastSeenAt.getTime()) / 1000;
  if (seconds < 0) return "online";
  if (seconds <= ONLINE_WINDOW_SECONDS) return "online";
  if (seconds <= AWAY_WINDOW_SECONDS) return "away";
  return "offline";
}

/** Cilësimet që e vendosin se çfarë sheh tjetri. */
export type PresencePrivacy = {
  showOnlineStatus: boolean;
  showLastActive: boolean;
};

export type VisiblePresence = {
  status: PresenceStatus;
  /** Koha e fundit e parë, vetëm kur studenti e ka lejuar ta shohin. */
  lastSeenAt: Date | null;
};

/** Çfarë lejohet të shfaqet për këtë person. */
export function visiblePresence(
  person: { lastSeenAt: Date | null } & PresencePrivacy,
  now: Date = new Date(),
): VisiblePresence {
  if (!person.showOnlineStatus) return { status: "offline", lastSeenAt: null };

  return {
    status: presenceStatus(person.lastSeenAt, now),
    lastSeenAt: person.showLastActive ? person.lastSeenAt : null,
  };
}


/**
 * Kufiri i dritares së online-it, si datë.
 *
 * Query-të e përdorin për të kërkuar «i parë pas kësaj kohe», prandaj llogaritja
 * rri këtu, pranë pragjeve, dhe kurrë e shkruar me dorë te një query.
 */
export function onlineSince(now: Date = new Date()): Date {
  return new Date(now.getTime() - ONLINE_WINDOW_SECONDS * 1000);
}
