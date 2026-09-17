# Studentët.KS, kontrata e projektit

Rrjeti i Pavarur i Studentëve. Ky dokument e zëvendëson çdo brief të mëparshëm. Aty ku një udhëzim i
vjetër bie ndesh me këtë, ky fiton.

---

## 1. Çfarë është produkti

Ekosistem digjital i centralizuar për studentët e universiteteve të Kosovës. Një vend ku studenti
mëson, gjen materiale, gjen njerëz, gjen punë, flet me profesorët dhe e jeton jetën e kampusit.

Duhet të lexohet si produkt serioz: kombinim premium i ideve më të forta të LinkedIn, Reddit,
Discord, Notion, Handshake, Google Classroom dhe GitHub, të rikombinuara për studentët e Kosovës. Nuk
duhet të duket si klon i asnjërit, dhe nuk duhet të ndihet si TikTok. Pa feed argëtimi të pafund, pa
rage bait, pa bujqësi angazhimi.

**Fjalia udhëheqëse:** "Mësim që të lidh, lidhje që të mëson."

Problemi: dija e studentëve sot jeton në grupe WhatsApp, folderë Drive dhe grupe Facebook, dhe zhduket
çdo vit kur ndërrohet gjenerata. Ne e bëjmë të përhershme, të organizuar dhe të kërkueshme.

Tregu: Kosova e para. Arkitektura nuk e ngulit Kosovën në mënyrë që bllokon zgjerimin e mëvonshëm.

**Nuk jemi portal zyrtar universiteti.** Jemi rrjet në pronësi të studentëve. Dobia vjen e para, por
ka hapësirë të vërtetë për jetë sociale dhe humor, të mbyllur në dhoma të përcaktuara që të mos
përmbytin kurrë feed-in akademik.

---

## 2. Pesë konfliktet e zgjidhura

1. **Shtylla e majtë ka pesë zëra.** Gjithçka tjetër shkon te shiriti i sipërm, te menyja e
   profilit, ose te tabs brenda faqes.
2. **Orari dhe nota mesatare hiqen.** Nuk janë puna jonë. Ato të dhëna i zotërojnë fakultetet.
   Kthehemi te to vetëm pas partneriteteve universitare dhe integrimit të të dhënave të tyre.
3. **Asistenti AI nuk është faqe.** Është widget i dokuar poshtë djathtas.
4. **Rrjet i studentëve, jo portal.** Humori ka dhomat e veta.
5. **Profesorët shesin kurse online me pagesë.** Ndarja: 70 për qind instruktori, 30 për qind
   platforma.

---

## 3. Rregullat e shkrimit

- Gjuha e interfejsit: **shqip si parazgjedhje, anglisht si gjuhë e dytë e plotë.** Kurrë build
  gjysmë i përkthyer.
- Kurrë përkthim makinerie për emrat e niveleve, badge-ve dhe termave të produktit. Përkthehen për
  kuptim, jo fjalë për fjalë.
- **Asnjë vizë e gjatë, në asnjë tekst, seed ose dokumentacion.** Përdor presje, dy pika ose pikë.
- Toni: si student i vitit të tretë që ndihmon një të ri, jo si institucion. Përdor "ti", kurrë "ju".
- Gabimet ofrojnë zgjidhje: "S'u ngarkua dot. Provo një skedar nën 25MB."
- Muri i pagesës kurrë agresiv, kurrë më shumë se një herë për sesion për veçori.

---

## 4. Arkitektura e informacionit

### 4.1 Shtylla e majtë, saktësisht pesë zëra

```
  Ballina          Home
  Materialet       Materials
  Karriera         Career
  Komuniteti       Community
  Tregu            Marketplace

  [ + Posto ]

  [ Nga Studentët.KS ]   njoftimet, eventet, udhëtimet dhe takimet tona
  [ E sponsorizuar ]     reklama, jo për PRO
  [ Mundësi për ty ]     tri punë
  [ karta PRO ]
```

