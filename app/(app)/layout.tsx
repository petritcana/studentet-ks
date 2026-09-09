import { AppChrome } from "@/components/layout/app-chrome";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { meetsLevelTwo } from "@/lib/moderation";
import { levelFor } from "@/lib/xp";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const [enrollments, unreadNotifications, conversations] = await Promise.all([
    db.enrollment.findMany({
      where: { userId: user.id },
      select: { course: { select: { id: true, name: true, code: true } } },
      orderBy: { course: { name: "asc" } },
    }),
    db.notification.count({ where: { userId: user.id, isRead: false } }),
    db.conversationMember.findMany({
      where: { userId: user.id },
      select: {
        lastReadAt: true,
        conversation: {
          select: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { createdAt: true, authorId: true },
            },
          },
        },
      },
    }),
  ]);

  const unreadMessages = conversations.filter((member) => {
    const last = member.conversation.messages[0];
    return last && last.authorId !== user.id && last.createdAt > member.lastReadAt;
  }).length;

  const level = levelFor(user.xp);

  return (
    <AppChrome
      user={{
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        isModerator: user.role === "moderator" || user.role === "admin",
        canUseCampusVoice: meetsLevelTwo({
          createdAt: user.createdAt,
          isVerified: user.isVerified,
        }),
        level: {
          name: level.name,
          percent: level.percent,
          next: level.next,
          toNext: level.toNext,
        },
      }}
      courses={enrollments.map((item) => item.course)}
      unreadNotifications={unreadNotifications}
      unreadMessages={unreadMessages}
    >
      {children}
    </AppChrome>
  );
}
