import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Vetëm rruget publike. Permbajtja e studentëve nuk hyn ne sitemap. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/en`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/hyr`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/regjistrohu`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];
}
