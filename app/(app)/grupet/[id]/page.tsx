import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarClock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { GroupCard } from "@/components/campus/group-card";
import { GroupComposer } from "@/components/campus/group-composer";
import { PostCard } from "@/components/feed/post-card";
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import { db } from "@/lib/db";
import { toPublicAuthor } from "@/lib/dto";
import { formatDate } from "@/lib/format";
import { getPostById } from "@/lib/queries/feed";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const group = await db.group.findUnique({ where: { id }, select: { name: true } });
  return { title: group?.name ?? "" };
}

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me, locale] = await Promise.all([params, requireUser(), getLocale()]);
  const english = locale === "en";

  const group = await db.group.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      nameEn: true,
      type: true,
      privacy: true,
      description: true,
      facultyKey: true,
      courseId: true,
      course: {
        select: {
          id: true,
          name: true,
          nameEn: true,
          examDates: {
            where: { date: { gte: new Date() } },
            orderBy: { date: "asc" },
            take: 3,
            select: { id: true, date: true, term: true, room: true },
          },
        },
      },
      members: {
        take: 24,
        orderBy: { joinedAt: "asc" },
        select: {
          role: true,
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              isVerified: true,
              year: true,
              proEarnedUntil: true,
              university: { select: { abbr: true } },
              faculty: { select: { name: true, nameEn: true, color: true } },
              subscriptions: {
                where: { status: "active" },
                select: { status: true, expiresAt: true },
              },
            },
          },
        },
      },
      _count: { select: { members: true } },
      posts: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true },
      },
    },
  });
  if (!group) notFound();

  const [t, tsch] = await Promise.all([getTranslations("campus"), getTranslations("schedule")]);

  const myRole = group.members.find((member) => member.userId === me.id)?.role ?? null;
  const posts = await Promise.all(
    group.posts.map((post) => getPostById(me.access, post.id, locale)),
  );

  const ownFaculty =
    (english ? me.faculty?.nameEn : me.faculty?.name) ?? me.university?.abbr ?? "";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <GroupCard
        group={{
          id: group.id,
          name: english ? group.nameEn : group.name,
          type: group.type,
          privacy: group.privacy,
          description: group.description,
          facultyCode: group.facultyKey,
          memberCount: group._count.members,
          membership: myRole === "pending" ? "pending" : myRole ? "member" : null,
        }}
      />

      {group.course && group.course.examDates.length > 0 ? (
        <Card className="flex flex-col gap-2 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-text">
            <CalendarClock className="size-4 text-brand-500" />
            {t("pinnedExams")}
          </p>
          <p className="text-xs text-text-muted">{t("pinnedExamsBody")}</p>

          <ul className="flex flex-col gap-1.5">
            {group.course.examDates.map((exam) => (
              <li key={exam.id} className="flex items-center gap-3 text-sm">
                <span className="tabular w-28 shrink-0 text-text-muted">
                  {formatDate(exam.date, locale)}
                </span>
                <Badge variant="warning">{tsch("exam")}</Badge>
                <span className="text-xs text-text-muted">{exam.term}</span>
                {exam.room ? <span className="text-text-muted">{exam.room}</span> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
          <Users className="size-4 text-brand-500" />
          {t("members", { count: group._count.members })}
        </h2>

        <div className="grid gap-2 sm:grid-cols-2">
          {group.members.slice(0, 12).map((member) => (
            <UserIdentityLine
              key={member.userId}
              user={toPublicAuthor(member.user, locale)}
              size="sm"
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">{t("discussion")}</h2>

        {/* Shkruan vetëm anëtari: te një grup me kërkesë, pritja do të thotë pritje. */}
        {myRole === "member" || myRole === "owner" ? (
          <GroupComposer groupId={group.id} me={{ name: me.name, avatar: me.avatar }} />
        ) : null}

        {posts.filter(Boolean).length === 0 ? (
          <EmptyState illustration="feed" compact title={t("noDiscussion")} />
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post) =>
              post ? (
                <PostCard key={post.id} post={post} ownFaculty={ownFaculty} isPro={me.pro} />
              ) : null,
            )}
          </div>
        )}
      </section>
    </div>
  );
}
