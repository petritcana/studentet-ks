# Studentët.KS

**Mësim që të lidh, lidhje që të mëson.**

Platformë web (mobile-first, PWA) për studentët e Kosovës. Nuk është vetëm rrjet social dhe as
vetëm platformë mësimore. Është shtëpia digjitale e jetës studentore: aty ku studenti mëson, gjen
materiale, gjen njerëz, gjen punë, dhe kalon kohë sepse i pëlqen.

Problemi që zgjidh: dija e studentëve sot jeton në grupe WhatsApp, folderë Google Drive dhe grupe
Facebook. Çdo vit kur ndërrohet gjenerata, ajo dije zhduket. Këtu mbetet dhe kërkohet.

---

## Nisja e shpejtë

```bash
npm install
cp .env.example .env      # plotëso AUTH_SECRET
npm run db:push           # krijon skemën
npm run db:seed           # mbush bazën me të dhëna reale kosovare
npm run dev               # http://localhost:3000
```

**Llogaria demonstruese:** `demo@student.uni-pr.edu` · fjalëkalimi `provoje123`
Të gjithë përdoruesit e seed-it kanë të njëjtin fjalëkalim.

Kërkesa: Node.js 20 ose më i ri. Nëse `node` nuk gjendet, instalimi portativ ndodhet në
`~/.local/node`.

---

## Skriptet

| Komanda | Çfarë bën |
| --- | --- |
| `npm run dev` | Serveri i zhvillimit |
| `npm run build` | Ndërtimi për prodhim |
| `npm run start` | Nis ndërtimin e prodhimit |
| `npm run lint` | ESLint mbi tërë projektin |
| `npm run typecheck` | TypeScript në modalitet strict |
| `npm run test` | Testet e renditjes, sugjerimeve, XP-së, moderimit dhe kontrastit |
| `npm run db:push` | Sinkronizon skemën me bazën |
| `npm run db:seed` | Mbush bazën me të dhëna demo |
| `npm run db:reset` | Rikthen bazën nga zeroja dhe e mbush prapë |
| `npm run db:studio` | Prisma Studio |
| `npm run icons` | Rigjeneron ikonat e PWA-së |

---

## Stack-u

- **Next.js 15** (App Router) + **React 19** + **TypeScript** strict
- **Tailwind CSS v4** me tokena të përcaktuara një herë në `app/globals.css`
- Primitive **Radix** të shkruara vetë në stilin shadcn/ui, jo të gjeneruara nga CLI
- **Prisma ORM** me SQLite lokalisht dhe PostgreSQL në prodhim
- **Auth.js v5** me credentials dhe Google, plus verifikim emaili institucional
- **Zod** për validim, **next-intl** për gjuhët, **date-fns** me locale `sq`
- **lucide-react** për ikona, **next-themes** për dark mode, **sonner** për njoftime

### Kalimi në PostgreSQL

Vetëm dy ndryshime, sepse skema shmang çdo veçori specifike të SQLite-it: pa enum-e, pa fusha
vargje, pa tipin `Json`.

```prisma
datasource db {
  provider = "postgresql"   // ishte "sqlite"
  url      = env("DATABASE_URL")
}
```

```bash
DATABASE_URL="postgresql://user:fjalekalim@host:5432/studentet"
```

---

## Struktura

```
app/
  (marketing)/          landing, privatësia, kushtet, raporti publik i moderimit
  (auth)/hyr            hyrja
  (auth)/regjistrohu    regjistrimi dhe onboarding-u me nëntë hapa
  (app)/feed            rrjedha e përzier sociale dhe akademike
  (app)/materialet      biblioteka, shikuesi i dokumentit, ngarkimi
  (app)/lenda/[id]      faqja e lëndës
  (app)/pyetje          pyetje dhe përgjigje
  (app)/kampusi         njerëz, grupe, evente
  (app)/mesazhe         bisedat
  (app)/pune            bordi i punëve dhe praktikave
  (app)/u/[username]    profili publik
  (app)/une             orari, progresi, badge-t, ruajtjet
  (app)/cilesimet       profili, lëndët, gjuha, privatësia, të dhënat
  (app)/moderimi        paneli i moderimit, i mbrojtur me rol
  design-system         të gjithë komponentët në një faqe
  api/                  kërkimi, njoftimet, orari ICS, CV PDF, shkarkimet
components/
  ui/ feed/ social/ academic/ layout/ gamification/ settings/ moderation/ shared/
lib/
  db, auth, session, feed-ranking, suggestions, xp, moderation, ai, pdf, contrast, format
prisma/
  schema.prisma, seed.ts
```

---

## Vendimet që formësojnë produktin

**Renditja e feed-it** (`lib/feed-ranking.ts`) është e pastër dhe e testuar:

