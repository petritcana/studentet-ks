import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Studentët.KS",
    short_name: "Studentët.KS",
    description:
      "Gjithçka që të duhet për fakultetin, në një vend. Orari, materialet, pyetjet dhe njerëzit e gjeneratës sate.",
    start_url: "/feed",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "sq",
    dir: "ltr",
    background_color: "#FAFAF9",
    theme_color: "#4F46E5",
    categories: ["education", "social"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Materialet", short_name: "Materialet", url: "/materialet" },
      { name: "Orari im", short_name: "Orari", url: "/une" },
      { name: "Mesazhe", short_name: "Mesazhe", url: "/mesazhe" },
    ],
  };
}
