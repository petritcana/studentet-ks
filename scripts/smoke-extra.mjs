/**
 * Provë e dytë: rrugët e mbrojtura, demoja dhe PWA-ja.
 *
 * `smoke.mjs` mbulon faqen publike dhe sistemin e dizajnit në të dyja gjuhët.
 * Kjo mbulon atë që erdhi më vonë: çdo rrugë pas hyrjes duhet të kërkojë sesion,
 * dhe manifesti, robots-i, sitemap-i dhe sherbetori i punes duhet të shërbehen.
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

let failures = 0;

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  OK   ${label}`);
  } else {
    failures += 1;
    console.log(`  DESH ${label}${detail ? `, ${detail}` : ""}`);
  }
}

const GUARDED = [
  "/feed",
  "/komuniteti",
  "/materialet",
  "/materialet/ngarko",
  "/mesazhe",
  "/njoftimet",
  "/une",
  "/une/pro",
  "/tregu",
  "/karriera",
  "/renditja",
  "/cilesimet",
  "/moderimi",
  "/admin",
];

async function main() {
  console.log(`Prove kunder ${BASE}\n`);

  console.log("Rruget e mbrojtura kerkojne sesion:");
  for (const path of GUARDED) {
    const response = await fetch(`${BASE}${path}`, { redirect: "manual" });
    check(`${path} (${response.status})`, response.status === 307 || response.status === 302);
  }

  console.log("\nFaqet publike:");
  for (const [path, expected] of [
    ["/demo", "Erza Krasniqi"],
    ["/offline", "Je pa internet"],
    ["/hyr", "form"],
    ["/regjistrohu", "form"],
  ]) {
    const response = await fetch(`${BASE}${path}`, { headers: { cookie: "gjuha=sq" } });
    const body = await response.text();
    check(`${path} (${response.status})`, response.status === 200);
    check(`${path} permban «${expected}»`, body.includes(expected));
  }

  console.log("\nPWA dhe SEO:");
  const manifest = await fetch(`${BASE}/manifest.webmanifest`);
  check(`manifesti (${manifest.status})`, manifest.status === 200);
  if (manifest.status === 200) {
    const body = await manifest.json();
    check("manifesti nis te feed-i", body.start_url === "/feed");
    check("manifesti ka tri ikona", (body.icons ?? []).length === 3);
    check("manifesti ka shkurtore", (body.shortcuts ?? []).length === 3);
    check("manifesti është standalone", body.display === "standalone");
  }

  const robots = await fetch(`${BASE}/robots.txt`);
  const robotsBody = robots.status === 200 ? await robots.text() : "";
  check(`robots.txt (${robots.status})`, robots.status === 200);
  check("robots ndalon /admin", robotsBody.includes("/admin"));
  check("robots ndalon /mesazhe", robotsBody.includes("/mesazhe"));
  check("robots permend sitemap-in", robotsBody.toLowerCase().includes("sitemap"));

  const sitemap = await fetch(`${BASE}/sitemap.xml`);
  check(`sitemap.xml (${sitemap.status})`, sitemap.status === 200);

  const sw = await fetch(`${BASE}/sw.js`);
  check(`sherbetori i punes (${sw.status})`, sw.status === 200);

  const icon = await fetch(`${BASE}/icon-192.png`);
  check(`ikona 192px (${icon.status})`, icon.status === 200);

  console.log(
    failures === 0 ? "\nTe gjitha kontrollet kaluan." : `\n${failures} kontrolle deshtuan.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
