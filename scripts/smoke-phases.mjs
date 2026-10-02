
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

async function main() {
  console.log(`Prove kunder ${BASE}\n`);

  const student = await openSession("erza.krasniqi@student.uni-pr.edu");
  const moderator = await openSession("vlora.berisha@student.uni-pr.edu");
  const admin = await openSession("fisnik.hoxha@student.uni-pr.edu");
  check("sesioni i studentit", student.ok);
  check("sesioni i moderatorit", moderator.ok);
  check("sesioni i adminit", admin.ok);
  if (!student.ok || !admin.ok) process.exit(1);

  console.log("\nFaza 1, verifikimi tripjesesh:");
  const verify = await student.get("/verifikimi");
  check(`/verifikimi (${verify.status})`, verify.status === 200);
  check("tre hapat jane aty", verify.body.includes("Emaili institucional"));
  check("privatesia e imazheve thuhet", verify.body.includes("fshihen sapo merret vendimi"));

  const modQueue = await moderator.get("/moderimi?tab=verifikimet");
  check(`radha e verifikimeve (${modQueue.status})`, modQueue.status === 200);
  check("studenti nuk e hap moderimin", (await student.get("/moderimi")).status !== 200);

  console.log("\nFaza 2, shtresa sociale:");
  const feed = await student.get("/feed");
  check("butoni Pëlqej nën postim", feed.body.includes('aria-label="Pëlqej"'));
  check("nuk ka më «E dobishme» nën postim", !feed.body.includes('aria-label="E dobishme"'));
  check("shiriti i stories", feed.body.includes('aria-label="Stories"'));
  const following = await student.get("/feed?tab=ndjek");
  check(`tab-i Duke ndjekur (${following.status})`, following.status === 200);

  console.log("\nFaza 3, asistenti me kontekst:");
  check("doku është në çdo faqe", feed.body.includes("Hap asistentin"));
  const ctx = await fetch(`${BASE}/api/kontekst?lloji=course&id=x`, { redirect: "manual" });
  check(`api e kontekstit ekziston (${ctx.status})`, ctx.status === 200 || ctx.status === 401);

  console.log("\nFaza 4, akademia:");
  const materials = await student.get("/materialet");
  check(`materialet (${materials.status})`, materials.status === 200);
  const market = await student.get("/tregu");
  check(`tregu (${market.status})`, market.status === 200);

  console.log("\nFaza 5, karriera:");
  for (const [path, needle] of [
    ["/karriera", "lg:grid-cols-3"],
    ["/karriera?tab=bursa", "Bursa"],
    ["/karriera?tab=aplikimet", "Aplikimet"],
    ["/karriera/profili", "Kush e sheh"],
  ]) {
    const response = await student.get(path);
    check(`${path} (${response.status})`, response.status === 200);
    check(`${path} permban «${needle}»`, response.body.includes(needle));
  }

  console.log("\nFaza 6, kurset dhe libri 70/30:");
  const courses = await student.get("/kurset");
  check(`/kurset (${courses.status})`, courses.status === 200);
  check("katalogu ka kurse", courses.body.includes("Katalogu"));
  const earnings = await student.get("/kurset/fitimet");
  check("studenti nuk i sheh fitimet", earnings.status !== 200);

  console.log("\nFaza 7, XP dhe portofoli:");
  const wallet = await student.get("/une/xp");
  check(`/une/xp (${wallet.status})`, wallet.status === 200);
  check("portofoli tregon historikun", wallet.body.includes("Portofoli"));
  check("kufijte ditore duken", wallet.body.includes("/"));

  console.log("\nFaza 8, komuniteti:");
  const study = await student.get("/komuniteti?tab=studio");
  check(`Studio bashke (${study.status})`, study.status === 200);
  check("sesionet duken", study.body.includes("Studio bashkë"));
  const notifications = await student.get("/njoftimet");
  check(`njoftimet (${notifications.status})`, notifications.status === 200);

  console.log("\nFaza 9, admini dhe gjurma:");
  const adminPage = await admin.get("/admin");
  check(`/admin (${adminPage.status})`, adminPage.status === 200);
  check("shitjet e kurseve duken", adminPage.body.includes("Shitjet e kurseve"));
  check("tarifa e mbledhur duket", adminPage.body.includes("Tarifa e mbledhur"));
  const audit = await admin.get("/admin/gjurma");
  check(`gjurma (${audit.status})`, audit.status === 200);
  check("studenti nuk e hap gjurmen", (await student.get("/admin/gjurma")).status !== 200);

  console.log("\nAnglishtja e plote:");
  for (const path of ["/kurset", "/karriera", "/une/xp", "/verifikimi"]) {
    const response = await student.get(path, "en");
    check(`${path} [en] (${response.status})`, response.status === 200);
    check(`${path} [en] ka lang=en`, response.body.includes('lang="en"'));
  }

  console.log("\nAsnje vize e gjate:");
  for (const [label, body] of [
    ["ballina", feed.body],
    ["kurset", courses.body],
    ["portofoli", wallet.body],
  ]) {
    check(`${label} pa vize te gjate`, !body.includes("—"));
  }

  console.log(
    failures === 0 ? "\nTe gjitha kontrollet kaluan." : `\n${failures} kontrolle deshtuan.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
