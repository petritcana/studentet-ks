const TITLE = /^(prof|dr|doc|ass|mr|msc|ing)\.?$/i;

/**
 * Emri i shkurtër mbi pllakat e storjeve: profesori me titull dhe mbiemër
 * («Prof. Berisha»), si i thërrasin studentët; të tjerët me emrin e parë.
 */
export function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1 && TITLE.test(parts[0])) {
    const person = parts.slice(1).filter((part) => !TITLE.test(part));
    return person.length > 0 ? `${parts[0]} ${person[person.length - 1]}` : parts[0];
  }
  return parts[0] ?? name;
}
