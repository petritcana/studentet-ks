# Studentet.KS — rregullat e projektit

Ky dokument është kontrata e projektit. Lexohet para çdo sesioni pune dhe nuk shkelet.

---

## 1. Çfarë është produkti

Platformë web (mobile-first, PWA) për studentët e Kosovës. Nuk është vetëm rrjet social dhe as
vetëm platformë mësimore. Është shtëpia digjitale e jetës studentore: aty ku studenti mëson, gjen
materiale, gjen njerëz, gjen punë, dhe kalon kohë sepse i pëlqen.

**Fraza udhëheqëse:** _"Mësim që të lidh, lidhje që të mëson."_

Problemi: dija e studentëve sot jeton në grupe WhatsApp, folderë Google Drive dhe grupe Facebook.
Çdo vit kur ndërrohet gjenerata, ajo dije zhduket. Ne e bëjmë të përhershme dhe të kërkueshme.

Konteksti i tregut: ~64.000 studentë në Kosovë. Universiteti i Prishtinës "Hasan Prishtina" është më
i madhi, plus UBT, RIT Kosovo, Kolegji AAB, universitetet e Prizrenit, Gjakovës, Pejës, Mitrovicës,
Ferizajt dhe Gjilanit.

---

## 2. Parimet që diktojnë çdo vendim

1. **Vlerë në 60 sekondat e para, edhe pa asnjë shok.** Përdoruesi i ri merr orarin, materialet dhe
   njerëzit e vet përpara se rrjeti të ekzistojë për të.
2. **Fillo ngushtë.** Dizajno për një fakultet në një vit, pastaj replikoje. Densiteti para numrit.
3. **Statusi vjen nga ndihma, jo nga fama.** Numri i ndjekësve nuk është kurrë metrika kryesore e
   profilit. Ndikimi në lëndë është.
4. **Anonimiteti ekziston, por me përgjegjësi prapa tij.** Pseudonim publik, identitet i verifikuar
   në backend, ndalim absolut i targetimit të individëve me emër.
5. **AI është ndihmës i heshtur.** Asnjë banner "Powered by AI". AI ndihmon në përmbledhje, kërkim
   dhe organizim, kurrë nuk pretendon të jetë burim autoritar.
6. **Bukuria është veçori.** Nëse nuk të vjen keq ta mbyllësh, dizajni ka dështuar.
7. **Kurrë mos e ndëshko përdoruesin publikisht.** Pa "ke humbur streak-un" në feed, pa renditje që
   poshtëron.

---

## 3. Personat (dizajno për këta katër)

| Personi | Kush është | Çfarë i duhet |
| --- | --- | --- |
| **Ariani**, 19 | Viti I, Ekonomik UP. Nuk njeh askënd. | Orar, materiale, 3 shokë brenda javës së parë |
| **Erza**, 21 | Viti III, Mjekësi. Shënime të shkëlqyera. | Njohje dhe vend ku shënimet nuk humbin |
| **Blerimi**, 23 | Master, punon. | Sinjal jo zhurmë, profil që i shërben si CV |
| **Dea**, 20 | Viti II, Arte. | Njerëz, evente, humor |

Erza është ana e vështirë e rrjetit. Nëse Erza nuk vjen, platforma vdes. Nëse 20 Erza nuk vijnë,
2000 Arianë nuk kanë çfarë të lexojnë.

---

## 4. Rregullat e kodit

### Gjuha
- **Kodi në anglisht.** Emrat e variablave, funksioneve, tipave, tabelave, kolonave, rrugëve të API-t.
- **Interfejsi në shqip.** Çdo varg teksti i dukshëm për përdoruesin, pa asnjë fjalë angleze.
- **Diakritikat janë të detyrueshme.** Asnjë varg UI pa `ë` dhe `ç` ku duhen. `studentë`, `lëndë`,
  `për`, `që`, `është`, `njerëz`, `Gjithçka`, `përgjigje`, `mësim`, `ndjekës`.
- Rrugët e URL-ve janë në shqip (`/materialet`, `/pyetje`, `/kampusi`, `/pune`, `/mesazhe`,
  `/cilesimet`, `/une`), pa diakritika sepse janë pjesë e URL-së.

