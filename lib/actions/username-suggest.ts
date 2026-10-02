"use server";

import { nextFreeUsername } from "@/lib/queries/username";
import { normalizeUsername, usernameBaseFromFullName } from "@/lib/username";

/**
 * Emri i përdoruesit që do të merrte studenti, pa krijuar asgjë.
 *
 * Nga emri i plotë (ose pjesa para @ kur emri nuk mjafton). Kur baza është e
 * zënë, kthehet varianti i lirë i radhës, p.sh. petrit.cana2, bashkë me bazën
 * që faqja ta thotë hapur.
 */
export async function suggestUsername(name: string, email: string): Promise<{ base: string; username: string }> {
  const cleanName = name.trim().slice(0, 80);
  const cleanEmail = email.trim().slice(0, 120);
  const base = normalizeUsername(usernameBaseFromFullName(cleanName, cleanEmail));
  const username = await nextFreeUsername(base);
  return { base, username };
}