```
Score = 0.30 afërsi sociale
      + 0.25 relevancë akademike
      + 0.20 freski (kalbje eksponenciale, gjysmë-jeta 8 orë)
      + 0.15 cilësi angazhimi (ruajtje dhe komente 3x më shumë se pëlqime)
      + 0.10 shumëllojshmëri
      - penalizime për raportime dhe autorë të rinj të paverifikuar
```

Çdo pesë postime futet një njësi jo-postuese: njerëz të rekomanduar, material i ri i lëndës, event,
ose pyetje pa përgjigje. Kjo e mban feed-in të gjallë edhe kur komuniteti është i vogël.

**Motori i follow-back** (`lib/suggestions.ts`) e rendit çdo person sipas peshave: lëndë e
përbashkët 5, fakultet plus vit 4, shokë të përbashkët 3, qytet 2, interesa 1. Asnjë profil nuk
shfaqet pa arsyen e shkruar poshtë emrit.

**Anonimiteti** në Zërin e kampusit është publik, jo në backend. Kërkon llogari më të vjetër se
shtatë ditë me email institucional, dhe përmendja e emrave bllokohet automatikisht.

**Cilësia e materialeve** ruhet nga vetë studentët: materiali i ri hyn si i paverifikuar derisa ta
vlerësojnë pozitivisht tre veta, dhe nën dy yje me mbi pesë vlerësime fshihet vetë.

**Ndihmësi AI** është i heshtur. Pa banner, pa premtime. Çdo dalje ka etiketën «gjeneruar
automatikisht, verifiko» dhe linkun te burimi. Pa çelës API, `lib/ai.ts` kthen një përafrim të
ndërtuar lokalisht dhe UI-ja e thotë hapur.

---

## Privatësia dhe siguria

Platforma bie nën **Ligjin Nr. 06/L-082** për Mbrojtjen e të Dhënave Personale të Kosovës, të
harmonizuar me GDPR.

- Mosha minimale 16 vjeç, e konfirmuar në regjistrim.
- Emaili dhe të dhënat private nuk kthehen kurrë nga API-t. Çdo endpoint kalon nëpër DTO (`lib/dto.ts`).
- Fjalëkalimet ruhen si hash me bcrypt.
- Kufizim shpejtësie në postime, komente, ngarkime, ndjekje, mesazhe dhe raportime (`lib/rate-limit.ts`).
- Filtër automatik për ngacmim, gjuhë urrejtjeje, targetim, përmbajtje seksuale, kërcënime, spam dhe të dhëna personale (`lib/moderation.ts`).
- Tri raportime e fshehin automatikisht një përmbajtje deri në rishikim.
- Eksport i plotë i të dhënave dhe fshirje e llogarisë, të dyja nga faqja e cilësimeve.
- Pëlqim i veçantë për njoftimet push dhe cookies analitike, të fikura si parazgjedhje.
- Historiku i moderimit publikohet i agreguar te `/moderimi/publik`.

---

## Aksesueshmëria dhe cilësia

- Kontrasti WCAG AA i verifikuar me test automatik (`tests/suggestions.test.ts`) dhe me auditim të
  gjallë te `/design-system`.
- Navigim i plotë me tastierë, `focus-visible` i dukshëm kudo, role dhe etiketa ARIA.
- `prefers-reduced-motion` fik të gjitha animacionet.
- Skeleton në çdo gjendje ngarkimi, kurrë spinner.
- Responsive nga 320px deri 1920px, me matës gjerësie te faqja e sistemit të dizajnit.
- PWA me manifest, ikona të gjeneruara, service worker dhe lexim offline i faqeve të vizituara.

---

## Gjuhët

Shqipja është gjuha e produktit. Anglishtja ekziston si opsion për studentët ndërkombëtarë dhe
ndërrohet nga cilësimet. Gjuha ruhet në cookie-n `gjuha`, prandaj rrugët mbeten të njëjta dhe linqet
e ndara nuk prishen.

Katalogët janë në `messages/sq.json` dhe `messages/en.json`. Ata mbulojnë navigimin, kërkimin,
njoftimet, feed-in, temën dhe veprimet e përbashkëta. Përmbajtja e faqeve është shqip drejtpërdrejt
në komponentë, sepse toni i tekstit është pjesë e produktit dhe humb kur kalon nëpër çelësa.

---

## Rregullat e zhvillimit

Lexo [CLAUDE.md](./CLAUDE.md) para çdo ndryshimi. Shkurtimisht:

- Kodi në anglisht, interfejsi në shqip, gjithmonë me diakritika.
- Asnjë ngjyrë hex jashtë `app/globals.css`.
- Asnjë ekran bosh pa `EmptyState` me udhëzim dhe veprim.
- Asnjë spinner. Skeleton me formën e përmbajtjes reale.
- Asnjë renditje globale e përdoruesve dhe asnjë ndëshkim publik.
- Pas çdo ndryshimi: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