### Stack-u (i fiksuar, mos e ndrysho)
- Next.js 15 (App Router) + React 19 + TypeScript strict
- Tailwind CSS v4 + primitive Radix të shkruara vetë në stilin shadcn/ui
- `motion` (Framer Motion) për animime
- Prisma ORM + PostgreSQL (SQLite si provider lokal nëse Postgres mungon)
- Auth.js v5 (credentials + Google) me verifikim emaili institucional
- Zod për validim, React Hook Form për format
- `next-themes` për dark mode, `lucide-react` për ikona, `date-fns` me locale `sq`

### Higjiena
- Mos instalo paketa që nuk i përdor. Mos shto varësi të panevojshme.
- Çdo komponent duhet të funksionojë në dark mode dhe light mode.
- Çdo komponent duhet të jetë responsive nga **320px deri 1920px**.
- Asnjë `Lorem ipsum`, asnjë `John Doe`. Të dhëna demo reale kosovare kudo.
- Pas çdo faze: `npm run build`, `npm run lint`, `npm run typecheck`. Zero gabime para se të vazhdohet.

---

## 5. Tokenat e dizajnit

Përkufizohen një herë në `app/globals.css`. Asnjë ngjyrë hex e shkruar direkt në komponentë.

```css
/* Light */
--brand-500: #4F46E5;  --brand-600: #4338CA;  --brand-50: #EEF2FF;
--accent-500: #F97316; --accent-50: #FFF7ED;
--success: #10B981;    --warning: #F59E0B;    --danger: #EF4444;
--bg: #FAFAF9;         --surface: #FFFFFF;    --surface-2: #F5F5F4;
--border: #E7E5E4;     --text: #1C1917;       --text-muted: #78716C;

/* Dark */
--bg: #0C0A09;         --surface: #1C1917;    --surface-2: #292524;
--border: #44403C;     --text: #FAFAF9;       --text-muted: #A8A29E;
--brand-500: #818CF8;
```

**Variante për tekst.** Ngjyrat semantike të mësipërme janë për mbushje, pika dhe kufij, ku
mjafton 3:1. Për tekst të vogël duhet 4.5:1, prandaj ekzistojnë edhe `--success-text`,
`--warning-text`, `--danger-text`, `--accent-text` dhe `--brand-contrast` (teksti mbi mbushje
brand). Përdor gjithmonë variantin `-text` kur ngjyra shkon te tipografia.

**Ngjyrat e fakulteteve** (badge, kanale, renditje): Ekonomik `amber`, Mjekësi `blue`,
Juridik `violet`, FSHMN `emerald`, Filologjik `pink`, Arte `fuchsia`.

**Tipografia:** Inter (variable) kryesore, Instrument Serif për tituj të mëdhenj, JetBrains Mono për
numra dhe kod. Lartësia e rreshtit `1.5` për tekst, `1.1` për tituj. Gjatësia maksimale e rreshtit
**68 karaktere** (`max-w-prose`).

**Hapësira:** sistem 4px — 4, 8, 12, 16, 24, 32, 48, 64, 96.

**Rrezja:** 8px komponentë të vegjël, 16px karta, 24px modale, 999px pilula dhe avatarë.

**Hijet:** të buta me ngjyrë brand, kurrë të zeza.
`0 1px 2px rgba(28,25,23,.04), 0 8px 24px rgba(79,70,229,.06)`

**Kufijtë:** 1px, kurrë 2px.

**Lëvizja:** 150ms mikro-interaksione, 250ms tranzicione, 400ms elemente të mëdha.
Easing `cubic-bezier(0.32, 0.72, 0, 1)`. Fade + translate 12px lart për zbulim përmbajtjeje.
Optimistic UI për pëlqim, ndjekje dhe ruajtje. Respekto `prefers-reduced-motion` gjithmonë.

**Skeleton, kurrë spinner.** Çdo gjendje ngarkimi ka skeleton me formën e përmbajtjes reale dhe
shimmer 1.5s.

**EmptyState është i detyrueshëm.** Ilustrim i vogël, një fjali me ton njerëzor, buton veprimi.
Asnjë ekran bosh pa udhëzim se çfarë të bëhet.

---

## 6. Toni i tekstit në interfejs

Shkruaj si një student i vitit të tretë që ndihmon një të ri, jo si institucion.

