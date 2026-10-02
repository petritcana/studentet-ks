
const BASE = process.argv[2] ?? "http://localhost:3000";
const PASSWORD = "provoje123";

let failures = 0;

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  OK   ${label}`);
  } else {
    failures += 1;
    console.log(`  DESH ${label}${detail ? `, ${detail}` : ""}`);
  }
}

async function openSession(email) {
  const jar = new Map();
  const store = (response) => {
    for (const line of response.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(";");
      const index = pair.indexOf("=");
      if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
    }
  };
  const header = (locale = "sq") =>
    [...jar.entries(), ["gjuha", locale]].map(([k, v]) => `${k}=${v}`).join("; ");

  const csrfResponse = await fetch(`${BASE}/api/auth/csrf`);
  store(csrfResponse);
  const { csrfToken } = await csrfResponse.json();

  store(
    await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", cookie: header() },
      body: new URLSearchParams({ email, password: PASSWORD, csrfToken, redirect: "false" }),
      redirect: "manual",
    }),
  );

  const session = await fetch(`${BASE}/api/auth/session`, { headers: { cookie: header() } });
  const body = await session.json();

  return {
    ok: Boolean(body?.user),
    async get(path, locale = "sq") {
      const response = await fetch(`${BASE}${path}`, {
        headers: { cookie: header(locale) },
        redirect: "manual",
      });
      return { status: response.status, body: response.status === 200 ? await response.text() : "" };
    },
  };
}

/** Numëron lidhjet brenda navigimit kryesor te shtylla. */
function sidebarLinks(html) {
  const nav = html.match(/<nav[^>]*aria-label="Navigimi kryesor"[^>]*>([\s\S]*?)<\/nav>/);
  if (!nav) return [];
  return [...nav[1].matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
}

async function main() {
  console.log(`Prove kunder ${BASE}\n`);

  const student = await openSession("erza.krasniqi@student.uni-pr.edu");
  const admin = await openSession("fisnik.hoxha@student.uni-pr.edu");
  check("sesioni i studentit", student.ok);
  check("sesioni i adminit", admin.ok);
  if (!student.ok || !admin.ok) process.exit(1);

  console.log("\nShtylla me pese zera:");
  const home = await student.get("/feed");
  check(`ballina hapet (${home.status})`, home.status === 200);

  const links = sidebarLinks(home.body);
  console.log(`       lidhje ne shtylle: ${links.length} [${links.join(", ")}]`);
  check("shtylla ka saktesisht 6 zera", links.length === 6);

  for (const expected of [
    "/feed",
    "/materialet",
    "/karriera",
    "/komuniteti",
    "/tregu",
    "/gara",
  ]) {
    check(`shtylla permban ${expected}`, links.includes(expected));
  }

  console.log("\nRrjedhja e rolit:");
  const adminHome = await admin.get("/feed");
  const adminLinks = sidebarLinks(adminHome.body);
  check("admini ka po ashtu 6 zera ne shtylle", adminLinks.length === 6);
  check("shtylla nuk permban /admin", !adminLinks.includes("/admin"));
  check("shtylla nuk permban /moderimi", !adminLinks.includes("/moderimi"));
  // Menyja e avatarit është dropdown Radix: permbajtja renderohet vetëm kur hapet,
  // prandaj nuk kerkohet ne HTML-ne e serverit. Filtrimi sipas rolit mbulohet nga
  // tests/navigation.test.ts, dhe mbrojtja e vërtetë nga requireAdmin ne server.
  const adminRoute = await admin.get("/admin");
  const studentOnAdmin = await student.get("/admin");
  check(`admini e hap /admin (${adminRoute.status})`, adminRoute.status === 200);
  check(
    `studenti perplaset te /admin (${studentOnAdmin.status})`,
    studentOnAdmin.status === 307 || studentOnAdmin.status === 302,
  );
  check("studenti nuk e sheh /admin askund", !home.body.includes('href="/admin"'));
  check("studenti nuk e sheh /moderimi askund", !home.body.includes('href="/moderimi"'));

  console.log("\nMesazhet dhe njoftimet te shiriti i siperm:");
  check("shtylla nuk permban /mesazhe", !links.includes("/mesazhe"));
  check("shtylla nuk permban /njoftimet", !links.includes("/njoftimet"));
  check("shiriti ka butonin e mesazheve", home.body.includes("aria-label=\"Mesazhe"));
  check("shiriti ka butonin e njoftimeve", home.body.includes("aria-label=\"Njoftimet"));

  console.log("\nOrari dhe GPA te hequra:");
  for (const path of ["/orari", "/api/orari"]) {
    const response = await student.get(path);
    check(`${path} nuk ekziston më si faqe (${response.status})`, [404, 308].includes(response.status));
  }
  check("shtylla nuk permban /orari", !links.includes("/orari"));
  check("ballina nuk permend orarin", !home.body.includes('href="/orari"'));

  console.log("\nAsistenti si widget, jo rruge:");
  const assistantRoute = await student.get("/asistenti");
  check(`/asistenti nuk është faqe (${assistantRoute.status})`, [404, 308].includes(assistantRoute.status));
  check("butoni i asistentit është në faqe", home.body.includes("Hap asistentin"));
  check("shtylla nuk permban /asistenti", !links.includes("/asistenti"));

  console.log("\nShtylla e majte, hapesira jone:");
  check("hapesira jone", home.body.includes("data-announcement-board"));
  check("njoftim i vertete nga seed-i", home.body.includes("Afati i dytë i regjistrimit"));
  check("vendi i sponsorizuar", home.body.includes("data-ad-card"));

  console.log("\nBallina, pjeset e reja:");
  check("shiriti i stories", home.body.includes('aria-label="Stories"'));
  check("nderruesi i kontekstit", home.body.includes("Hapësira"));
  check("tab-i Duke ndjekur", home.body.includes("Ndjek"));
  check("tab-i Global me dry", home.body.includes("Global"));
  check("formula e renditjes nuk printohet", !home.body.includes("afërsi sociale"));

  console.log("\nRruget e reja:");
  for (const [path, needle] of [
    ["/tregu", "Tregu"],
    ["/karriera", "Karriera"],
    ["/komuniteti", "Kampusi"],
  ]) {
    const response = await student.get(path);
    check(`${path} (${response.status})`, response.status === 200);
    check(`${path} permban «${needle}»`, response.body.includes(needle));
  }

  console.log("\nKarriera, tri për rresht:");
  const career = await student.get("/karriera");
  check("grid me tri kolona", career.body.includes("lg:grid-cols-3"));

  console.log("\nAnglishtja:");
  const homeEn = await student.get("/feed", "en");
  check(`ballina en (${homeEn.status})`, homeEn.status === 200);
  check("en ka lang=en", homeEn.body.includes('lang="en"'));
  const enLinks = sidebarLinks(homeEn.body.replace('aria-label="Main navigation"', 'aria-label="Navigimi kryesor"'));
  check("shtylla en ka 6 zera", enLinks.length === 6);
  check("en perkthen Marketplace", homeEn.body.includes("Marketplace"));
  check("en perkthen Career", homeEn.body.includes("Career"));
  check("en nuk le shqip te shtylla", !homeEn.body.includes(">Eksploro<"));

  console.log("\nAsnje vize e gjate ne UI:");
  check("ballina sq pa vize te gjate", !home.body.includes("—"));
  check("ballina en pa vize te gjate", !homeEn.body.includes("—"));

  console.log(
    failures === 0 ? "\nTe gjitha kontrollet kaluan." : `\n${failures} kontrolle deshtuan.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
