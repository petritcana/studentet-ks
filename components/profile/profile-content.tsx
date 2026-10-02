import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Bookmark, FileStack, Grid3x3, Repeat2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PostCard } from "@/components/feed/post-card";
import { MaterialRow } from "@/components/materials/material-row";
import { db } from "@/lib/db";
import { getPostsByIds, getProfilePosts } from "@/lib/queries/feed";
import { getProfileMaterials } from "@/lib/queries/profile";
import type { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * Skedat e profilit, si te Instagram: një rresht horizontal me ikonë dhe emër.
 *
 * Postime (të vetat), Riposte, Të ruajtura (vetëm pronari i sheh) dhe Materiale.
 * Media dhe Rreth u hoqën: fotot dalin te postimet, dhe konteksti akademik e
 * badge-t rrinë te koka e profilit.
 */
export const PROFILE_TABS = ["postimet", "riposte", "ruajtura", "materialet"] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

export function profileTabFrom(value: string | undefined, isMe: boolean): ProfileTab {
  const tab = PROFILE_TABS.includes(value as ProfileTab) ? (value as ProfileTab) : "postimet";
  // Të ruajturat janë private: kush nuk është pronari bie te postimet.
  return tab === "ruajtura" && !isMe ? "postimet" : tab;
}

type Viewer = Awaited<ReturnType<typeof requireUser>>;

const ICONS = { postimet: Grid3x3, riposte: Repeat2, ruajtura: Bookmark, materialet: FileStack } as const;

export async function ProfileContent({
  viewer,
  ownerId,
  isMe,
  tab,
  base,
  locale,
}: {
  viewer: Viewer;
  ownerId: string;
  isMe: boolean;
  tab: ProfileTab;
  /** Adresa e faqes: `/une` për veten, `/u/emri` për të tjerët. */
  base: string;
  locale: string;
}) {
  const t = await getTranslations("profile");
  const tabs = PROFILE_TABS.filter((value) => value !== "ruajtura" || isMe);

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label={t("tabsLabel")} className="border-b border-border" data-profile-tabs>
        <ul className="-mb-px flex">
          {tabs.map((value) => {
            const Icon = ICONS[value];
            const active = value === tab;
            return (
              <li key={value} className="flex-1">
                <Link
                  href={value === "postimet" ? base : `${base}?tab=${value}`}
                  aria-current={active ? "page" : undefined}
                  scroll={false}
                  className={cn(
                    "flex items-center justify-center gap-2 border-b-2 px-2 py-3 text-xs font-semibold uppercase tracking-[0.06em] transition-colors duration-150 sm:text-[13px]",
                    active ? "border-text text-text" : "border-transparent text-text-muted hover:text-text",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="hidden sm:inline">{t(`tab_${value}`)}</span>
                  <span className="sr-only sm:hidden">{t(`tab_${value}`)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {tab === "postimet" || tab === "riposte" ? (
        <PostsList viewer={viewer} ownerId={ownerId} locale={locale} kind={tab === "riposte" ? "reposts" : "original"} isMe={isMe} />
      ) : null}
      {tab === "ruajtura" && isMe ? <SavedList viewer={viewer} locale={locale} /> : null}
      {tab === "materialet" ? <MaterialsList viewer={viewer} ownerId={ownerId} locale={locale} /> : null}
    </div>
  );
}

async function PostsList({
  viewer,
  ownerId,
  locale,
  kind,
  isMe,
}: {
  viewer: Viewer;
  ownerId: string;
  locale: string;
  kind: "original" | "reposts";
  isMe: boolean;
}) {
  const [{ posts }, t] = await Promise.all([
    getProfilePosts(viewer.access, ownerId, locale, { take: 20, kind }),
    getTranslations("profile"),
  ]);

  if (posts.length === 0) {
    const title = kind === "reposts" ? t(isMe ? "noRepostsOwn" : "noReposts") : t(isMe ? "noPostsOwn" : "noPosts");
    return <EmptyState illustration="feed" compact title={title} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} ownFaculty="" isPro={viewer.pro} />
      ))}
    </div>
  );
}

/** Postimet e ruajtura: vetëm pronari i sheh, prandaj thirret vetëm kur `isMe`. */
async function SavedList({ viewer, locale }: { viewer: Viewer; locale: string }) {
  const [bookmarks, t] = await Promise.all([
    db.bookmark.findMany({
      where: { userId: viewer.id, targetType: "post" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { targetId: true },
    }),
    getTranslations("profile"),
  ]);
  const posts = await getPostsByIds(viewer.access, bookmarks.map((row) => row.targetId), locale);

  if (posts.length === 0) {
    return <EmptyState illustration="feed" compact title={t("noSaved")} description={t("noSavedBody")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-text-muted">{t("savedPrivate")}</p>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} ownFaculty="" isPro={viewer.pro} />
      ))}
    </div>
  );
}

async function MaterialsList({ viewer, ownerId, locale }: { viewer: Viewer; ownerId: string; locale: string }) {
  const [materials, t] = await Promise.all([getProfileMaterials(viewer.access, ownerId, locale), getTranslations("profile")]);

  if (materials.length === 0) {
    return <EmptyState illustration="materials" compact title={t("noMaterials")} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {materials.map((material) => (
        <MaterialRow key={material.id} material={material} />
      ))}
    </div>
  );
}
