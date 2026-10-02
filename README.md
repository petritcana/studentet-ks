# Studentët.KS

Shtëpia digjitale e jetës studentore në Kosovë. Mësim, materiale, njerëz, punë dhe një asistent AI
që i njeh lëndët e tua.

> _"Mësim që të lidh, lidhje që të mëson."_

---

## Nisja e shpejtë

```bash
npm install
cp .env.example .env      # plotëso çelësat që të duhen
npm run db:push           # krijon skemën
npm run db:seed           # mbush bazën me të dhëna reale kosovare
npm run dev               # http://localhost:3000
```

Hyrja më e shpejtë është `/demo`: nëntë llogari të gatshme, një për çdo gjendje të modelit të
qasjes. Shiriti i demonstrimit ka çelësin **«Shfaq si falas / Pro»**, që e njëjta faqe të krahasohet
në të dyja gjendjet pa ndërruar llogari.

Për ta rifilluar bazën nga zeroja:

```bash
npm run demo:reset
```

---

## Komandat

| Komanda | Çfarë bën |
| --- | --- |
| `npm run dev` | Serveri i zhvillimit |
| `npm run build` | Ndërtimi i prodhimit |
| `npm run start` | Serveri i prodhimit |
| `npm run lint` | ESLint mbi tërë projektin |
| `npm run typecheck` | TypeScript në modalitet strikt |
| `npm run test` | Vitest, 300 teste |
| `npm run i18n:check` | Kontrollon parët e katalogëve dhe çdo çelës të përdorur |
| `npm run icons` | Rigjeneron ikonat e PWA-së |
| `npm run smoke` | Faqja publike dhe sistemi i dizajnit, në të dyja gjuhët |
| `npm run smoke:app` | Rrugët e mbrojtura, demoja, PWA-ja dhe SEO |
| `npm run smoke:auth` | Çdo faqe pas hyrjes, me llogari demo |
| `npm run smoke:access` | Modeli i qasjes: falas kundrejt Pro, rresht për rresht |
| `npm run smoke:ia` | Arkitektura e informacionit: shtylla me gjashtë zëra, rrjedhja e rolit |
| `npm run smoke:phases` | Fazat 1 deri 9, secila e provuar veç |
| `npm run smoke:all` | Të gjashtë provat me radhë |
| `npm run db:push` / `db:seed` / `db:studio` | Prisma |
| `npm run demo:reset` | Reset i plotë i bazës me seed |

Pas çdo faze pune duhet të kalojnë të pesta: `lint`, `typecheck`, `test`, `i18n:check`, `build`.

Provat `smoke*` kërkojnë një server që punon:

```bash
npm run build && npm run start
npm run smoke:all
```

`smoke:access` e mat qasjen nga markup-i i renderuar (`data-locked`, `data-ad-card`,
`data-locked-overlay`), jo nga teksti: next-intl e dërgon tërë katalogun në çdo faqe,
prandaj një kërkim për «Me Pro» do të gjente përputhje edhe në një faqe krejt të hapur.

---

## Arkitektura

```
app/
  (marketing)/     faqja publike, e vetmja që indeksohet
  (auth)/          hyrja, regjistrimi dhe onboarding-u me nëntë hapa
  (app)/           gjithçka pas hyrjes, brenda AppChrome
  api/             kërkimi, njoftimet, mesazhet, konteksti i asistentit, Auth.js
  design-system/   katalogu i gjallë i komponentëve me auditin e kontrastit
components/
  ui/              primitivat mbi Radix, të shkruara me dorë
  identity/        UserIdentityLine dhe pjesët e tij
  feed/ materials/ social/ campus/ messages/ questions/ assistant/ moderation/ admin/
lib/
  access.ts        SHTRESA E VETME E AUTORIZIMIT (PRO)
  permissions.ts   can() dhe hasFeature(), lejet si të dhëna
  quality.ts       tubi i cilësisë së materialeve
  antiabuse.ts     mbrojtja e ekonomisë së XP-së
  notifications.ts grupimi dhe kufiri i push-it
  audit.ts         gjurma e vendimeve
  feed-ranking.ts  renditja, funksione të pastra
  xp.ts rewards.ts ekonomia e XP-së dhe e ditëve Pro
  billing/         PaymentProvider, gjashtë zbatimet dhe libri 70/30
  ai/              embeddings, RAG dhe ofruesi i modelit
  queries/         leximet, të ndara nga veprimet
  actions/         "use server", gjithçka që shkruan
```