**Shtylla e majtë është edhe hapësira jonë.** Nën navigim, rendi është gjithmonë: së pari njoftimet
e Studentët.KS (dhe të fakultetit të studentit), pastaj reklama, pastaj punët. Njoftimet i publikon
admini te `/admin/njoftimet`, me lloj (njoftim, event, udhëtim, takim), datë, vend dhe shenjë «e
rëndësishme». Llojet dhe kufijtë rrinë te `lib/announcements.ts`. Shtylla ka gjerësinë e shtyllës së
djathtë, që feed-i të rrijë saktë në mes. Rri e ngjitur nën shirit me rrëshqitjen e vet të fshehur,
që navigimi të mos humbasë. Në celular dhe tablet këto karta dalin nën feed.

Logoja shfaqet vetëm një herë, te shiriti i sipërm. Eksploro u hoq sepse përsëriste Komunitetin, dhe
Pyetje u hoq sepse pyetja bëhet si postim. `/eksploro` dhe `/pyetje` ridrejtojnë, faqet e vjetra të
pyetjeve `/pyetje/[id]` mbeten të lexueshme.

**Tregu** (`/tregu`) është vendi ku studentët shesin, falin ose kërkojnë libra, shënime, pajisje,
banim dhe shërbime. Kategoritë dhe kufijtë rrinë te `lib/market.ts`. Blerja nuk ndodh në platformë:
butoni hap bisedë me shitësin.

**Admini dhe Moderimi nuk shfaqen kurrë në shtyllë.** Jetojnë te menyja e avatarit, të dukshme vetëm
për ato role, dhe çdo rrugë mbrohet në server, jo thjesht fshihet në UI.

**Mesazhet dhe Njoftimet dalin fare nga shtylla.** Shkojnë te shiriti i sipërm.

Karta PRO rri në fund: titull, një rresht vlerë, një buton. Nuk është reklamë që pulson.

### 4.2 Shiriti i sipërm

Majtas: kërkim global, i gjerë, Ctrl K, që kërkon njëkohësisht te njerëzit, profesorët, fakultetet,
universitetet, kompanitë, punët, materialet, pyetjet, eventet dhe grupet, me rezultate të grupuara.

Majtas, para kërkimit: identiteti i përdoruesit, një rresht me avatar, @username dhe statusin
(Student ose Student i verifikuar). Emri i plotë jeton te profili, jo këtu.

Djathtas, në këtë rend: mesazhet (panel), njoftimet (panel), tema, gjuha SQ/EN, menyja e avatarit
(XP, Profili, Të ruajtura, Përmbajtja ime, PRO, Cilësimet, Tema, Moderimi, Admini, Dil).

**XP-ja nuk është chip i veçantë në shirit.** Jeton te menyja e avatarit dhe te profili. Shiriti mban
identitetin majtas, kërkimin në mes dhe veprimet djathtas, dhe asgjë tjetër.

### 4.3 Shtylla e djathtë

Rendi te ballina nis me njerëz, jo me reklamë:

1. **Online tani.** Kush nga rrethi yt është në platformë këtë moment. Prioriteti: ata që i ndjek,
   pastaj i njëjti fakultet, pastaj i njëjti vit, pastaj i njëjti universitet.
2. **Kontekstuale.** Njerëz nga viti yt te ballina. Ndryshon me faqen: punë të rekomanduara,
   materialet më të dobishme, pyetje pa përgjigje, grupe të sugjeruara.
3. **E sponsorizuar.** Reklamë ose shpallje pune e promovuar. Gjithmonë e etiketuar "Sponsorizuar".
   Kurrë e stiluar si njoftim zyrtar. E fshehur plotësisht për PRO.
E sponsorizuara dhe njoftimet tona kaluan në shtyllën e majtë. Djathtas mbeten njerëzit dhe dhomat.

**Shtylla rrëshqet me faqen.** Një shirit i vetëm rrëshqitjeje për tërë dokumentin: asnjë `sticky` mbi
kolonën, asnjë `height` e fiksuar, asnjë `overflow` i vetin. Studenti nuk duhet ta arrijë kurrë fundin
e feed-it që kartat e shtyllës të lëvizin.

XP-ja del nga shtylla dhe nga shiriti. Jeton te menyja e avatarit dhe te profili.

### 4.4 Mobile

Navigim i poshtëm me pesë zëra: Ballina, Komuniteti, Posto (qendër, i ngritur), Mesazhe, Profili.
Materialet, Karriera dhe Tregu arrihen nga menyja e avatarit, ku shfaqen vetëm nën
gjerësinë `lg`. Shtylla
e djathtë bëhet seksione kontekstuale nën feed. Asnjë scroll horizontal.

