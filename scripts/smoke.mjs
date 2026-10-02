/**
 * Provë e shpejtë kundër serverit që po punon.
 *
 * Kontrollon që faqet ngarkohen, që i njëjti ekran del i plotë në të dyja
 * gjuhët, dhe që asnjë tekst i njërës gjuhë nuk rrjedh në tjetrën.
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

let failures = 0;

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  OK   ${label}`);
  } else {
    failures += 1;
    console.log(`  DËSH ${label}${detail ? `, ${detail}` : ""}`);
  }
}

async function page(path, locale, expectations, forbidden = []) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { cookie: `gjuha=${locale}` },
  });
  const body = await response.text();

  check(`${path} [${locale}] (${response.status})`, response.status === 200);
  if (response.status !== 200) return body;

  for (const expected of expectations) {
    check(`${path} [${locale}] përmban «${expected}»`, body.includes(expected));
  }
  for (const banned of forbidden) {
    check(`${path} [${locale}] nuk përmban «${banned}»`, !body.includes(banned));
  }
  return body;
}

async function main() {
  console.log(`Provë kundër ${BASE}\n`);

  console.log("Faqja hyrëse:");
  await page("/", "sq", ["Mësim që të lidh", "Sistemi i dizajnit"], ["Design system"]);
  await page("/", "en", ["Learning that connects you", "Design system"], ["Sistemi i dizajnit"]);

  console.log("\nSistemi i dizajnit, shqip:");
  const sq = await page(
    "/design-system",
    "sq",
    [
      "Sistemi i dizajnit",
      "Kontrasti",
      "Identiteti",
      "Rrethet e qasjes",
      "Erza Krasniqi",
      "FIEK",
      "FSHMN",
      "Këtu është ende qetë",
      "Hape me Pro",
      "Me Pro",
    ],
    ["Access circles", "It is still quiet here"],
  );

  console.log("\nSistemi i dizajnit, anglisht:");
  const en = await page(
    "/design-system",
    "en",
    [
      "Design system",
      "Contrast",
      "Identity",
      "Access circles",
      "Erza Krasniqi",
      "FIEK",
      "It is still quiet here",
      "Open with Pro",
      "With Pro",
    ],
    ["Rrethet e qasjes", "Këtu është ende qetë"],
  );

  console.log("\nStruktura:");
  const sections = [
    "ngjyrat",
    "kontrasti",
    "tipografia",
    "hapesira",
    "identiteti",
    "butonat",
    "format",
    "tabs",
    "kartat",
    "pro",
    "mbivendosjet",
    "progresi",
    "skeleton",
    "gjendjet-boshe",
  ];
  for (const id of sections) {
    check(`seksioni #${id} ekziston`, sq.includes(`id="${id}"`));
  }

  check("të dyja gjuhët japin të njëjtin numër seksionesh", sections.every((id) => en.includes(`id="${id}"`)));
  check("tokenat e fakulteteve mbërrijnë te faqja", sq.includes("--f-electrical"));
  check("gradienti i Pro-s është në faqe", sq.includes("pro-gradient"));
  check("gjuha e dokumentit ndryshon", sq.includes('lang="sq"') && en.includes('lang="en"'));

  console.log(
    failures === 0 ? "\nTë gjitha kontrollet kaluan." : `\n${failures} kontrolle dështuan.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