### Shtresa e vetme e autorizimit

`isPro()` jeton në `lib/access.ts` dhe askund tjetër. Çdo vendim qasjeje kalon nga aty:
`canViewMaterial`, `canDownloadMaterial`, `canPostWithScope`, `materialAccessFilter`, `shouldSeeAds`,
`aiLimits`. Nëse një komponent do të donte të vendoste vetë, kjo do të ishte gabimi i parë për ta
rregulluar.

### Rrethet e qasjes

| Rrethi | Shtrirja | Falas | Pro |
| --- | --- | --- | --- |
| 1 | Lëndët e mia | ✅ | ✅ |
| 2 | Fakulteti im i tërë, të gjitha vitet | ✅ | ✅ |
| 3 | Fakultete të tjera brenda universitetit tim | ❌ | ✅ |
| 4 | Universitete të tjera | ❌ | ✅ |

**Parapamje, jo padukshmëri.** Materiali jashtë rrethit nuk fshihet: shfaqet me titull, fakultet,
lëndë, faqe, vlerësim dhe ngarkues, me faqen e parë të mjegulluar. `decorateMaterials()` nuk filtron
kurrë, vetëm shënon.

### Kush kontribuon, e merr Pro-n falas

Material i miratuar → 7 ditë. Dhjetë materiale brenda një muaji → një semestër. Përgjigje e pranuar →
një ditë. Badge «Lider i lëndës» → Pro sa kohë mbahet.

Dy lloje XP-je, dhe vetëm njëri konvertohet:

- **XP i Kontributit**, material i miratuar 15, përgjigje e pranuar 20, përgjigje e dobishme 8,
  100 shkarkime 10 bonus, ftesë e mbajtur 25, verifikim 25. Ky këmbehet në PRO.
- **XP i Aktivitetit**, postim 3, koment 2, hyrje ditore 1, reagim 0,5. Ky **kurrë** nuk blen PRO,
  dhe çdo burim ka kufi ditor që ndalon fermimin.

Kursi: 1 ditë = 100 XP, 1 muaj = 2.500 XP, 1 semestër = 10.000 XP.

Mbrojtjet: vetëm materiali i miratuar jep XP, hash SHA-256 bllokon dublikatat në gjithë sistemin,
maksimum pesë ngarkime në ditë, refuzimi pas miratimit heq edhe XP-në edhe ditët, llogaritë nën
shtatë ditë nuk këmbejnë.

### Pagesat

Stripe dhe PayPal nuk i mbështesin kompanitë e Kosovës, prandaj `lib/billing/` ka një ndërfaqe të
vetme `PaymentProvider` me gjashtë zbatime: **Paddle** (Merchant of Record, rekomandimi kryesor),
**LocalBank** (ProCredit, NLB, Raiffeisen), **BankTransfer** (IBAN me kod referencë dhe konfirmim
manual nga `/admin`), **Voucher**, **Xp** dhe **Mock**. Ofruesit pa çelësa në mjedis nuk shfaqen
fare te faqja e Pro-s. Çmimet lexohen nga tabela `Plan`, kurrë nga kodi.

### Renditja e feed-it

```
Score = 0.30 afërsi sociale
      + 0.25 relevancë akademike
      + 0.20 freski (gjysmë-jetë 8 orë)
      + 0.15 cilësi angazhimi (ruajtje dhe komente 3× mbi pëlqime)
      + 0.10 shumëllojshmëri
      − penalizime
```

Reagimet peshojnë ndryshe: «E dobishme» tri herë, «Kam të njëjtën pyetje» dy herë, «Pajtohem» dhe
«Mbështes» një herë. Ruajtjet dhe komentet peshojnë tri herë mbi një reagim të thjeshtë.

Çdo pesë postime futet një njësi jo-postuese, çdo dymbëdhjetë një reklamë native. Reklamat nuk
shfaqen kurrë për PRO, në DM, te shikuesi i dokumentit ose te asistenti.