---

## 5. Asistenti si widget i dokuar

Jo shtyllë, jo rrugë e vet. Buton pluskues poshtë djathtas, panel rreth 380x560px në desktop.

- Nuk e largon kurrë përdoruesin nga faqja. Faqja prapa mbetet aty ku ishte.
- I vetëdijshëm për kontekstin: te një material e di cili material, te një lëndë e di lënda. Konteksti
  shfaqet si chip i vogël që hiqet.
- Minimizimi e kthen te butoni, biseda mbetet gjallë për sesionin.
- Në mobile hapet si fletë poshtë, rreth 85 për qind lartësi.
- Mënyrat: Shpjego thjesht, Përmblidh, Bëj kuiz, Flashcards, Plan provimi, Përkthe, Përmirëso CV-në,
  Shpjego shpalljen e punës.
- Gjithmonë cit burimet si karta të vogla të klikueshme. Etiketë nën çdo përgjigje: e gjeneruar,
  verifiko te burimi.
- Rikthimi i respekton rrethet e qasjes. Kur material më i mirë ekziston jashtë rrethit, e thotë dhe
  ofron PRO.
- Nuk e shkruan detyrën në vend të studentit.
- Falas: 10 mesazhe në ditë, vetëm konteksti i fakultetit tënd. PRO: limit i lartë, të gjitha
  materialet, ngarkim PDF personal.

---

## 6. Shtresa sociale

- **Stories:** shirit horizontal në krye të feed-it, 24 orë, foto ose video deri 30 sekonda, shtrirje
  (viti im, fakulteti im, ndjekësit, shokët e ngushtë), kronologjike me të pashikuarat të parat, max
  10 në ditë.
- **Kompozuesi është social, jo formular.** Hapet si dritare në mes të ekranit, jo si fletë nga
  poshtë, në desktop dhe në celular. Gjendja e parë: avatar, «Çfarë po ndodh?», një buton.
  Brenda: teksti, pastaj katër bashkëngjitje, Foto, Video, Sondazh, Zë. Shtrirja është vendim i dytë
  dhe rri e mbyllur derisa studenti ta kërkojë. Kufiri i tekstit 1000 shenja, me numërues vetëm mbi 800.
- **Materialet dhe eventet nuk krijohen nga ballina.** Ato jetojnë aty ku kanë kuptim: te Materialet
  dhe te Eventet. Pyetja bëhet si postim i zakonshëm. Zëri i kampusit ka formën e vet te Komuniteti.
- **Grafi i ndjekjes:** asimetrik. Kur të dy ndjekin njëri-tjetrin bëhen **Shokë**: DM pa kufi,
  kontekst i përbashkët, njoftim.
- **Tabs të feed-it, saktësisht katër:** **Duke ndjekur** (parazgjedhja, rreptësisht kronologjik,
  vetëm ata që ndjek), Fakulteti im, Universiteti im, Global (PRO). Paraqitja është nënvizim, jo
  pilula: janë filtra brenda të njëjtës faqe, jo destinacione.
- **Zëri i kampusit nuk është tab i feed-it.** Jeton te Komuniteti, si dhoma e vet. Renditja «Për ty»
  mbetet në kod, por nuk është filtër i dukshëm i ballinës.
- **Rendi i ballinës:** Stories, kompozuesi, filtrat, postimi i parë. Asnjë hapësirë e madhe boshe mes
  tyre, dhe asnjëri prej tyre nuk rri i ngjitur në krye kur faqja rrëshqet.
- **Zëri i kampusit:** anonim publikisht, i lidhur me llogari të verifikuar në backend, pseudonim i
  qëndrueshëm brenda një fije, ndalim absolut i emrave, pa foto njerëzish, llogari mbi 7 ditë me email
  të verifikuar, tri raportime e fshehin. **Kurrë nuk rrjedh te feed-i kryesor.**
- **Rreshti i veprimeve nën postim:** Pëlqej, Koment, Riposto, Ruaj. Një reagim i vetëm
  (`REACTION_TYPES` te `lib/types.ts`); dobia matet nga ruajtjet dhe komentet. Riposti krijon
  postim të ri me `repostOfId`, gjithmonë drejt origjinalit, kurrë për postime anonime. Ruajtjet janë
  sinjali më i fortë i cilësisë.
