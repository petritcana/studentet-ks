
const BASE = process.argv[2] ?? "http://localhost:3000";

const FREE = { email: "erza.krasniqi@student.uni-pr.edu", label: "falas, e verifikuar" };
const PRO = { email: "blerim.gashi@student.uni-pr.edu", label: "Pro me pagese" };
const EARNED = { email: "dea.morina@student.uni-pr.edu", label: "Pro nga kontributi" };
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

/** Një sesion i vecante për secilen llogari, që te dyja te ekzistojne njekohesisht. */
async function openSession(email) {
  const jar = new Map();

  const store = (response) => {
    for (const line of response.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(";");
      const index = pair.indexOf("=");
      if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
    }
  };

  const header = (locale = "sq", extra = {}) =>
    [...jar.entries(), ["gjuha", locale], ...Object.entries(extra)]
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");

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
    async get(path, { locale = "sq", cookies = {} } = {}) {
      const response = await fetch(`${BASE}${path}`, {
        headers: { cookie: header(locale, cookies) },
        redirect: "manual",
      });
      return {
        status: response.status,
        body: response.status === 200 ? await response.text() : "",
      };
    },
  };
}

/**
 * Numri i artikujve te kycur.
 *
 * Matet nga markup-i i renderuar, jo nga teksti: next-intl e derguan tere
 * katalogun ne çdo faqe, prandaj një kërkim për «Me Pro» do te gjente gjithmonë
 * te njejtat katër perputhje edhe ne një faqe krejt te hapur.
 */
function lockedCount(html) {
  return (html.match(/data-locked="true"/g) ?? []).length;
}

function adCount(html) {
  return (html.match(/data-ad-card/g) ?? []).length;
}

function rowCount(html) {
  return (html.match(/href="\/materialet\/[a-z0-9]+"/g) ?? []).length;
}

async function main() {
  console.log(`Prove kunder ${BASE}\n`);

  console.log("Sesionet:");
  const [free, pro, earned] = await Promise.all([
    openSession(FREE.email),
    openSession(PRO.email),
    openSession(EARNED.email),
  ]);
  check(`llogaria ${FREE.label}`, free.ok);
  check(`llogaria ${PRO.label}`, pro.ok);
  check(`llogaria ${EARNED.label}`, earned.ok);
  if (!free.ok || !pro.ok || !earned.ok) {
    console.log("\nPa sesione nuk vazhdohet.");
    process.exit(1);
  }

  console.log("\nRrethi 3 dhe 4: biblioteka e pergjithshme");
  const freeAll = await free.get("/materialet?tab=krejt");
  const proAll = await pro.get("/materialet?tab=krejt");

  check(`falas e hap bibliotekene (${freeAll.status})`, freeAll.status === 200);
  check(`Pro e hap bibliotekene (${proAll.status})`, proAll.status === 200);

  const freeLocks = lockedCount(freeAll.body);
  const proLocks = lockedCount(proAll.body);
  console.log(`       kycur: falas ${freeLocks}, Pro ${proLocks}`);

  check("llogaria falas sheh material te kycur", freeLocks > 0);
  check("llogaria Pro sheh me pak te kycura se ajo falas", proLocks < freeLocks);

  console.log("\nParapamje, jo padukshmeri:");
  // Titujt e materialeve duhet te dalin edhe kur janë te kycur. Nëse lista falas
  // do te ishte thjesht me e shkurter, do te kishim fshehje, jo parapamje.
  const freeRows = rowCount(freeAll.body);
  const proRows = rowCount(proAll.body);
  console.log(`       rreshta: falas ${freeRows}, Pro ${proRows}`);
  check("falas sheh po aq materiale sa Pro", freeRows > 0 && freeRows === proRows);

  console.log("\nRrethi 2: fakulteti im është falas");
  const freeFaculty = await free.get("/materialet?tab=fakulteti");
  check(`fakulteti im hapet (${freeFaculty.status})`, freeFaculty.status === 200);
  check("asnjë material i fakultetit tim nuk është i kyçur", lockedCount(freeFaculty.body) === 0);

  console.log("\nShtrirja e postimit:");
  const freeFeed = await free.get("/feed");
  const proFeed = await pro.get("/feed");
  check(`feed-i falas (${freeFeed.status})`, freeFeed.status === 200);
  check(`feed-i Pro (${proFeed.status})`, proFeed.status === 200);

  console.log("\nReklamat:");
  console.log(`       reklama: falas ${adCount(freeFeed.body)}, Pro ${adCount(proFeed.body)}`);
  check("llogaria Pro nuk sheh asnje reklame", adCount(proFeed.body) === 0);

  console.log("\nAsistenti:");
  const freeAi = await free.get("/feed");
  const proAi = await pro.get("/feed");
  // Asistenti është widget brenda ballines. Reklama rri te shtylla e djathte, kurrë
  // brenda panelit te asistentit, prandaj matet markup-i i dokut.
  check("doku i asistentit është në faqe", freeAi.body.includes("Hap asistentin"));
  check("doku i asistentit është edhe për Pro", proAi.body.includes("Hap asistentin"));
  const dockStart = freeAi.body.indexOf("Hap asistentin");
  const dockRegion = freeAi.body.slice(dockStart, dockStart + 4000);
  check("asistenti nuk mban reklama brenda tij", !dockRegion.includes("data-ad-card"));

  console.log("\nAjo qe nuk bllokohet kurre:");
  for (const [path, label] of [
    ["/tregu/shto", "tregu"],
    ["/mesazhe", "mesazhet"],
    ["/materialet/ngarko", "ngarkimi"],
    ["/karriera", "bordi i punes"],
    ["/komuniteti?tab=eventet", "eventet"],
  ]) {
    const response = await free.get(path);
    check(`${label} hapen falas (${response.status})`, response.status === 200);
    check(`${label} nuk kane mur pagese`, !response.body.includes("data-locked-overlay"));
    check(`${label} nuk mbajne reklama te mesazheve`, path !== "/mesazhe" || adCount(response.body) === 0);
  }

  console.log("\nPro nga kontributi eshte i njejti Pro:");
  const earnedAll = await earned.get("/materialet?tab=krejt");
  check(`biblioteka (${earnedAll.status})`, earnedAll.status === 200);
  check("Pro i fituar sheh po aq sa Pro me pagese", lockedCount(earnedAll.body) === proLocks);
  const earnedPro = await earned.get("/une/pro");
  check("faqja e Pro-s tregon ditet e fituara", /ditë Pro/.test(earnedPro.body));

  console.log("\nCelesi demo «Shfaq si»:");
  // I njejti sesion Pro, i parë si falas: mbivendosja ndryshon vetëm pamjen.
  const asFree = await pro.get("/materialet?tab=krejt", { cookies: { demo_pro: "free" } });
  check(`mbivendosja hapet (${asFree.status})`, asFree.status === 200);
  check("Pro i pare si falas sheh material te kycur", lockedCount(asFree.body) > 0);

  console.log(
    failures === 0 ? "\nTe gjitha kontrollet kaluan." : `\n${failures} kontrolle deshtuan.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
