import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Duhet të jesh i kyçur." }, { status: 401 });

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      type: true,
      text: true,
      context: true,
      isRead: true,
      createdAt: true,
      targetId: true,
      actor: {
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
  });

  // Cilat prej tyre i ndjek tashmë, që butoni "Ndiqe edhe ti" të mos shfaqet kot.
  const actorIds = notifications
    .map((item) => item.actor?.id)
    .filter((id): id is string => Boolean(id));
  const following = await db.follow.findMany({
    where: { followerId: user.id, followingId: { in: actorIds } },
    select: { followingId: true },
  });
  const followingSet = new Set(following.map((item) => item.followingId));

  return NextResponse.json({
    unread: notifications.filter((item) => !item.isRead).length,
    items: notifications.map((item) => ({
      id: item.id,
      type: item.type,
      text: item.text,
      context: item.context,
      isRead: item.isRead,
      createdAt: item.createdAt.toISOString(),
      targetId: item.targetId,
      actor: item.actor
        ? {
            id: item.actor.id,
            name: item.actor.name,
            username: item.actor.username,
            avatar: item.actor.avatar,
            isVerified: item.actor.isVerified,
            faculty: item.actor.faculty
              ? item.actor.faculty.name.replace("Fakulteti i ", "").replace("Fakulteti ", "")
              : null,
            year: item.actor.year,
            alreadyFollowing: followingSet.has(item.actor.id),
          }
        : null,
    })),
  });
}
