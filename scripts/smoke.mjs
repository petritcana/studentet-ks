/**
 * Test i shpejtë nga fillimi në fund kundër serverit që po punon.
 *
 * Hyn me llogarinë demo përmes rrjedhës së vërtetë të Auth.js, pastaj kërkon
 * çdo faqe kryesore me cookie-n e sesionit dhe kontrollon se përmbajtja shqipe
 * arrin vërtet te shfletuesi.
 */

const BASE = process.argv[2] ?? "http://localhost:3000";
const EMAIL = "demo@student.uni-pr.edu";
const PASSWORD = "provoje123";

const jar = new Map();

function storeCookies(response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  for (const cookie of raw) {
    const [pair] = cookie.split(";");
    const index = pair.indexOf("=");
    jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}

function cookieHeader() {
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    ...options,
    headers: { cookie: cookieHeader(), ...(options.headers ?? {}) },
  });
  storeCookies(response);
  return response;
}

let failures = 0;

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  OK   ${label}`);
  } else {
    failures += 1;
    console.log(`  DËSH ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function page(path, expectations) {
  const response = await request(path);
  const body = await response.text();
  const ok = response.status === 200;
  check(`${path} (${response.status})`, ok);
  if (!ok) return;
  for (const expected of expectations) {
    check(`${path} përmban «${expected}»`, body.includes(expected));
  }
}

async function main() {
  console.log(`Testi kundër ${BASE}\n`);

  console.log("Faqet publike:");
  await page("/", ["Gjithçka që të duhet për fakultetin", "studentë", "materiale"]);
  await page("/hyr", ["Mirë se u ktheve", "Hyr"]);
  await page("/regjistrohu", ["Nis llogarinë tënde", "Kam mbushur 16 vjeç"]);
  await page("/privatesia", ["Politika e privatësisë", "06/L-082"]);
  await page("/kushtet", ["Kushtet e përdorimit", "Zëri i kampusit"]);
  await page("/moderimi/publik", ["Raporti i moderimit"]);
  await page("/design-system", ["Sistemi i dizajnit", "Kontrasti"]);
  await page("/manifest.webmanifest", ["Studentët.KS"]);

  console.log("\nHyrja:");
  const csrfResponse = await request("/api/auth/csrf");
  const { csrfToken } = await csrfResponse.json();
  check("morëm csrfToken", Boolean(csrfToken));

  const login = await request("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken,
      email: EMAIL,
      password: PASSWORD,
      callbackUrl: `${BASE}/feed`,
      json: "true",
    }).toString(),
  });
  check(`hyrja u pranua (${login.status})`, login.status < 400);
  check(
    "u vendos cookie-ja e sesionit",
    [...jar.keys()].some((key) => key.includes("session-token")),
  );

  console.log("\nFaqet e aplikacionit:");
  await page("/feed", ["Për ty", "Gjenerata", "Ndjek"]);
  await page("/materialet", ["Materialet", "Lëndët e mia"]);
  await page("/pyetje", ["Pyetje", "Lëndët e mia"]);
  await page("/kampusi", ["Kampusi", "Njerëz"]);
  await page("/mesazhe", ["Mesazhe"]);
  await page("/pune", ["Punë dhe praktika", "Praktikë"]);
  await page("/une", ["Orari im", "Ditë rresht"]);
  await page("/une/ruajtjet", ["Ruajtjet"]);
  await page("/cilesimet", ["Cilësimet", "Lëndët e semestrit", "Fshije llogarinë"]);
  await page("/u/demo", ["Studenti Demo", "materiale"]);

  console.log("\nRrugët dinamike:");
  const search = await request("/api/kerko?q=statistik");
  const searchData = await search.json();
  check(`kërkimi punon (${search.status})`, search.status === 200);
  check("kërkimi kthen grupe", Array.isArray(searchData.groups) && searchData.groups.length > 0);

  const notifications = await request("/api/njoftimet");
  const notificationData = await notifications.json();
  check(`njoftimet punojnë (${notifications.status})`, notifications.status === 200);
  check("njoftimet kanë përmbajtje", (notificationData.items?.length ?? 0) > 0);

  const ics = await request("/api/orari");
  const icsBody = await ics.text();
  check(`eksporti ICS punon (${ics.status})`, ics.status === 200);
  check("ICS është kalendar i vlefshëm", icsBody.startsWith("BEGIN:VCALENDAR"));
  check("ICS përmban ligjërata", icsBody.includes("SUMMARY:"));

  const cv = await request("/api/cv");
  const cvBuffer = Buffer.from(await cv.arrayBuffer());
  check(`CV-ja gjenerohet (${cv.status})`, cv.status === 200);
  check("CV-ja është PDF i vlefshëm", cvBuffer.subarray(0, 5).toString() === "%PDF-");

  // Një faqe lënde, materiali dhe pyetjeje, të marra nga kërkimi.
  const courses = searchData.groups.find((group) => group.key === "courses");
  if (courses?.items[0]) {
    await page(courses.items[0].href, ["Materialet", "Pyetjet"]);
  }

  const materials = await request("/api/kerko?q=Skripta");
  const materialData = await materials.json();
  const materialGroup = materialData.groups.find((group) => group.key === "materials");
  if (materialGroup?.items[0]) {
    await page(materialGroup.items[0].href, ["Vlerëso këtë material", "Ndihmë për të mësuar"]);
    const download = await request(`/api/materialet/${materialGroup.items[0].id}/shkarko`);
    const pdf = Buffer.from(await download.arrayBuffer());
    check(`shkarkimi punon (${download.status})`, download.status === 200);
    check("skedari është PDF i vlefshëm", pdf.subarray(0, 5).toString() === "%PDF-");
  }

  console.log("\nGjuha:");
  jar.set("gjuha", "en");
  const english = await request("/feed");
  const englishBody = await english.text();
  check("anglishtja ndërron navigimin", englishBody.includes("For you"));
  jar.set("gjuha", "sq");
  const albanian = await request("/feed");
  check("shqipja kthehet", (await albanian.text()).includes("Për ty"));

  console.log(
    failures === 0
      ? "\nTë gjitha kontrollet kaluan."
      : `\n${failures} kontrolle dështuan.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
