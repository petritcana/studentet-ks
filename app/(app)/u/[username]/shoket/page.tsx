import { FollowList } from "@/components/profile/follow-list";

export const dynamic = "force-dynamic";

export default async function FriendsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <FollowList username={username} kind="friends" />;
}
