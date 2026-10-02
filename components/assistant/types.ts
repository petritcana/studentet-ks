import type { AiSource } from "@/lib/ai/types";

/** Një radhë në panel: pyetja ose përgjigjja, me imazhet dhe burimet e saj. */
export type Turn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: AiSource[];
  /** Id-të e imazheve te `/api/media`. */
  images: string[];
  /** Parapamjet lokale, që imazhi të shfaqet menjëherë, para se të vijë nga serveri. */
  previews?: string[];
  createdAt: string;
  /** Pyetja që nuk mori përgjigje: shfaqet me butonin «Provo përsëri». */
  failed?: boolean;
};

/** Një rresht te historiku. */
export type ConversationItem = {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
  previewRole: string | null;
  previewImage: boolean;
};

/** Imazhi i zgjedhur te kutia e shkrimit, para dhe pas ngarkimit. */
export type PendingImage = {
  key: string;
  preview: string;
  /** Id-ja pas ngarkimit. Pa të, dërgimi pret. */
  id: string | null;
  progress: number;
  failed?: boolean;
};
