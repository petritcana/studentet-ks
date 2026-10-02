import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

/**
 * Manifesti i PWA-së.
 *
 * Emri dhe përshkrimi vijnë nga katalogu, që aplikacioni i instaluar të flasë
 * gjuhën që studenti ka zgjedhur, jo një gjuhë të ngulitur në kod.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("meta");

  return {
    name: `${t("name")}, ${t("tagline")}`,
    short_name: t("name"),
    description: t("description"),
    start_url: "/feed",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#040B1C",
    theme_color: "#040B1C",
    categories: ["education", "social"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: t("shortcutMaterials"), url: "/materialet" },
      { name: t("shortcutExplore"), url: "/komuniteti" },
      { name: t("shortcutCareer"), url: "/karriera" },
    ],
  };
}