- **Grupet e bisedës:** deri në 30 anëtarë bashkë me krijuesin (`MAX_GROUP_CHAT_MEMBERS` te
  `lib/constants.ts`). Shtohen vetëm njerëz që ndjek ose që të ndjekin. Kush nuk është shok me
  krijuesin e merr grupin si kërkesë. Çdo anëtar mund të shtojë të tjerë dhe të dalë.

### Renditja

```
Score = 0.30 afërsi sociale + 0.25 relevancë akademike + 0.20 freski (gjysmë-jetë 8 orë)
      + 0.15 dobi (ruajtje dhe komente 3x mbi pëlqime) + 0.10 shumëllojshmëri - penalizime
```

**Formula nuk printohet kurrë në UI.** Ky është dokumentacion i brendshëm. Nëse shfaqet shpjegim, ai
është njerëzor: "Sepse ndjek Ekonometrinë", "Sepse është nga fakulteti yt".

---

## 7. Identiteti, verifikimi dhe qasja

Verifikimi ka tri pjesë: email institucional me kod, foto e ID-së studentore, selfie e krahasuar me
ID-në. Imazhet ruhen private dhe të enkriptuara, kurrë të ekspozuara përmes API, të fshira pas afatit.

**Profili është profil social, jo CV.** Rendi: kopertina, avatari mbi të, emri, @username,
verifikimi, statusi online, bio, konteksti akademik, ndjekësit, tabs. Hapet gjithmonë te **Postimet**,
kurrë te Rreth ose Materialet. Postimet e profilit përdorin `PostCard`, të njëjtin që përdor feed-i:
një postim duket njësoj kudo.

Koka e profilit mbahet e ulët: avatari, emri, një rresht i vogël me rolin, universitetin, fakultetin
dhe vitin, pastaj numrat (postime, ndjekës, ndjek, shokë) dhe butonat Ndiq dhe Mesazh. Postimet dalin
menjëherë poshtë, nga më i riu, pa rresht filtrash.

Tabs-at: Postime, Media, Rreth (me arritjet brenda), Materiale. Media i nxjerr fotot nga postimet, prandaj
shtrirja e postimit origjinal respektohet vetvetiu dhe asgjë private nuk rrjedh nga galeria.

**Koha relative llogaritet në server, kurrë në komponent.** `timeAgo` mbi një datë brenda një
komponenti klienti prodhon varg tjetër në server dhe tjetër në hidratim, dhe hidratimi prishet. Kur
një etiketë kohe i kalohet një komponenti, i kalohet e gatshme si tekst.

Një komponent i vetëm `UserIdentityLine` kudo ku shfaqet një person.

```
[Avatar]  Erza Krasniqi  ✓  PRO
          UP · FSHMN · Viti III
```

Shenja e verifikimit është e ndarë nga PRO. Profesorët shfaqin chip roli në vend të vitit. Butoni
Ndiq shfaqet te koka e postimit kur autori nuk ndiqet ende. Konteksti i përbashkët del nën rresht.

**Lejet janë të dhëna, jo degë kodi.** Një `can(user, action, resource)` dhe një
`hasFeature(user, feature)` qendrore. Kurrë të shpërndara nëpër komponentë. Çdo kontroll zbatohet në
server.

### Rrethet e qasjes, fakulteti i pari

| Rrethi | Shtrirja | Falas | PRO |
| --- | --- | --- | --- |
| 1 | Lëndët e mia | Po | Po |
| 2 | Fakulteti im i tërë, të gjitha vitet | Po | Po |
| 3 | Fakultete të tjera brenda universitetit tim | Jo | Po |
| 4 | Universitete të tjera | Jo | Po |

**Përmbajtja e kyçur shfaqet me parapamje, kurrë e fshehur.** Titulli, fakulteti, lënda, faqet,
vlerësimi dhe ngarkuesi mbeten të dukshme, faqja e parë me blur, butoni "Hape me PRO".

**Muri i pagesës kurrë nuk bllokon kontributin.** Ngarkimi, pyetja, përgjigja, mesazhet, grupet e
fakultetit tënd dhe aplikimi për punë janë gjithmonë falas.

