import { redirect } from "next/navigation";

/**
 * Linku viral. E ruajmë kodin te URL-ja e regjistrimit që forma ta dijë kush
 * ftoi, dhe që lidhja të bëhet automatikisht pas krijimit të llogarisë.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ kodi: string }>;
}) {
  const { kodi } = await params;
  redirect(`/regjistrohu?ftesa=${encodeURIComponent(kodi.toUpperCase())}`);
}