### Asistenti AI

RAG mbi copëzat e materialeve, i kufizuar nga i njëjti `materialAccessFilter`. Vektorët ruhen si
JSON dhe kozinusi llogaritet në shtresën e aplikacionit, sepse SQLite nuk ka pgvector; kalimi te
pgvector është ndryshim i një query-je. Tetë mënyra pune, gjithmonë me burim të cituar dhe me
etiketën e gjenerimit. Kur nuk gjen asgjë, e thotë hapur.

---

## Ndërkombëtarizimi

- **Kodi në anglisht**, **interfejsi në shqip dhe anglisht**, të dyja të plota. 1626 çelësa për
  gjuhë.
- Asnjë varg teksti nuk shkruhet drejtpërdrejt në komponent. `npm run i18n:check` dështon nëse një
  çelës mungon në njërën gjuhë **ose** nëse kodi përdor një çelës që nuk ekziston.
- Gjuha vjen nga cookie-ja `gjuha`, jo nga prefiksi i rrugës. Rrugët nuk përkthehen.
- Emrat e fakulteteve dhe lëndëve ruhen në bazë me `name` dhe `nameEn`.

Për të shtuar çelësa në të dyja gjuhët njëherësh:

```bash
node scripts/merge-messages.mjs patch.json   # { "sq": {...}, "en": {...} }
```

---

## Dizajni

Tokenat përkufizohen një herë te `app/globals.css`. Asnjë ngjyrë hex nuk shkruhet në komponentë.
`tests/design-tokens.test.ts` e lexon vetë CSS-in dhe bie nëse ndonjë çift ngjyrash e humb WCAG AA.

Për këtë arsye `--pro-to` në dritë është `#C2410C`, jo `#F97316`: mbi gradientin e Pro-s rri tekst i
bardhë, dhe portokallia e ndritshme jep vetëm 2.80:1. Portokallia e specifikimit mbetet e paprekur
te `--accent-500`, ku nuk mban kurrë tekst.

Çdo komponent punon në dark dhe light mode, dhe nga 320px deri në 1920px. `/design-system` i tregon
të gjitha të gjalla, bashkë me auditin e kontrastit që lexon variablat e temës aktive.

---

## PWA

Manifest i gjeneruar nga katalogu, ikona të prodhuara nga `npm run icons` pa asnjë varësi grafike,
dhe një sherbetor pune me strategji «rrjeti i pari»: kthimi te kopja e ruajtur ndodh vetëm kur rrjeti
dështon, sepse një platformë mësimi që tregon të dhëna të vjetra është më e keqe se një që thotë
hapur «je pa internet». API-t nuk ruhen kurrë.

---

## Mjedisi

```
DATABASE_URL=            # SQLite lokalisht, PostgreSQL në prodhim
AUTH_SECRET=             # openssl rand -base64 32
DEMO_MODE=true           # kurrë në prodhim
NEXT_PUBLIC_SITE_URL=
GOOGLE_CLIENT_ID=        # opsionale
GOOGLE_CLIENT_SECRET=
PADDLE_VENDOR_ID=        # opsionale, ofruesit pa çelësa nuk shfaqen
PADDLE_API_KEY=
LOCALBANK_ENDPOINT=
LOCALBANK_MERCHANT=
BANK_IBAN=
```

Skema është shkruar që të jetë e bartshme: pa `enum`, pa fusha vargje, pa tipin `Json`. Kalimi nga
SQLite te PostgreSQL është ndryshim i `provider` te `schema.prisma`.

---

## Çfarë të mos bësh

- Mos e bllokosh ngarkimin, pyetjet, DM-të ose materialet e fakultetit të vet pas Pro-s.
- Mos i fshih materialet e kyçura. Trego titullin dhe parapamjen me blur.
- Mos lejo që XP-ja e aktivitetit të blejë Pro.
- Mos shfaq reklama për Pro, në DM, te shikuesi i dokumentit ose te asistenti.
- Mos e kodo `isPro` në më shumë se një vend.
- Mos bëj renditje globale të përdoruesve. Mos përdor spinner.
- Mos e lër anglishten gjysmake.

Rregullat e plota janë te [CLAUDE.md](./CLAUDE.md).
