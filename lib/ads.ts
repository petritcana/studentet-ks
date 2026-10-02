/** Hash i qendrueshem, i njejti ne server dhe ne klient. */
function hash(seed: string): number {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value);
}

/** Dita si varg, që zgjedhja te nderrohet një here ne ditë dhe jo me shpesh. */
export function dayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Cilen reklame te shfaqe ky përdorues sot, te kjo vendndodhje.
 *
 * Kthen te njejtin indeks për te njejtin përdorues, ditën dhe vendndodhjen,
 * prandaj rifreskimi i faqes nuk e nderron reklamen.
 */
export function pickIndex(
  count: number,
  seed: { userId: string; placement: string; day?: string },
): number {
  if (count <= 0) return -1;
  return hash(`${seed.userId}:${seed.placement}:${seed.day ?? dayKey()}`) % count;
}
