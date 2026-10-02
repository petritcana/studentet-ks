import "server-only";

import { OpenAiCompatibleProvider } from "./openai-compatible";
import { MockAiProvider, type AiProvider } from "./provider";

/**
 * Ofruesi i vetëm i asistentit.
 *
 * Studenti nuk zgjedh model: përgjigjet Groq, përmes `OpenAiCompatibleProvider`.
 * Pa çelës, ose me `AI_PROVIDER="mock"`, mbetet demonstruesi, që e thotë hapur
 * nën kutinë e shkrimit se përgjigjet nuk vijnë nga një model.
 */
export function getAssistant(): { provider: AiProvider; live: OpenAiCompatibleProvider | null; label: string | null } {
  const chosen = (process.env.AI_PROVIDER ?? "").toLowerCase().trim();
  const live = new OpenAiCompatibleProvider();

  if (chosen === "mock" || !live.isAvailable()) {
    return { provider: new MockAiProvider(), live: null, label: null };
  }
  return { provider: live, live, label: live.label() };
}

/** Emri që shfaqet te koka e panelit, ose null kur asistenti është demonstrues. */
export function assistantLabel() {
  return getAssistant().label;
}
