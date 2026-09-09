import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Pin, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PostCard } from "@/components/feed/post-card";
import { GroupJoinButton } from "@/components/social/group-join-button";
import { UserRow } from "@/components/social/user-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { db, parseList } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { toPublicAuthor, type PostDto } from "@/lib/dto";
import { facultyTheme } from "@/lib/faculties";
import { MATERIAL_TYPE_LABELS, type MaterialType } from "@/lib/constants";
import { formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Grupi" };
export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const group = await db.group.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      type: true,
      privacy: true,
      description: true,
      facultyKey: true,
      courseId: true,
      course: { select: { id: true, name: true, code: true, professor: true } },
      members: {
        select: {
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              isVerified: true,
              year: true,
              faculty: { select: { name: true, color: true } },
            },
          },
        },
        take: 30,
      },
      _count: { select: { members: true } },
    },
  });

  if (!group) notFound();

  const isMember = group.members.some((member) => member.user.id === user.id);
  const theme = facultyTheme(group.facultyKey);

  const [posts, pastExams, following] = await Promise.all([
    db.post.findMany({
      where: group.courseId
        ? { OR: [{ groupId: group.id }, { courseId: group.courseId }], isHidden: false }
        : { groupId: group.id, isHidden: false },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            isVerified: true,
            year: true,
            faculty: { select: { name: true, color: true } },
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            department: { select: { faculty: { select: { color: true } } } },
          },
        },
      },
    }),
    group.courseId
      ? db.material.findMany({
          where: {
            courseId: group.courseId,
            type: { in: ["past_exam", "solved"] },
            isHidden: false,
          },
          orderBy: { academicYear: "desc" },
          take: 6,
          select: {
            id: true,
            title: true,
            type: true,
            academicYear: true,
            downloads: true,
            verificationStatus: true,
          },
        })
      : Promise.resolve([]),
    db.reaction.findMany({
      where: { userId: user.id },
      select: { postId: true },
    }),
  ]);

  const likedIds = new Set(following.map((item) => item.postId));

  const dtos: PostDto[] = posts.map((post) => ({
    id: post.id,
    type: post.type,
    text: post.text,
    media: parseList(post.media),
    createdAt: post.createdAt.toISOString(),
    courseId: post.courseId,
    course: post.course
      ? {
          id: post.course.id,
          name: post.course.name,
          code: post.course.code,
          facultyColor: post.course.department.faculty.color,
        }
      : null,
    material: null,
    event: null,
    poll: null,
    author: post.isAnonymous
      ? { anonymous: true, profile: { pseudonym: post.pseudonym ?? "Studenti anonim" } }
      : { anonymous: false, profile: toPublicAuthor(post.author) },
    counts: { likes: post.likeCount, comments: post.commentCount, saves: post.saveCount },
    viewer: {
      liked: likedIds.has(post.id),
      saved: false,
      isAuthor: post.authorId === user.id,
    },
    isHidden: post.isHidden,
  }));

  const typeLabel =
    group.type === "course" ? "Kanal lënde" : group.type === "generation" ? "Gjeneratë" : "Grup";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={group.name} back="/kampusi?tab=grupet" />

      <Card className="overflow-hidden">
        <div className={cn("h-16 bg-linear-to-br", theme.gradient)} aria-hidden />
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn(theme.bg, theme.text, theme.border)}>{typeLabel}</Badge>
              <span className="tabular inline-flex items-center gap-1 text-xs text-text-muted">
                <Users className="size-3" />
                {group._count.members} anëtarë
              </span>
              {group.privacy === "request" ? <Badge variant="warning">Me kërkesë</Badge> : null}
            </div>
            <GroupJoinButton groupId={group.id} isMember={isMember} privacy={group.privacy} />
          </div>

          {group.description ? (
            <p className="measure text-sm text-text-muted">{group.description}</p>
          ) : null}

          {group.course ? (
            <Link
              href={`/lenda/${group.course.id}`}
              className="w-fit text-sm font-medium text-brand-500 hover:underline"
            >
              Shiko lëndën {group.course.name} ({group.course.code})
            </Link>
          ) : null}
        </div>
      </Card>

      {pastExams.length > 0 ? (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Pin className="size-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-text">Provimet e kaluara</h2>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Të fiksuara lart, sepse këtu i kërkon çdo gjeneratë.
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {pastExams.map((exam) => (
              <li key={exam.id}>
                <Link
                  href={`/materialet/${exam.id}`}
                  className="flex items-center gap-3 py-2.5 first:pt-0"
                >
                  <FileText className="size-4 shrink-0 text-text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text">{exam.title}</span>
                    <span className="block truncate text-xs text-text-muted">
                      {MATERIAL_TYPE_LABELS[exam.type as MaterialType]} · viti akademik{" "}
                      {exam.academicYear}
                    </span>
                  </span>
                  {exam.verificationStatus === "verified" ? (
                    <Badge variant="success">I verifikuar</Badge>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">Biseda</h2>
        {dtos.length === 0 ? (
          <EmptyState
            illustration="feed"
            title="Këtu s'ka nisur ende biseda"
            description="Nis ti me një pyetje ose me shënimet e ligjëratës së fundit."
          />
        ) : (
          dtos.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </section>

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-text">Anëtarët</h2>
        <div className="mt-3 flex flex-col gap-3">
          {group.members.slice(0, 12).map((member) => (
            <UserRow
              key={member.user.id}
              person={{
                id: member.user.id,
                name: member.user.name,
                username: member.user.username,
                avatar: member.user.avatar,
                isVerified: member.user.isVerified,
                facultyName: member.user.faculty?.name ?? null,
                facultyColor: member.user.faculty?.color ?? null,
                year: member.user.year,
              }}
              action={
                member.role !== "member" ? (
                  <Badge variant="brand">
                    {member.role === "owner" ? "Krijues" : "Moderator"}
                  </Badge>
                ) : undefined
              }
            />
          ))}
        </div>
        {group._count.members > 12 ? (
          <p className="mt-3 text-xs text-text-muted">
            Edhe {group._count.members - 12} anëtarë të tjerë.
          </p>
        ) : null}
      </Card>

      <p className="text-xs text-text-muted">
        Grupi u krijua për vitin akademik aktual. Materialet e fiksuara ruhen edhe pas{" "}
        {formatDateShort(new Date())}.
      </p>
    </div>
  );
}
