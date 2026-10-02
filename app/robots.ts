import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Robots.
 *
 * Vetëm faqet publike te marketingut indeksohen. Çdo gjë që kërkon sesion ,
 * feed-i, profilet, mesazhet, moderimi, admini, mbetet jashte, sepse indeksimi
 * i tyre do te ishte edhe i kote edhe i rrezikshem.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/en", "/hyr", "/regjistrohu", "/kushtet", "/privatesia"],
        disallow: [
          "/api/",
          "/feed",
          "/kampusi",
          "/materialet",
          "/mesazhe",
          "/njoftimet",
          "/une",
          "/u/",
          "/komuniteti",
          "/karriera",
          "/komuniteti",
          "/moderimi",
          "/admin",
          "/cilesimet",
          "/demo",
          "/offline",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
