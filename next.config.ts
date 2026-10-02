import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `next dev` mund të punojë pranë `next start` vetëm me dosje tjetër, p.sh.
  // NEXT_DIST_DIR=.next-dev, që të dy të mos shkruajnë te e njëjta `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  /**
   * Rruget e shkurtra.
   *
   * Nje lidhje ne nje email, ne nje reklame ose ne nje bisede nuk duhet te
   * vdese sepse rruga e vertete eshte me e gjate. Permanente, qe edhe motoret
   * e kerkimit ta mesojne destinacionin.
   */
  redirects: async () => [
    { source: "/pro", destination: "/une/pro", permanent: true },
    // Konfirmimi i emailit me kod u hoq: lidhjet e vjetra çojnë te profili.
    { source: "/konfirmo", destination: "/regjistrohu", permanent: false },
    { source: "/materiale", destination: "/materialet", permanent: true },
    { source: "/profili", destination: "/une", permanent: true },
    { source: "/kerko", destination: "/komuniteti", permanent: true },
    { source: "/eksploro", destination: "/komuniteti", permanent: true },
    { source: "/pyetje", destination: "/feed", permanent: true },
    { source: "/pyetje/re", destination: "/feed", permanent: true },
    { source: "/punet", destination: "/karriera", permanent: true },
    { source: "/pune", destination: "/karriera", permanent: true },
    { source: "/pune/cv", destination: "/karriera/cv", permanent: true },
    { source: "/pune/:id", destination: "/karriera/:id", permanent: true },
    { source: "/kampusi", destination: "/komuniteti", permanent: true },
    { source: "/kampusi/:path*", destination: "/komuniteti/:path*", permanent: true },
    { source: "/asistenti", destination: "/feed", permanent: true },
    { source: "/orari", destination: "/feed", permanent: true },
    { source: "/xp", destination: "/une/xp", permanent: true },
    { source: "/verifiko", destination: "/verifikimi", permanent: true },
  ],

  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        {
          // Mikrofoni vetëm për origjinën tonë: mesazhet e zërit dhe dhomat e zërit.
          // Asnjë iframe i jashtëm nuk e merr dot.
          key: "Permissions-Policy",
          value: "camera=(self), microphone=(self), geolocation=(), interest-cohort=()",
        },
      ],
    },
  ],
};

export default withNextIntl(nextConfig);
