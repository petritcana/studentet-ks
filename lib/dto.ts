/**
 * DTO-të e ekspozuara.
 *
 * Asnjë komponent dhe asnjë endpoint nuk merr rreshtin e papërpunuar të bazës:
 * emaili, hash-i i fjalëkalimit dhe identiteti prapa postimeve anonime nuk dalin
 * kurrë jashtë serverit.
 */

import type { MediaRef } from "@/lib/media";

export type PublicAuthor = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  isVerified: boolean;
  isPro: boolean;
  universityAbbr: string | null;
  facultyCode: string | null;
  facultyLabel: string | null;
  year: number | null;
};

export type PostAuthor =
  | {
      anonymous: false;
      profile: PublicAuthor;
      /** A e ndjek shikuesi. Pa këtë, butoni Ndiq nuk di çfarë te tregoje. */
      following: boolean;
    }
  | { anonymous: true; pseudonym: string };

export type PostDto = {
  id: string;
  type: string;
  scope: string;
  text: string;
  media: MediaRef[];
  createdAt: string;
  course: { id: string; name: string; facultyCode: string | null } | null;
  material: {
    id: string;
    title: string;
    type: string;
    pages: number | null;
    size: number;
    /** Lloji i skedarit, për etiketën e pllakës (PDF, DOCX, PPTX). */
    mimeType: string;
    rating: number;
    downloads: number;
    verificationStatus: string;
    /** Vendimi i shtresës së qasjes, që karta të dijë a e hap apo e mjegullon. */
    locked: boolean;
    facultyLabel: string | null;
  } | null;
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
    kind: string;
    goingCount: number;
  } | null;
  poll: {
    totalVotes: number;
    myOptionId: string | null;
    options: { id: string; text: string; votes: number }[];
  } | null;
  author: PostAuthor;
  counts: { likes: number; comments: number; saves: number; reposts: number };
  /** Numëruesi për çdo lloj reagimi. Mungesa e një çelësi do të thotë zero. */
  reactions: Record<string, number>;
  viewer: { reactions: string[]; saved: boolean; reposted: boolean; isAuthor: boolean };
  /** Veçuar nga autori me Pro: merr dukshmëri shtesë derisa t'i kalojë afati. */
  featured: boolean;
  /** I ngulur në krye të profilit të autorit. */
  pinned: boolean;
  /** Te një ripostim: postimi origjinal. */
  repostOf: PostDto | null;
};

type RawUser = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  isVerified: boolean;
  year: number | null;
  proEarnedUntil?: Date | null;
  subscriptions?: { status: string; expiresAt: Date }[];
  university?: { abbr: string } | null;
  faculty?: { name: string; nameEn: string; color: string } | null;
};

export function toPublicAuthor(user: RawUser, locale = "sq", now = new Date()): PublicAuthor {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    avatar: user.avatar,
    isVerified: user.isVerified,
    isPro:
      Boolean(user.proEarnedUntil && user.proEarnedUntil > now) ||
      (user.subscriptions ?? []).some(
        (item) => item.status === "active" && item.expiresAt > now,
      ),
    universityAbbr: user.university?.abbr ?? null,
    facultyCode: user.faculty?.color ?? null,
    facultyLabel: user.faculty ? (locale === "en" ? user.faculty.nameEn : user.faculty.name) : null,
    year: user.year,
  };
}

export type AdDto = {
  id: string;
  title: string;
  body: string;
  image: string | null;
  url: string;
  cta: string;
  advertiser: string;
};
