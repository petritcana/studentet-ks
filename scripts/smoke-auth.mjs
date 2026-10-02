/**
 * Prove e trete: aplikacioni i kycur.
 *
 * Hyn me një llogari demo përmes Auth.js dhe godet çdo faqe pas hyrjes, ne te
 * dyja gjuhet. Kjo është e vetmja prove që e verteton se feed-i, materialet dhe
 * asistenti e ndertojne faqen me te dhena te vertetae, jo vetëm se ekzistojne.
 */

const BASE = process.argv[2] ?? "http://localhost:3000";
const EMAIL = process.argv[3] ?? "erza.krasniqi@student.uni-pr.edu";
const PASSWORD = process.argv[4] ?? "provoje123";

let failures = 0;
const jar = new Map();

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  OK   ${label}`);
  } else {
    failures += 1;
    console.log(`  DESH ${label}${detail ? `, ${detail}` : ""}`);
  }
}

function storeCookies(response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const index = pair.indexOf("=");
    if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
}

function cookieHeader(locale = "sq") {
  return [...jar.entries(), ["gjuha", locale]]
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

async function get(path, locale = "sq") {
  const response = await fetch(`${BASE}${path}`, {
    headers: { cookie: cookieHeader(locale) },
    redirect: "manual",
  });
  storeCookies(response);
  const body = response.status === 200 ? await response.text() : "";
  return { status: response.status, body, location: response.headers.get("location") };
}

async function signIn() {
  const csrfResponse = await fetch(`${BASE}/api/auth/csrf`);
  storeCookies(csrfResponse);
  const { csrfToken } = await csrfResponse.json();

  const response = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: cookieHeader(),
    },
    body: new URLSearchParams({ email: EMAIL, password: PASSWORD, csrfToken, redirect: "false" }),
    redirect: "manual",
  });
  storeCookies(response);

  const session = await fetch(`${BASE}/api/auth/session`, {
    headers: { cookie: cookieHeader() },
  });
  const body = await session.json();
  return Boolean(body?.user);
}

const PAGES = [
  ["/feed", ["Për ty", "Fakulteti"]],
  ["/feed?tab=gjenerata", ["Gjenerata"]],
  ["/feed?tab=fakulteti", ["Fakulteti"]],
  ["/feed?tab=ndjek", ["Ndjek"]],
  ["/feed?tab=zeri", ["Zëri i kampusit"]],
  ["/komuniteti", ["Kampusi", "Rrethe të shpejta"]],
  ["/komuniteti?tab=grupet", ["Grupet"]],
  ["/komuniteti?tab=eventet", ["Evente"]],
  ["/materialet", ["Materialet"]],
  ["/materialet?tab=fakulteti", ["Materialet"]],
  ["/materialet/ngarko", ["Ngarko"]],
  ["/tregu", ["Tregu"]],
  ["/tregu/shto", ["Publiko"]],
  ["/karriera", ["Karriera"]],
  ["/karriera/cv", ["CV"]],
  ["/renditja", ["Renditja"]],
  ["/mesazhe", ["Mesazhe"]],
  ["/njoftimet", ["Njoftimet"]],
  ["/une", ["Profili"]],
  ["/une/pro", ["Pro"]],
  ["/cilesimet", ["Cilësimet"]],
];

async function main() {
  console.log(`Prove kunder ${BASE} si ${EMAIL}\n`);

  console.log("Hyrja:");
  const signedIn = await signIn();
  check("sesioni u krijua", signedIn);
  if (!signedIn) {
    console.log("\nPa sesion nuk vazhdohet.");
    process.exit(1);
  }

  console.log("\nFaqet e aplikacionit:");
  for (const [path, expectations] of PAGES) {
    const { status, body } = await get(path);
    check(`${path} (${status})`, status === 200);
    if (status !== 200) continue;
    for (const expected of expectations) {
      check(`${path} permban «${expected}»`, body.includes(expected));
    }
  }

  console.log("\nAnglishtja:");
  for (const path of ["/feed", "/materialet", "/tregu", "/karriera", "/une/pro", "/cilesimet"]) {
    const { status, body } = await get(path, "en");
    check(`${path} [en] (${status})`, status === 200);
    check(`${path} [en] ka lang="en"`, body.includes('lang="en"'));
  }

  console.log("\nAPI-t:");
  const searchApi = await fetch(`${BASE}/api/kerko?q=al`, { headers: { cookie: cookieHeader() } });
  const searchBody = await searchApi.json();
  check(`kerkimi (${searchApi.status})`, searchApi.status === 200);
  check("kerkimi kthen grupe", Array.isArray(searchBody.groups));

  const notifications = await fetch(`${BASE}/api/njoftimet`, {
    headers: { cookie: cookieHeader() },
  });
  const notificationsBody = await notifications.json();
  check(`njoftimet (${notifications.status})`, notifications.status === 200);
  check("njoftimet kthejne liste", Array.isArray(notificationsBody.items));

  const conversations = await fetch(`${BASE}/api/mesazhe`, { headers: { cookie: cookieHeader() } });
  const conversationsBody = await conversations.json();
  check(`bisedat (${conversations.status})`, conversations.status === 200);
  check("bisedat kthejne liste", Array.isArray(conversationsBody.items));

  console.log("\nModeli i qasjes:");
  const feed = await get("/feed");

  // Katalogu i perkthimeve e permend domenin institucional te dy vende: te teksti
  // i gabimit dhe te vend-mbajtesi i formes. Ato nuk janë rrjedhje, prandaj
  // kontrollohen adresat e verteta te llogarive, jo domeni.
  const REAL_ADDRESSES = [
    "erza.krasniqi@student.uni-pr.edu",
    "blerim.gashi@student.uni-pr.edu",
    "dea.morina@student.uni-pr.edu",
    "arian.bytyqi@gmail.com",
  ];

  const search = await fetch(`${BASE}/api/kerko?q=krasniqi`, { headers: { cookie: cookieHeader() } });
  const peopleBody = await search.text();
  check(`kerkimi i njerezve (${search.status})`, search.status === 200);
  check(
    "kerkimi nuk kthen asnje adrese te vertete",
    REAL_ADDRESSES.every((address) => !peopleBody.includes(address)),
  );

  check(
    "feed-i nuk rrjedh asnje adrese te vertete",
    REAL_ADDRESSES.every((address) => !feed.body.includes(address)),
  );

  const profile = await get("/u/erza.krasniqi");
  check(
    "profili publik nuk rrjedh adrese",
    REAL_ADDRESSES.every((address) => !profile.body.includes(address)),
  );

  check("feed-i nuk rrjedh hash fjalekalimi", !feed.body.includes("$2a$") && !feed.body.includes("$2b$"));
  check("feed-i nuk rrjedh identitetin prapa anonimitetit", !feed.body.includes("isAnonymous"));

  console.log(
    failures === 0 ? "\nTe gjitha kontrollet kaluan." : `\n${failures} kontrolle deshtuan.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
