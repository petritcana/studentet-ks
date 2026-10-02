import { db } from "@/lib/db";
import type { EventDto } from "@/components/campus/event-card";
import type { GroupDto } from "@/components/campus/group-card";

/** Grupet: të miat përpara, pastaj ato që mund t'i zbuloj. */
export async function getGroups(
  user: { id: string; facultyId: string | null; year: number | null },
  locale: string,
): Promise<{ mine: GroupDto[]; discover: GroupDto[] }> {
  const english = locale === "en";

  const [groups, memberships] = await Promise.all([
    db.group.findMany({
      orderBy: { name: "asc" },
      take: 60,
      select: {
        id: true,
        name: true,
        nameEn: true,
        type: true,
        privacy: true,
        description: true,
        facultyKey: true,
        _count: { select: { members: true } },
      },
    }),
    db.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true, role: true },
    }),
  ]);

  const roleByGroup = new Map(memberships.map((item) => [item.groupId, item.role]));

  const mapped: GroupDto[] = groups.map((group) => {
    const role = roleByGroup.get(group.id);
    return {
      id: group.id,
      name: english ? group.nameEn : group.name,
      type: group.type,
      privacy: group.privacy,
      description: group.description,
      facultyCode: group.facultyKey,
      memberCount: group._count.members,
      membership: role === "pending" ? "pending" : role ? "member" : null,
    };
  });

  return {
    mine: mapped.filter((group) => group.membership !== null),
    discover: mapped.filter((group) => group.membership === null).slice(0, 20),
  };
}

/** Eventet e ardhshme, me kontekstin «kush nga viti yt shkon». */
export async function getEvents(
  user: { id: string; facultyId: string | null; year: number | null },
  options: { past?: boolean; limit?: number } = {},
): Promise<EventDto[]> {
  const now = new Date();

  const events = await db.event.findMany({
    where: options.past ? { date: { lt: now } } : { date: { gte: now } },
    orderBy: { date: options.past ? "desc" : "asc" },
    take: options.limit ?? 20,
    select: {
      id: true,
      title: true,
      description: true,
      date: true,
      location: true,
      kind: true,
      rsvps: {
        where: { status: "going" },
        take: 30,
        select: {
          userId: true,
          user: { select: { name: true, avatar: true, year: true, facultyId: true } },
        },
      },
    },
  });

  return events.map((event) => {
    const going = event.rsvps;
    const mine = going.find((rsvp) => rsvp.userId === user.id);

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date.toISOString(),
      location: event.location,
      kind: event.kind,
      // A ka kaluar, vendoset në server: te komponenti klient serveri dhe
      // shfletuesi e llogarisin në momente të ndryshme dhe hidratimi prishet.
      past: event.date.getTime() < Date.now(),
      goingCount: going.length,
      myStatus: mine ? "going" : null,
      sameYearGoing: going
        .filter(
          (rsvp) =>
            rsvp.userId !== user.id &&
            rsvp.user.year === user.year &&
            rsvp.user.facultyId === user.facultyId,
        )
        .slice(0, 3)
        .map((rsvp) => ({ name: rsvp.user.name, avatar: rsvp.user.avatar })),
      attendees: going
        .slice(0, 6)
        .map((rsvp) => ({ name: rsvp.user.name, avatar: rsvp.user.avatar })),
    };
  });
}

/** Statusi im i vërtetë për një event, që RSVP-ja «ndoshta» të mos humbë. */
export async function getMyRsvp(eventId: string, userId: string) {
  const rsvp = await db.rsvp.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { status: true },
  });
  return (rsvp?.status ?? null) as EventDto["myStatus"];
}
