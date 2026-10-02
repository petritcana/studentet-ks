import type { Config } from "@netlify/functions";

/**
 * Ngrohja e bazës dhe e serverit.
 *
 * Baza falas fle pas pak minutash pa punë, dhe funksioni i serverit ftohet
 * njësoj. Kjo punë e vogël i prek të dyja çdo pesë minuta, që studenti të mos
 * jetë ai që e paguan zgjimin.
 */
export default async function warm(_request: Request) {
  const base = process.env.URL ?? process.env.DEPLOY_URL ?? "https://studentet-ks.netlify.app";

  try {
    const response = await fetch(`${base}/api/nxeh`, { headers: { "user-agent": "studentet-ks-warmup" } });
    return new Response(`ngrohje: ${response.status}`, { status: 200 });
  } catch {
    return new Response("ngrohja dështoi", { status: 200 });
  }
}

export const config: Config = {
  schedule: "*/5 * * * *",
};