---

## 8. XP dhe reputacioni

Dy koncepte të ndara. XP është gamification. Reputacioni është besim.

**XP i Kontributit**, i vetmi që konvertohet në PRO: material i miratuar 15, material i vlerësuar
lart 5, përgjigje e pranuar 20, përgjigje e dobishme 8, kontribut eventi 10, ftesë që qëndron 7 ditë
25, profil i plotësuar 10, verifikim 25.

**XP i Aktivitetit**, vetëm nivele dhe renditje: postim 3, koment 2, hyrje ditore 1, reagim 0.5.

Penalizime: spam -20, përmbajtje false -30, abuzim -50.

Kufij ditorë dhe javorë në çdo burim. XP nuk transferohet, nuk ka vlerë monetare, ka histori të plotë
të dukshme te portofoli i XP-së.

Nivelet: 1 Student i ri, 2 Pjesëmarrës, 3 Kontribues, 4 Student i dobishëm, 5 Kontribues aktiv,
6 Ekspert i kampusit, 7 Ndërtues dijeje, 8 Udhëheqës komuniteti, 9 Kontribues akademik,
10 Legjendë e kampusit.

**XP në PRO:** 100 XP kontributi = 1 ditë, 2.500 = një muaj, 10.000 = një semestër. Llogaritë nën 7
ditë nuk këmbejnë.

**Kontributi fiton PRO drejtpërdrejt:** çdo material i miratuar jep 7 ditë PRO. Dhjetë materiale në
një muaj japin PRO për semestrin. Badge "Lider i lëndës" e mban PRO-n falas sa kohë mbahet. Ky rregull
e mban gjallë ofertën, sepse nëse mbajtësit më të mirë të shënimeve nuk e përballojnë PRO-n, nuk ka
çfarë të shitet.

Renditjet janë javore dhe vetëm brenda grupeve të vogla: viti yt, lënda jote, fakulteti yt. Kurrë
renditje globale. Vetëm top 10 dhe pozita e shikuesit, kurrë fundi.

---

## 9. Paratë

Kosova është kufizim që duhet projektuar përreth. **Stripe nuk i mbështet kompanitë e regjistruara në
Kosovë, dhe as PayPal.** Shtresa e faturimit nuk ndërtohet mbi Stripe.

`lib/billing/` me një ndërfaqe `PaymentProvider`: **Paddle** (Merchant of Record, rruga realiste për
abonime), **LocalBank** (ProCredit, NLB, Raiffeisen, redirect plus webhook), **BankTransfer** (IBAN me
kod referencë, konfirmim manual), **Voucher**, **Xp**, **Mock**.

E njëjta abstraksion shërben edhe abonimet PRO edhe blerjet e kurseve.

**Kurset e profesorëve:** ndarja 70/30, e ruajtur në konfigurim jo në kod. Çdo shitje shkruan një
zë në libër: bruto, tarifa e platformës, neto e instruktorit, tarifa e ofruesit. Panel instruktori me
shitje, të ardhura, pagesa në pritje dhe histori.

---

## 10. Dizajni

Ruaj gjuhën vizuale aktuale: interfejs premium, sfond i ngrohtë afër të zezës, indigo primare,
theks i përmbajtur, kufij të butë, karta të rrumbullakosura, hapësirë kompakte, hierarki e fortë.

Tokenat përkufizohen një herë te `app/globals.css`. **Asnjë ngjyrë hex në komponentë.** Errësira është
parazgjedhja, drita duhet të jetë e plotë. Vetëm dy opsione, E çelët dhe E errët, pa Sistemi.

Logoja është kapela e diplomimit mbi S-në në formë zemre (`BrandGlyph` te
`components/layout/brand.tsx`). Asistenti ka shenjën e vet «S-AI» (`AssistantMark`).

E gjelbra do të thotë i verifikuar, aktiv, i disponueshëm. E kuqja vetëm rrezik dhe gabim. Indigo është
theks, jo tapet.

Ngjyrat e fakulteteve: Ekonomik ambër, Mjekësi e kaltër, Juridik vjollcë, FSHMN e gjelbër, Filologjik
rozë, Arte magenta, FIEK cyan, Arkitekturë gri e ngrohtë, Bujqësi ulliri, Edukim koral.