- ✅ "E gjetëm orarin tënd." · "Ky material s'e ka kaluar ende kontrollin." · "Nesër ke Statistikë në 10:00."
- ❌ "Operacioni u krye me sukses." · "Të dhënat tuaja janë procesuar." · "Ju lutemi provoni përsëri."
- Gabimet gjithmonë ofrojnë zgjidhje: "S'u ngarkua dot. Provo një skedar nën 25MB."
- Përdor **"ti"**, kurrë "ju".
- Humor i lehtë lejohet në gjendjet boshe dhe njoftimet, kurrë në gabime ose në moderim.
- Pa emoji në UI kryesore. Emoji vetëm në përmbajtjen e përdoruesve dhe në reagime.

---

## 7. Struktura e projektit

```
app/
  (marketing)/page.tsx              landing
  (auth)/hyr, (auth)/regjistrohu    onboarding me hapa
  (app)/feed, materialet, pyetje, kampusi, pune, mesazhe, u/[username], une, cilesimet
  api/...
components/
  ui/            primitive (Button, Input, Card, Dialog, ...)
  feed/          PostCard, PostComposer, FeedTabs, FeedFilters
  social/        UserCard, FollowButton, SuggestedPeople, MutualContext
  academic/      CourseCard, MaterialCard, DocumentViewer, ScheduleGrid
  layout/        AppShell, BottomNav, Sidebar, RightRail, GlobalSearch
  gamification/  XpBar, StreakWidget, BadgeChip, Leaderboard
  shared/        EmptyState, Skeleton*, Avatar, Toast
lib/
  db.ts, auth.ts, feed-ranking.ts, suggestions.ts, xp.ts, moderation.ts, utils.ts
prisma/
  schema.prisma, seed.ts
```

---

## 8. Fazat

| Fazë | Përmbajtja | Statusi |
| --- | --- | --- |
| 1 | Themeli dhe design system (`/design-system`) | **e mbyllur** |
| 2 | Skema Prisma dhe seed realist | **e mbyllur** |
| 3 | Autentikimi dhe onboarding me 9 hapa | **e mbyllur** |
| 4 | Shtresa e aplikacionit dhe feed-i | **e mbyllur** |
| 5 | Moduli social dhe motori i follow-back | **e mbyllur** |
| 6 | Moduli akademik | **e mbyllur** |
| 7 | Gamification | **e mbyllur** |
| 8 | Moderimi, siguria, privatësia | **e mbyllur** |
| 9 | Cilësia dhe dorëzimi (PWA, a11y, i18n, teste) | **e mbyllur** |

Verifikimi para çdo dorëzimi:
`npm run lint` · `npm run typecheck` · `npm run test` · `npm run build` · `npm run smoke`

Asnjë fazë nuk fillon para se e mëparshmja të jetë e ndërtuar dhe e verifikuar.

---

## 9. Çfarë të mos bësh

- Mos e ndërto aplikacionin mobile të parin. Web PWA arrin më shpejt te studentët në Kosovë.
- Mos e mbush feed-in me përmbajtje AI.
- Mos bëj renditje globale të përdoruesve.
- Mos e kopjo Facebook-un. Struktura e Reddit-it për dijen, struktura e Instagram-it për njerëzit.
- Mos lësho asnjë ekran bosh pa udhëzim.
- Mos vendos mur pagese mbi materialet e ngarkuara nga studentët.
- Mos përdor spinner-a. Skeleton gjithmonë.
- Mos kërko më shumë të dhëna në regjistrim përveç atyre që ndërtojnë grafin.
- Mos i bëj njoftimet agresive. Maksimum 2 push në ditë, kontroll i plotë në cilësime.
- Mos e neglizho anën e vështirë të rrjetit: krijuesit e shënimeve.

---

## 10. Shënime mjedisi

- Node.js 24 LTS është instaluar në `~/.local/node` (portativ, pa admin) dhe është shtuar në PATH-in
  e përdoruesit. Nëse `node` nuk gjendet në një terminal të ri, rihape terminalin.
- Projekti jeton në `C:\Users\petritc\studentet-ks`, jo direkt në profilin e përdoruesit, sepse
  `node_modules` dhe konfigurimet nuk duhet të përzihen me dosjet e Windows-it.