Tipografia: Inter variable, një serif për tituj të mëdhenj, JetBrains Mono për numra. Shkallë fluide
me `clamp()`, rreshti 1.5 tekst dhe 1.1 tituj, maksimum 68 karaktere.

Hapësira 4px. Rrezja: 8 e vogël, 16 karta, 24 modale, 999 pilula. Hije të buta me ngjyrë brand, kurrë
të zeza. Kufij 1px.

Lëvizja: 150ms mikro, 250ms tranzicione, 400ms të mëdha, `cubic-bezier(0.32, 0.72, 0, 1)`. Optimistic
UI për reagime, ndjekje dhe ruajtje. Respekto `prefers-reduced-motion`.

**Kurrë spinner, gjithmonë skeleton në formën e përmbajtjes së vërtetë.**

**Asnjë ekran bosh nuk është vetëm tekst.** Ilustrim i vogël, një fjali njerëzore dhe një buton.

Aksesueshmëria: navigim me tastierë, focus i dukshëm, HTML semantik, ARIA, kontrast WCAG AA.

---

## 11. Rregullat kritike

- Mos ndërto maketë të bukur. Butonat punojnë, filtrat filtrojnë, tabs ndërrojnë, kërkimi kërkon.
- Çdo leje zbatohet në server. Fshehja në frontend është paraqitje, jo siguri.
- Një `isPro`, një `can`, një `hasFeature`. Kurrë të shpërndara.
- Reklama kurrë nuk dominon interfejsin dhe kurrë nuk duket si njoftim zyrtar.
- Zëri i kampusit kurrë nuk rrjedh te feed-i kryesor.
- Kurrë renditje vetëm mbi pëlqime.
- Kurrë mos shit ose ekspozo të dhëna personale të studentëve.
- Kurrë mos e blloko kontributin pas murit të pagesës.
- XP kurrë e fermuar, e transferuar ose e fituar pa kufi.
- Kurrë ekran bosh pa udhëzim, kurrë spinner aty ku duhet skeleton.
- Anglishtja e plotë, jo e pjesshme.
- Asnjë vizë e gjatë askund.
- Asnjë komponent gjigant monolit. Modular, i tipizuar, i ripërdorshëm.

Çdo veçori i përgjigjet një pyetjeje: a ia përmirëson kjo studentit jetën universitare, përparimin
akademik, zhvillimin profesional ose përvojën e komunitetit? Nëse po, ndërtoje me elegancë. Nëse jo,
mos e shto zhurmën.

---

## 12. Rendi i ndërtimit

| Fazë | Përmbajtja | Statusi |
| --- | --- | --- |
| 0 | Auditimi, pastrimi, IA e re, shtylla e majtë | **e mbyllur** |
| 1 | Identiteti, verifikimi tripjesësh, `can()` dhe `hasFeature()` | **e mbyllur** |
| 2 | Shtresa sociale: kompozues, stories, Duke ndjekur, reagime, Zëri i kampusit | **e mbyllur** |
| 3 | Shtylla e djathtë dhe asistenti i dokuar | **e mbyllur** |
| 4 | Akademia: materiale me tub cilësie, Q&A me përgjigje profesorësh | **e mbyllur** |
| 5 | Karriera: punë 3 për rresht, bursa, gjurmues aplikimesh, CV | **e mbyllur** |
| 6 | Profesorët dhe kurset online, libri 70/30, pagesat | **e mbyllur** |
| 7 | XP, PRO dhe faturimi | **e mbyllur** |
| 8 | Komuniteti, mesazhet, njoftimet | **e mbyllur** |
| 9 | Admini, moderimi, analitika, cilësia | **e mbyllur** |

Pas çdo faze: `npm run lint`, `npm run typecheck`, `npm run i18n:check`, `npm run test`,
`npm run build`. Zero gabime para se të vazhdohet.

### Verifikimi

Statik: `npm run lint && npm run typecheck && npm run i18n:check && npm run test && npm run build`

Në shfletues: `node scripts/e2e-social.mjs` kalon reagimet, tregun, grupet dhe profilin. Krijon
të dhëna prove, prandaj pas tij `npm run db:seed`.

Kundër serverit: `npm run smoke:all`, ose veç e veç `smoke`, `smoke:app`, `smoke:auth`,
`smoke:access`, `smoke:ia`, `smoke:phases`.

`smoke:access` e mat qasjen nga markup-i i renderuar (`data-locked`, `data-ad-card`,
`data-locked-overlay`), jo nga teksti, sepse next-intl e dërgon tërë katalogun në çdo faqe.

---

## 13. E shtyrë, jo e anuluar

- **Orari i ligjëratave.** Hequr në Fazën 0. Modelet `ScheduleSlot` dhe `ExamDate` mbeten në skemë,
  pa sipërfaqe. Kthehet kur fakulteti bashkohet me platformën dhe i jep të dhënat përmes integrimit.
- **Nota mesatare dhe llogaritësi i GPA-së.** Kurrë nuk u ndërtua. Mbetet jashtë për të njëjtën
  arsye.

Te faqja e udhërrëfyesit: "Orari dhe notat vijnë kur fakulteti yt bashkohet me platformën."

---

## 14. Shënime mjedisi

- Node.js 24 është instaluar portativ te `~/.local/node` dhe është në PATH.
- Në këtë makinë nuk ka PostgreSQL dhe as Docker. Lokalisht përdoret SQLite, me skemë të bartshme:
  pa enum, pa fusha vargje, pa tipin Json.
- Prisma e bllokon `--force-reset` kur e thërret një agjent AI, prandaj `npm run demo:reset` e lëshon
  përdoruesi.
- **Ngarkimi i skedarëve punon.** Bajtat shkruhen te `lib/storage.ts`, jashtë `public/`, me adresim
  sipas përmbajtjes. Merren vetëm nga `/api/media/[id]`, e cila kërkon sesion. Kufijtë dhe llojet e
  lejuara rrinë te `lib/media.ts`, si konfigurim. Kalimi te S3 është zëvendësim i tri funksioneve.
- Video është një lloj përmbajtjeje mes të tjerave, kurrë qendra. Pa luajtje automatike, pa feed
  vertikal me video. Kufiri i kohëzgjatjes është i shkurtër me qëllim: 30 sekonda te postimi, 15 te
  story.
- Asistenti punon me `MockAiProvider` derisa të vendoset një çelës modeli. Me `AI_BASE_URL`,
  `AI_API_KEY` dhe `AI_MODEL` kalon te modeli i vërtetë pa ndryshim kodi, dhe pa çelës e thotë hapur
  nën kutinë e shkrimit se përgjigjet janë demonstruese.
- Tekstet ligjore (kushtet, privatësia) rrinë te `content/legal.ts`, në të dy gjuhët, jo te katalogët
  e UI-së. Faqet janë `/ligjore/kushtet`, `/ligjore/privatesia` dhe `/moderimi/publik`.
- Kurset kanë faqe mësimi te `/kurset/[id]/mesimi/[lessonId]`. Qasja kontrollohet në server: i
  regjistruar, instruktori, ose mësim parapamjeje. Mësimet e demos janë tekst dhe kuize, jo video.
- Ikonat e PWA-së (`public/icon-*.png`, `apple-icon.png`) gjenerohen me `npm run icons` nga e njëjta
  formë si `BrandGlyph`. Kur ndryshon logoja, ndryshohen të dyja.
- Mos e nis kurrë `next dev` ndërsa `next start` punon nga e njëjta dosje. Të dy shkruajnë te `.next`
  dhe serveri i prodhimit fillon të kthejë HTML në vend të JavaScript-it.
- Numrat e XP-së dhe të ditëve Pro në tekste vijnë si parametra nga `lib/xp.ts`, kurrë të shkruar
  me dorë në katalog.
- **Prania është e vërtetë, kurrë e simuluar.** `lastSeenAt` e shkruan vetëm rrahja nga shfletuesi i
  studentit, te `/api/prania`, dhe vetëm kur skeda është e dukshme. Pragjet rrinë te `lib/presence.ts`.
  Në seed një pjesë e vogël duket aktive, që karta të demonstrohet, dhe kjo është e dhënë zhvillimi.
- Statusi ka dy çelësa privatësie të ndarë: pika e gjelbër dhe koha e fundit aktive. Kur studenti e ka
  fikur pikën, tjetri e sheh si jashtë linje, kurrë si «e fshehur».
