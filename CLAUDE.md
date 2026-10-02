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

1. **Shtylla e majtë ka gjashtë zëra:** pesë të parët dhe Gara, e shtuar me kërkesë të pronarit.
   Gjithçka tjetër shkon te shiriti i sipërm, te menyja e profilit, ose te tabs brenda faqes.
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

### 4.1 Shtylla e majtë, saktësisht gjashtë zëra

```
  Ballina          Home
  Materialet       Materials
  Karriera         Career
  Komuniteti       Community
  Tregu            Marketplace
  Gara             Competition

  [ + Posto ]

  [ Nga Studentët.KS ]   njoftimet, eventet, udhëtimet dhe takimet tona
  [ E sponsorizuar ]     reklama, jo për PRO
  [ Mundësi për ty ]     tri punë
  [ karta PRO ]
```

**Shtylla e djathtë mban zërin e platformës:** së pari njoftimet dhe organizimet tona, pastaj një
reklamë, pastaj njerëzit dhe dhomat. Majtas, nën navigim, rrinë vetëm mundësitë e punës dhe karta Pro.

**Shtylla e majtë (pjesa e vjetër e njoftimeve).** Nën navigim, rendi është gjithmonë: së pari njoftimet
e Studentët.KS (dhe të fakultetit të studentit), pastaj reklama, pastaj punët. Njoftimet i publikon
admini te `/admin/njoftimet`, dhe reklamat te `/admin/reklamat`, me lloj (njoftim, event, udhëtim, takim), datë, vend dhe shenjë «e
rëndësishme». Llojet dhe kufijtë rrinë te `lib/announcements.ts`. Shtylla ka gjerësinë e shtyllës së
djathtë, që feed-i të rrijë saktë në mes. Rri e ngjitur nën shirit me rrëshqitjen e vet të fshehur,
që navigimi të mos humbasë. Në celular dhe tablet këto karta dalin nën feed.

Logoja shfaqet vetëm një herë, te shiriti i sipërm. Eksploro u hoq sepse përsëriste Komunitetin, dhe
Pyetje u hoq sepse pyetja bëhet si postim. `/eksploro` dhe `/pyetje` ridrejtojnë, faqet e vjetra të
pyetjeve `/pyetje/[id]` mbeten të lexueshme.

**Karriera dhe Tregu filtrojnë me lista rënëse** (`UrlFilterSelect`): lloji, fusha dhe qyteti, me të 38
komunat e Kosovës (`KOSOVO_MUNICIPALITIES` te `lib/kosovo-places.ts`). Zgjedhja rri te adresa.

**Admini i ndryshon njoftimet tona drejt nga karta:** «Menaxho» te «Nga Studentët.KS» dhe «Ndrysho» te
dritarja e çdo njoftimi të platformës (`/admin/njoftimet?ndrysho=<id>` e hap vetë). Te paneli: titulli
dhe teksti në të dy gjuhët, data, vendi, lidhja, fotoja (e ngarkuar, del sipër tekstit te dritarja),
«E rëndësishme», fshehja dhe fshirja (`updateAnnouncement`, `deleteAnnouncement`, me gjurmë).

**«Mundësi për ty»** (`lib/job-recommend.ts`): punët që i përshtaten studentit. Fusha duhet të ketë lidhje
me programin ose fakultetin e tij; shpallja nga një fushë tjetër nuk del fare, përveç kur ai vetë ka
treguar interes (e ka hapur, filtruar, ruajtur, aplikuar, ose e ka te rolet e CV-së). Pastaj rendi:
përputhja akademike, çfarë kërkon më shumë (`JobSignal`: shikimet e shpalljeve dhe filtrat e Karrierës,
90 ditë), aftësitë e CV-së, interesat, viti, qyteti, afati. Kur s'ka mjaftueshëm, lista del më e shkurtër.

**Njoftimet tona te shtylla** tregojnë vetëm llojin (Njoftim blu, Event blu e çelët, Udhëtim vjollcë),
«E rëndësishme» në ar kur është, dhe titullin. Teksti, ora, vendi dhe afati hapen me prekje në një
dritare (`components/layout/announcement-list.tsx`), që shtylla të lexohet me një shikim.

**Ndërrimi i temës është i menjëhershëm:** `ThemeProvider` ka `disableTransitionOnChange`, që asnjë
ngjyrë të mos rrëshqasë në atë çast. Drita e logos (`--glow-brand`, `--glow-ai`) rri në mes, rreth e rrotull.

**Njerëzit te Kampusi** kanë kërkim me emër dhe shtatë pamje (`lib/queries/campus-people.ts`): Për ty,
Shokët, Duke ndjekur, Fakulteti im, Gjenerata ime, Profesorët, Të rinj. Çdo kartë ka ndjekjen si kornizë
dhe butonin që hap bisedën.

**Tregu** (`/tregu`) është vendi ku studentët shesin, falin ose kërkojnë libra, shënime, pajisje,
banim dhe shërbime. Kategoritë dhe kufijtë rrinë te `lib/market.ts`. Blerja nuk ndodh në platformë:
butoni hap bisedë me shitësin.

**Mjetet e testimit.** Butoni «Raporto» (`components/feedback/feedback-button.tsx`) rri mbi butonin e
asistentit në çdo faqe: problem me platformën ose sugjerim, me faqen, pajisjen dhe gabimet e fundit të
JavaScript-it të shtuara vetë. Raportet (`Feedback`) u shkojnë adminëve si njoftim dhe dalin te
`/admin/testimi`. `npm run bot:testers` hyn me llogaritë demo, ndjek lidhjet e faqeve në kompjuter
dhe celular dhe raporton vetëm probleme të platformës (gabime JS, 404/5xx, foto që nuk hapen, faqe që
rrëshqasin anash), si «Testuesi automatik». `/admin/pro` jep Pro me orë (48 orë = 2 ditë): shtohet mbi
atë që ka personi, mbaron vetë, shkruhet te `ProGrant`. Llogaria e pronarit në seed: `petrit.cana`,
password `12341234`, admin me Pro. Prova: `node scripts/e2e-admin-tools.mjs`.

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

1. **Kontekstuale.** Njerëz nga viti yt, vetëm te shtylla e djathtë. Ballina nis me stories dhe
   vazhdon me postimet: asnjë mur fytyrash mbi postimin e parë. Sugjerimet e ndjekjes dalin një herë
   pas regjistrimit, te `/mireseerdhe`. Ndryshon me faqen: punë të rekomanduara,
   materialet më të dobishme, pyetje pa përgjigje, grupe të sugjeruara.
2. **Dhomat e zërit dhe «Këtë javë».**

E sponsorizuara dhe njoftimet tona kaluan në shtyllën e majtë. Djathtas mbeten njerëzit dhe dhomat.

**Faqja zë tërë gjerësinë e ekranit.** Nuk ka kufi gjerësie në mes: shtylla e majtë, feed-i dhe
shtylla e djathtë shtrihen nga njëri skaj te tjetri me 40px anash, dhe feed-i zgjerohet me ekranin.

**Shtylla rrëshqet me faqen.** Një shirit i vetëm rrëshqitjeje për tërë dokumentin: asnjë `sticky` mbi
kolonën, asnjë `height` e fiksuar, asnjë `overflow` i vetin. Studenti nuk duhet ta arrijë kurrë fundin
e feed-it që kartat e shtyllës të lëvizin.

XP-ja del nga shtylla dhe nga shiriti. Jeton te menyja e avatarit dhe te profili.

### 4.4 Mobile

Navigim i poshtëm me pesë zëra: Ballina, Komuniteti, Posto (qendër, i ngritur), Mesazhe, Profili.
Materialet, Karriera, Tregu dhe Gara arrihen nga menyja e avatarit, ku shfaqen vetëm nën
gjerësinë `lg`. Shtylla
e djathtë bëhet seksione kontekstuale nën feed. Asnjë scroll horizontal.

---

## 5. Asistenti si widget i dokuar

Jo shtyllë, jo rrugë e vet. Buton pluskues poshtë djathtas, panel rreth 400x600px në desktop.

- Nuk e largon kurrë përdoruesin nga faqja. Faqja prapa mbetet aty ku ishte.
- **Një ofrues i vetëm: Groq** (`lib/ai/models.ts`, `lib/ai/openai-compatible.ts`). Studenti nuk zgjedh
  model. Tre modele: teksti (`gpt-oss-120b`), imazhet (`qwen3.8-27b`), titujt dhe përmbledhjet
  (`gpt-oss-20b`). Çelësi rri vetëm te serveri. Me `AI_BASE_URL` të xAI-t kalon te Grok pa ndryshim kodi.
- **Bisedat ruhen në bazë** (`AiConversation`, `AiMessage`). «Bisedë e re» nis fill të pastër,
  «Historiku» i hap të vjetrat (Sot, Dje, Këtë javë, Më herët), me fshirje. Titulli shkruhet nga modeli
  pas shkëmbimit të parë. API: `/api/asistenti/biseda` dhe `/api/asistenti/biseda/[id]`.
- **Biseda e gjatë:** modeli merr dritaren e fundit (`lib/ai/history.ts`, 40 mesazhe ose 10.000
  karaktere) plus përmbledhjen e pjesës më të vjetër, që shkruhet para përgjigjes kur mungon.
- **Pa mënyra të fiksuara.** «Shpjegoje thjesht», «bëj kuiz», «kontrollo përgjigjet» janë kërkesa si çdo
  tjetër. Asistenti është edukativ i gjerë dhe shumëgjuhësh: përgjigjet në gjuhën e pyetjes.
- **Imazhet:** foto, screenshot ose e ngjitur, deri në tri për pyetje, me parapamje dhe heqje para
  dërgimit. Zvogëlohen në shfletues. I sheh vetëm pronari i bisedës. Imazhi i dërgohet modelit vetëm me
  pyetjen e vet: plani falas i Groq-ut ka kufi tokenash në minutë.
- I vetëdijshëm për kontekstin: te një material e di cili material, dhe biseda e mban mend. Teksti i
  materialit hyn vetëm kur rrethi i qasjes e lejon. Përndryshe modeli merr vetëm titullin dhe thotë që
  hapet me Pro.
- Materialet e ngarkuara lexohen vërtet (`lib/materials/extract.ts`): PDF faqe për faqe me `[Faqja N]`,
  DOCX, PPTX slajd për slajd, dhe fotot e shënimeve të transkriptuara.
- Nën përgjigje dalin vetëm burimet që modeli citoi. Asnjë rresht tjetër.
- Siguria: refuzohen vetëm udhëzimet që lehtësojnë dëm, shkurt dhe me alternativë edukative. Refuzimi i
  gatshëm anglisht i modelit riprovohet, dhe nuk i shfaqet studentit.
- Gabimi: «AI-ja nuk është e disponueshme për momentin. Provo përsëri.», me riprovim që nuk e dyfishon
  pyetjen dhe nuk e numëron dy herë.
- Minimizimi e kthen te butoni, biseda mbetet gjallë për sesionin. Në mobile hapet si fletë poshtë,
  rreth 85 për qind lartësi.
- Nuk e shkruan detyrën në vend të studentit.
- Falas: 10 mesazhe në ditë. PRO: 200.

---

## 6. Shtresa sociale

- **Stories:** shirit horizontal në krye të feed-it, 24 orë, foto ose video deri 15 sekonda,
  kronologjike me të pashikuarat të parat, max 10 në ditë. Krijimi nis drejt me foto ose video, pa
  ekran ndërmjetës dhe pa zgjedhje shtrirjeje. Fotoja e mbush tërë storjen (9:16, e prerë anash). Teksti
  shkruhet drejt mbi foto, aty ku prek studenti, pa kuti teksti më vete; prekja e tekstit e hap për
  shkrim, tërheqja e lëviz. Filtri ndërrohet me rrëshqitje mbi foto (telefoni) ose me pilulat nën foto. Editori (`components/stories/story-editor.tsx`) ka
  tekst, vizatim, emoji dhe filtra; te fotot shtresat piqen brenda imazhit, te videot ruhen si JSON.
  **Kush i sheh:** ndjekësit te rafti, plus vizitori i profilit kur profili është publik.
  **Veprimet te shikuesi** (`components/feed/story-viewer.tsx`): te storja ime, poshtë, **Shto në dosje**
  (dosje ekzistuese ose e re, `story-owner-bar.tsx`), **Arkivo** (del nga rafti menjëherë, mbetet te
  arkivi) dhe **Fshije** me konfirmim. Te storja e tjetrit, **përgjigjja** dhe **reagimi**
  (`story-reply-bar.tsx`, emoji-t te `lib/story-reactions.ts`) shkojnë si mesazh te biseda me autorin,
  me storjen bashkë (`Message.storyId`, llojet `story_reply` dhe `story_reaction`). Një reagim për
  person dhe storje: i dyti e ndërron. `sendMessage` nga shfletuesi nuk pranon storje; lidhja bëhet
  vetëm te `replyToStory` dhe `reactToStory`, pasi serveri kontrollon që storja shihet. Storja ndalet
  sa kohë studenti shkruan ose ka panel të hapur.
  **Koha e storjes** ecën me `requestAnimationFrame` (jo me animacion CSS, që `prefers-reduced-motion` e
  shkurton në zero): shiriti i storjes aktuale mbushet para syve, videoja zgjat sa kohëzgjatja e vet.
  Mbajtja e gishtit (mbi 200ms) e ndal storjen dhe lëshimi nuk kalon te tjetra.
  **Pllakat e raftit** (`components/feed/story-bar.tsx`) tregojnë personin, jo storjen: fotoja e profilit
  mbush pllakën, dhe kur mungon del avatari i parazgjedhur i gjinisë. Unaza e
  perëndimit për të pashikuarat, gri dhe e zbehur për të shikuarat. Pllaka e parë është fotoja jote me
  «+» blu te qoshja. Profesorët dalin me titull dhe mbiemër («Prof. Berisha»).
- **Kompozuesi është social, jo formular.** Hapet si dritare në mes të ekranit, jo si fletë nga
  poshtë, në desktop dhe në celular. Gjendja e parë: avatar, «Çfarë po ndodh?», «Krijo», asnjë ikonë
  mediash. Brenda: teksti, pastaj katër butona të njëjtë në rrjetë 2x2, **Foto / Video** (një galeri e vetme për të dyja)
  dhe **Kamera** (`components/feed/camera-capture.tsx`: pamje e gjallë me `getUserMedia`, foto ose video
  deri 30 sekonda, rishikim para se të hyjë te postimi, kamera vendase me `capture` kur shfletuesi nuk e
  lejon), **Sondazh** dhe **Zë**. «Posto» është blu me aeroplan letre. Shtrirja është listë vertikale
  me përshkrim për secilën zgjedhje, dhe është vendim i dytë
  dhe rri e mbyllur derisa studenti ta kërkojë. Kufiri i tekstit 1000 shenja, me numërues vetëm mbi 800.
- **Kush e sheh postimin, katër zgjedhje:** Fakulteti im, Universiteti im, Të gjithë studentët e
  Kosovës, Vetëm ndjekësit (`POST_SCOPES` te `lib/types.ts`). Universiteti dhe kombëtarja kërkojnë Pro.
  «Lënda ime» dhe «Gjenerata ime» u hoqën: ndanin të njëjtin fakultet dhe studenti nuk e dinte kurrë
  se cilën po zgjidhte. Postimet e vjetra me ato shtrirje mbeten të dukshme, sepse filtri i njeh ende.
- **Materialet dhe eventet nuk krijohen nga ballina.** Ato jetojnë aty ku kanë kuptim: te Materialet
  dhe te Eventet. Pyetja bëhet si postim i zakonshëm. Zëri i kampusit ka formën e vet te Komuniteti.
- **Grafi i ndjekjes:** asimetrik. Kur të dy ndjekin njëri-tjetrin bëhen **Shokë**: DM pa kufi,
  kontekst i përbashkët, njoftim.
- **Tabs të feed-it, saktësisht katër:** **Duke ndjekur** (parazgjedhja, rreptësisht kronologjik,
  vetëm ata që ndjek), Fakulteti im, Universiteti im, Global (PRO). Aktivi është pilulë e çelët me tekst të
  errët, të tjerët tekst i qetë (`.feed-tab` te `globals.css`). Pa rresht shpjegimi poshtë: shpjegimi rri te `title` i pilulës.
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
- **«Dërgo» te postimi** (`components/feed/share-post-dialog.tsx`, `sharePost`): bisedat e fundit, shokët
  dhe kërkimi i njerëzve, deri 20 njëherësh, me shënim nëse do. Postimi shkon si kartë
  (`Message.postId`, lloji `post_share`); ndan vetëm kush e sheh, dhe marrësi që s'e ka në rrethin e vet
  sheh vetëm që nuk hapet. Zëri i kampusit nuk ndahet.
- **@përmendjet dhe #hashtag-ët** (`lib/mentions.ts`, `RichText`): te postimet, komentet dhe storjet
  bëhen lidhje, @ te profili, # te `/hashtag/[tag]` (postimet me temën, vetëm brenda rrethit të shikuesit).
  Te fusha e postimit dhe e komentit, @ sugjeron njerëz (`MentionSuggest`). Përmendja njofton vetëm kush
  e sheh vërtet postimin dhe s'është bllokuar (`notifyMentions` te `lib/notify.ts`); te storja, emrat
  dalin si çipa që hapin profilin dhe njoftimi të çon te profili i autorit.
- **Komentet:** përgjigja ka një nivel të vetëm, dhe përgjigja te një përgjigje shkon te komenti i
  parë. Autori i komentit njoftohet. Kush fshin komentin e vet fshin edhe përgjigjet nën të.
- **Fusha e bisedës** është një rresht i drejtë, si ajo e dhomës, me «+» brenda saj
  (`components/messages/attach-menu.tsx`): Foto ose video, Bëj foto, Skedar. Mikrofoni rri jashtë, djathtas. Skedarët (PDF, Word, Excel, PowerPoint, ZIP, tekst, deri 25MB) lejohen vetëm te
  biseda (`surface: "message"`), njihen nga bajtat (`documentMime`), jo nga lloji që thotë shfletuesi, dhe
  shkarkohen me `content-disposition: attachment`, kurrë nuk hapen brenda faqes. Çdo bashkëngjitje e
  mesazhit rindërtohet nga baza te `lib/attachments.ts`: pranohen vetëm skedarët që i ngarkoi vetë dërguesi.
- **Mesazhet e zërit:** deri dy minuta (`MAX_VOICE_SECONDS` te `lib/media.ts`). Në kompjuter një
  klikim e nis dhe «Ndalo» e ndal; në telefon mikrofoni mbahet i shtypur dhe lëshimi e ndal. Pas ndalimit
  zëri dëgjohet para dërgimit; Enter ose shigjeta e dërgon, koshi e hedh. Mikrofoni dhe kamera
  lejohen vetëm për origjinën tonë te `next.config.ts`, dhe skedarët e bisedës i hap vetëm kush është brenda.
- **Bisedë e re dhe kërkimi i njerëzve:** te `/mesazhe` dhe te paneli i mesazheve në shirit ka një fushë
  «Kërko njerëz për t'u shkruar» (`components/messages/people-search.tsx`), dhe butoni «Bisedë e re» hap të
  njëjtin kërkim me shokët si sugjerim (`/mesazhe?e-re=1` e hap vetë). Prekja e personit hap bisedën
  ekzistuese ose nis një të re; nëse pranohet menjëherë apo si kërkesë e vendos `startConversation`.
- **Dhomat e zërit kanë zë të vërtetë** (`components/voice/use-voice-mesh.ts`): WebRTC mes shfletuesve,
  rrjet i plotë, me «perfect negotiation». Serveri çon vetëm sinjalet (`VoiceSignal`,
  `/api/zeri/[id]/sinjal`, vetëm mes njerëzve me vend të gjallë, të fshira sapo lexohen). STUN publik
  mjafton në shumicën e rrjeteve; për rrjetet e mbyllura vendosen `VOICE_TURN_URLS`,
  `VOICE_TURN_USERNAME` dhe `VOICE_TURN_CREDENTIAL`. Kush po flet matet nga vetë zëri, pa server, dhe
  unaza e tij ndizet. Mikrofoni është vetëm ikonë: i gjelbër kur je në zë, i kuq me vijë kur je i heshtur.
  Pritësi dhe moderatori kanë «⋯» te çdo vend: folës, dëgjues, heshtje dhe largim me konfirmim. Kush
  largohet nuk hyn dot më në atë dhomë (`VoiceParticipant.removedAt`). Çdo pjesëmarrës fton njerëzit që ndjek ose
  që e ndjekin («Fto», njoftim `voice_invite` që të çon te dhoma). Ftesa e pritësit ose e moderatorit
  (`VoiceInvite.grantsEntry`) e hap derën edhe pa fjalëkalim dhe jashtë rrethit, jo mbi kapacitetin; ajo
  e të tjerëve është vetëm njoftim, që një dëgjues të mos e hapë një dhomë me fjalëkalim. Biseda e dhomës merr foto, video
  dhe skedarë, që i hap vetëm kush ka pasur vend aty.
- **Grupet e bisedës:** deri në 30 anëtarë bashkë me krijuesin (`MAX_GROUP_CHAT_MEMBERS` te
  `lib/constants.ts`). Shtohen vetëm njerëz që ndjek ose që të ndjekin. Kush nuk është shok me
  krijuesin e merr grupin si kërkesë. Çdo anëtar mund të shtojë të tjerë dhe të dalë.
- **Pamja e bisedës** (`components/messages/message-bubble.tsx`, `conversation-view.tsx`): balona 18px me
  qoshe të vogël nga ana e folësit, e imja me gradient blu (`bg-bubble-mine`), e tjetrit mbi sipërfaqe me
  kufi, gjerësi deri 72%. Mesazhet e një personi brenda pesë minutave janë një grup: avatari dhe ora vetëm
  te e fundit, ora e të tjerave me prekje. Ditët ndahen me kapsula «Sot», «Dje», «27 shtator» (`dayHeading`
  te `lib/format.ts`, në server). Gjendja: një vijë kur u dërgua, dy vija të errëta kur arriti, dhe 👀 pa
  tekst në vend të vijave kur e pa (te grupi kur e pa dikush, numri te `title`); shenjat e leximit fiken te
  cilësimet. «Po shkruan» është balonë me tri pika. Dy prekje japin ❤️, tërheqja anash bën përgjigje,
  prekja e citimit të çon te origjinali. Pa përgjigje të shpejta dhe pa sugjerime teksti; biseda bosh
  thotë vetëm «Nis me një pyetje». Fusha është një drejtkëndësh: «+» majtas në mes, mikrofoni (ose
  dërgimi) djathtas brenda saj. Te kompjuteri `/mesazhe` ka dy kolona (`app/(app)/mesazhe/layout.tsx`),
  me vend djathtas për butonat pluskues.
- **«Bëj foto» kudo** (biseda, kompozuesi, dhoma e zërit): në telefon hap drejt kamerën e pajisjes
  (`openDeviceCamera` te `components/feed/camera-capture.tsx`, brenda prekjes), në kompjuter kamerën e
  laptopit që ndizet vetë në dritare.
- **Cilësimet e bisedës** (butoni ⓘ, `components/messages/chat-settings.tsx`): heshtja e njoftimeve për
  1 orë, 8 orë, 1 ditë, 1 javë ose derisa t'i ndezë (`ConversationMember.mutedUntil`, vlerat te
  `lib/chat-rules.ts`; e heshtura nuk krijon njoftim dhe nuk hyn te numri i shiritit), dhe çfarë është
  ndarë: fotot e videot, skedarët, linqet (`/api/mesazhe/[id]/te-ndara`). Te grupi: anëtarët me rolin.
- **Admini i grupit** (`ConversationMember.role`): krijuesi është admini i parë, dhe grupi nuk mbetet
  kurrë pa admin (kur del i fundit, admin bëhet kush është aty më gjatë; grupet e vjetra e marrin te
  `getConversation`). Admini: «Vetëm adminët shkruajnë» (`Conversation.adminsOnly`), «Lejo linqet»
  (`allowLinks`, kontrolli `containsLink`), bën ose heq admin, largon anëtarë
  (`lib/actions/chat-settings.ts`). Të gjitha kontrollohen te `sendMessage` në server.
- **Thirrjet në bisedë** (`ChatCall`, `ChatCallParticipant`, `lib/actions/calls.ts`): zë ose video, me
  të njëjtin rrjet WebRTC si dhomat (`useVoiceMesh` me `signalUrl`, `camera`, `facing`, `speakerOn`),
  sinjalet te `/api/thirrje/[id]/sinjal`, rrahja te `/api/thirrje/[id]`. Te biseda me dy veta thërret
  kushdo dhe kur njëri mbyll, mbaron për të dy. Te grupi thirrjen e nis vetëm admini; të tjerët e shohin si
  shirit «Hyr» dhe vendosin vetë; admini e mbyll për të gjithë. Thirrja shënohet si rresht në bisedë
  (`kind: "call"`) dhe njofton anëtarët që nuk e kanë heshtur bisedën.
- **Zilja kudo** (`components/messages/call-provider.tsx`, brenda `AppChrome`): çdo faqe pyet
  `/api/thirrje/hyrese` çdo 3 sekonda kur skeda shihet. Dritarja e ziles ka «Prano» të gjelbër dhe «Refuzo»
  të kuqe, tingull dhe dridhje. Refuzimi (`declineCall`, `declinedAt`) e mbyll thirrjen me dy veta; pas
  45 sekondash pa përgjigje thirrja humbet (`RING_SECONDS`, `endReason`: declined, missed, ended), dhe
  thirrësi e sheh pse. Thirrja jeton te ofruesi, jo te faqja: me «Zvogëlo» bëhet pilulë poshtë dhe studenti
  lëviz nëpër platformë pa e humbur zërin.
- **Kontrollet e thirrjes** (`call-view.tsx`): mikrofoni, altoparlanti (zëri i të tjerëve), kamera që
  ndizet edhe në thirrje zanore, kthimi i kamerës përpara ose mbrapa kur pajisja ka dy, dalja. Cilësia:
  zëri me pastrim jehone e zhurme në 48 kHz dhe 96 kbps, pamja deri 1080p me 30 kuadro dhe 2.5 Mbps; pajisja
  jep rezolucionin më të mirë që ka. Kamera e fikur dhe kthimi bëhen me `replaceTrack`, pa negocim të ri.
- **Mesazhet, kolona majtas:** «Bisedë e re» (kërkim te gjithë platforma) dhe kërkimi te bisedat e mia.
- **Ndiqe edhe ti:** te njoftimet, pasi pranon kërkesën ose kur dikush të ndjek, ndjekja mbrapsht është
  një buton aty (`components/social/follow-back-button.tsx`), pa hapur profilin.
- Prova: `npm run e2e:chat-design` (pamja, gjendja, cilësimet, kamera e telefonit) dhe
  `npm run e2e:chat-groups` (rregullat e grupit, zilja kudo, pranimi e refuzimi, kontrollet, thirrja që
  vazhdon nëpër faqe, zëri dhe kamera mes dy shfletuesve, ndjekja mbrapsht).

### Renditja

```
Score = 0.30 afërsi sociale + 0.25 relevancë akademike + 0.20 freski (gjysmë-jetë 8 orë)
      + 0.15 dobi (ruajtje dhe komente 3x mbi pëlqime) + 0.10 shumëllojshmëri - penalizime
```

**Formula nuk printohet kurrë në UI.** Ky është dokumentacion i brendshëm. Nëse shfaqet shpjegim, ai
është njerëzor: "Sepse ndjek Ekonometrinë", "Sepse është nga fakulteti yt".

---

## 7. Identiteti, verifikimi dhe qasja

Verifikimi ka dy pjesë: emaili studentor me kod dhe fotoja e ID-së studentore, që e shikon moderimi.
Fotoja ruhet private: e hap vetëm pronari dhe moderimi (`lib/media-access.ts`), pa cache, dhe fshihet
sapo merret vendimi. Selfie-ja u hoq.

**Hierarkia akademike ndryshon sipas institucionit, dhe kjo nuk fshihet.** Universitet publik do të
thotë universiteti, pastaj fakulteti, pastaj programi. Kolegj privat do të thotë kolegji, pastaj
programi: kolegjet nuk kanë fakultete, prandaj ai hap as nuk shfaqet. Katalogu rri te
`prisma/academic/catalog.ts`, i gjeneruar nga lista e AKA-së, dhe mbillet me `npm run seed:academic`.
Zgjedhja bëhet nga `AcademicPicker` te cilësimet dhe nga magjistari te `/regjistrohu`, të dy mbi
`lib/academic-client.ts` dhe `/api/akademia`. Niveli vjen pas programit, sepse studenti e mendon
programin si një gjë të vetme dhe pastaj thotë Bachelor apo Master. Vitet që ofrohen janë ato që ka
vërtet programi (`yearsForProgram`).

**Hyrja dhe regjistrimi** (`components/auth/`, pjesët e përbashkëta te `auth-ui.tsx`): fusha 52px,
butona 56px, fokus blu me unazë 4px, tituj me serif. `/regjistrohu` hap «Mirë se vjen» me «Vazhdo me
Google» (i rekomanduar) dhe «Vazhdo me email studentor» (`?me=email`, `student-register.tsx`).
`/regjistrohu/llogaria` është «Krijo llogarinë tënde»: emri dhe emaili nga Google vetëm për lexim,
username-i i kontrolluar në bazë pa u rezervuar (`suggestUsername`), data e lindjes, password-i me fuqi,
rregulla dhe përputhje (`lib/password-rules.ts`, të njëjtat te serveri).

**Google është i lidhur** kur `.env` ka `AUTH_GOOGLE_ID` dhe `AUTH_GOOGLE_SECRET` (vendosen me
`npm run google:key -- <ID> <SECRET>`, që shtyp edhe adresat për Google Cloud Console). Rrjedha:
«Vazhdo me Google» → zgjedhja e llogarisë (`prompt=select_account`) → hyn vetëm kush e ka emailin të
konfirmuar nga Google (`email_verified` te `signIn`) → llogaria krijohet te `lib/auth-adapter.ts`
(adapteri i Prisma-s nuk dinte për `username` dhe shkruante `image`), me `awaitingReview` dhe, kur adresa
është studentore, me emailin studentor të lidhur pa kod → `/regjistrohu/llogaria` vendos password-in dhe
datën e lindjes një herë (`setGooglePassword`) → emaili studentor me kod, vetëm kur Google-i nuk ishte
studentor → fotoja e ID-së → profili. Kush ka sesion pa password çohet te
`/llogaria`; gabimet e Google-it dalin te `/hyr?error=`. Pa çelësa, butoni mbetet demonstrues (1.4s,
`DEMO_GOOGLE_PROFILE`). **Password-i i harruar kalon nga Google:** «Vazhdo me Google» te `/harrova-password` vendos qëllimin
(`sks_pw_reset_intent`, 10 minuta) dhe e çon studentin te Google. Kur Google e konfirmon emailin,
`lib/auth.ts` (`events.signIn`) lëshon një leje të nënshkruar vetëm për atë llogari (`sks_pw_reset_pass`,
10 minuta, `lib/password-reset.ts`), dhe studenti kthehet vetë te `/harrova-password/i-ri`: «Password-i i
ri» dhe «Përsërit password-in e ri». Leja vlen një herë (hash-i ruhet si i shpenzuar te `PasswordReset`).
Kush zgjedh një email Google pa llogari këtu nuk krijon llogari të re: kthehet me shpjegim. Askush, as
adminët, nuk sheh password ose lidhje. Kur emaili lidhet me një ofrues, del edhe lidhja me email (një orë,
një herë), që dërgohet vetë. Prova: `npm run e2e:auth-ui`,
`npm run e2e:google-flow`, `integration/google-adapter.test.ts`.

**Regjistrimi vetëm për studentë, me email studentor, kod dhe ID.** Formulari merr emrin, mbiemrin,
datën e lindjes (nga 16 vjeç, `lib/age.ts`), emailin studentor dhe password-in. Pranohen vetëm domenet
te `lib/student-domains.ts`: lista e hulumtuar, me burimin dhe me `confirmed` ose `official` për secilin,
pa domenet e stafit (`uni-pr.edu`). Institucionet e hulumtuara që s'janë ende te katalogu
(`UPCOMING_INSTITUTION_DOMAINS`: Universum, Riinvest, Dardania, Prizreni dhe të tjerë) marrin mesazh me
emrin e tyre; hyjnë sapo katalogu t'i ketë programet. Rendi te `/regjistrohu`: të dhënat → kodi
gjashtëshifror te emaili (`lib/registration.ts`, 15 minuta, pesë prova, ridërgim pas 45 sekondash) →
fotoja e ID-së (`IdStep`, ngarkim me `surface: "id"`) → profili, me institucionin të caktuar nga emaili
(hapi i zgjedhjes nuk shfaqet, dhe `saveAcademicProfile` refuzon program tjetër). Faqja e gjen vetë ku ka
mbetur studenti. Emaili studentor ruhet te `User.studentEmail`, unik: një email, një llogari.

**Emaili dërgohet vërtet** me `npm run mail:key -- gmail <adresa> <app-password>` (sot, pa domen) ose
`npm run mail:key -- resend <çelësi> <nga@domeni>` (kur të ketë domen). Lokalisht `MAIL_ALLOW_ONLY`
lejon emailin e vërtetë vetëm te adresat e pronarit: seed-i ka domene të vërteta dhe emra që mund t'i
përkasin dikujt, prandaj çdo adresë tjetër shkon te regjistri i serverit (`mailReaches` te `lib/email`).
Kur emaili nuk arrin te adresa, lokalisht `MAIL_DEV_CODE=1` e shfaq kodin te faqja; në host asnjë nga
këto dy rreshta nuk ekziston.

**Deri te miratimi, llogaria e re vetëm shikon** (`User.awaitingReview`). Lexon feed-in (hapet te
«Fakulteti im»), profilet, materialet dhe punët, por nuk poston, komenton, pëlqen, ripostion, nuk bën
storje, mesazhe, thirrje, ndjekje, ngarkime materialesh, aplikime, grupe, evente, dhoma zëri dhe gara.
Roja është te serveri: `requireParticipant()` te `lib/session.ts`, mbi `can(actor, "participate")`, e çon
te `/verifikimi`. Ndërfaqja e thotë para kohe: shiriti «Llogaria jote po shqyrtohet» (`ReviewBar`) dhe
`useReviewGuard()` te butonat. Ruajtja e një pune mbetet e lirë. Moderimi (`/moderimi?tab=verifikimet`)
sheh foton, emailin studentor, institucionin dhe datën e lindjes; miratimi jep shenjën dhe hap llogarinë
me njoftim, refuzimi kthen arsyen dhe `/verifikimi` merr foto të re. Llogaritë e vjetra nuk preken.
Prova: `npm run e2e:registration`, `tests/registration.test.ts`.

**Hyrja mbaron te llogaria, jo te ndjekjet.** «Hap llogarinë time» ruan foton, bio-n, qytetin dhe
shkollën, e mbyll hyrjen dhe çon te `/mireseerdhe`, ku dalin profilet e sugjeruara. Aty ndjekja është
ftesë: «Shko te ballina» punon edhe pa ndjekur askënd. Emri te hapi i profilit rri vetëm për lexim,
sepse vjen nga llogaria me të cilën studenti u regjistrua.

**Profili ka dy gjendje: publik dhe privat.** Privat do të thotë se çdo ndjekje e re vjen si kërkesë
(`Follow.status`), dhe se postimet, media dhe stories i sheh vetëm ndjekësi i pranuar. Filtri i
ndjekjeve të pranuara rri te `lib/follow.ts` dhe e përdor çdo pyetje që numëron ose lexon.

**Profili është profil social, jo CV.** Rendi: kopertina, avatari mbi të, emri, @username,
verifikimi, statusi online, bio, konteksti akademik, ndjekësit, tabs. Hapet gjithmonë te **Postimet**,
kurrë te Materialet. Postimet e profilit përdorin `PostCard`, të njëjtin që përdor feed-i:
një postim duket njësoj kudo.

Koka e profilit mbahet e ulët: avatari, emri, një rresht i vogël me rolin, universitetin, fakultetin
dhe vitin, pastaj numrat (postime, ndjekës, ndjek, shokë) dhe butonat Ndiq dhe Mesazh. Postimet dalin
menjëherë poshtë, nga më i riu, pa rresht filtrash.

Nën kokë rrinë **dosjet e storjeve** (`StoryHighlight`): pronari zgjedh nga arkivi i storjeve të veta,
edhe të skaduarave, dhe i mban në profil me titull. Storja në dosje nuk fshihet kur skadon. Kush e sheh
profilin i sheh edhe dosjet. Kufijtë rrinë te `lib/highlight-limits.ts`. Dosja ka foto rrethi
(`coverUrl`): një foto e ngarkuar nga pronari ose një nga storjet e saj, e zgjedhur te dialogu i
dosjes, i cili hapet edhe nga «Ndrysho dosjen» brenda shikuesit.

Skedat, si te Instagram, me ikonë: Postime, Riposte, Të ruajtura (vetëm pronari) dhe Materiale. Media
dhe Rreth u hoqën. **Badge-t** dalin si ikona të vogla te koka, pa seksion më vete: kalimi i miut ose
prekja tregon çfarë janë dhe si fitohen. Te profili im veprimet janë «Ndrysho profilin» plus dy ikona,
Ngarko material dhe Pro. XP-ja del si kartë e ngjeshur me dy shirita «sa / nga sa».

**Koha relative llogaritet në server, kurrë në komponent.** `timeAgo` mbi një datë brenda një
komponenti klienti prodhon varg tjetër në server dhe tjetër në hidratim, dhe hidratimi prishet. Kur
një etiketë kohe i kalohet një komponenti, i kalohet e gatshme si tekst.

**Avatari pa foto:** një i vetëm për secilën gjini, i njëjtë për të gjithë, siluetë e sheshtë në ngjyrat e
markës pa ngjyrë lëkure (`public/avatars/`): djalë, vajzë, ose neutral kur studenti nuk e ka thënë. Gjinia
(`User.gender`) zgjidhet te cilësimet dhe në hapin e fundit të hyrjes, dhe **kurrë nuk hamendësohet nga
emri**. `lib/db.ts` e plotëson `avatar` në çdo lexim (`lib/default-avatar.ts`), prandaj çdo vend që tregon
një person e merr vetvetiu. Në bazë `avatar` mbetet null derisa të ngarkohet foto; «a ka foto» pyetet me
`isDefaultAvatar`, kurrë me `!avatar`.

Një komponent i vetëm `UserIdentityLine` kudo ku shfaqet një person.

```
[Avatar]  Erza Krasniqi  ✓  PRO
          UP · FSHMN · Viti III
```

Shenja e verifikimit është e ndarë nga PRO. Profesorët shfaqin chip roli në vend të vitit. Butoni
Ndiq shfaqet te koka e postimit kur autori nuk ndiqet ende. Konteksti i përbashkët del nën rresht.

**Skedarët e ngarkuar ndjekin përmbajtjen.** `/api/media/[id]` nuk mjaftohet me sesionin: kontrollon
te `lib/media-access.ts` nëse shikuesi e sheh dot storjen ose postimin ku është bashkëngjitur skedari.
Ngarkimi bëhet me copa te `/api/ngarko`, sepse server actions e presin trupin te një megabajt.

**Lejet janë të dhëna, jo degë kodi.** Një `can(user, action, resource)` dhe një
`hasFeature(user, feature)` qendrore. Kurrë të shpërndara nëpër komponentë. Çdo kontroll zbatohet në
server.

### Rrethet e qasjes, fakulteti i pari

| Rrethi | Shtrirja | Falas | PRO |
| --- | --- | --- | --- |
| 1 | Fakulteti im i tërë, të gjitha vitet | Po | Po |
| 2 | Fakultete të tjera brenda universitetit tim | Jo | Po |
| 3 | Universitete të tjera | Jo | Po |

«Lëndët e mia» u hoq si rreth dhe si skedë te Materialet: kërkonte që studenti t'i kishte zgjedhur
lëndët një nga një, dhe pa atë hap dilte bosh. Fakulteti e mbulon të njëjtën nevojë.

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

## 8.1 Gara

Beteja kuizi, kuizi i ditës dhe gara mes universiteteve, te `/gara`. Është zëri i gjashtë i shtyllës
së majtë, pas Tregut. Në celular del te menyja e avatarit, bashkë me Materialet, Karrierën dhe Tregun,
dhe Komuniteti ka kartën e vet që të çon aty.

- **Pikët e garës janë të ndara nga XP-ja.** Shkruhen vetëm te `lib/competition/points.ts`, te regjistri
  `CompetitionPoint`, unik sipas (studentit, burimit, id-së): asgjë nuk numërohet dy herë. Rregullat dhe
  kufijtë rrinë te `lib/competition/rules.ts` dhe shfaqen te faqja «Si fitohen pikët».
- Universitetit i japin pikë vetëm studentët e verifikuar, me universitetin e llogarisë së tyre.
- Kontributet numërohen kur kanë cilësi: materiali kur verifikohet, përgjigjja kur pranohet, postimi kur
  e ruajnë pesë të tjerë. Përmbajtja e fshirë ose e moderuar i humb pikët (`contributions.ts`).
- Betejat llogariten te serveri (`battles.ts`): pyetjet dërgohen pa përgjigjen e saktë, afati mbahet
  me orën e serverit, rezultati i kundërshtarit fshihet derisa ta mbarosh edhe ti.
- Kuizi i ditës: një betejë në ditë (`dailyKey` unik), një hyrje për studentin.
- Mirëmbajtja (skadimi, mbyllja e javës, ngjarjet e mbaruara) ndodh kur hapet gara, pa proces në
  sfond, dhe çdo hap është idempotent.
- Renditjet tregojnë njëzet të parët dhe vendin e shikuesit. Kërkesa e re lejon edhe renditjen «Të
  gjithë», pranë filtrave universiteti, fakulteti, programi dhe viti.
- Pa baste, pa monedha, pa blerje: Pro nuk jep përparësi në garë.

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

**«Blu»** (tema «Sistemi»), nga referenca e pronarit dhe nga logoja: sfond blu marine (`--bg` #0f2451), drita
të gjera blu pas gjithçkaje (`--bgfx` te `.aurora` në `AppChrome`), karta prej xhami të ftohtë
(`glass`: `--surface` gjysmë e tejdukshme, kufi 1px, hije e thellë, `backdrop-filter`). Pa
`backdrop-filter` xhami bëhet `--surface-solid`. Çdo gjë që pluskon mbi faqe (dialog, meny, fletë,
toast, tooltip, paneli i asistentit) përdor `bg-surface-solid`, kurrë xhamin.

Tokenat përkufizohen një herë te `app/globals.css`. **Asnjë ngjyrë hex në komponentë.** Tri tema
(`data-theme`, `THEME_OPTIONS` te `components/shared/theme-toggle.tsx`), te shiriti dhe te menyja e avatarit:
**Sistemi** (`blue`, parazgjedhja): blu marine me dritat e referencës; **Errësirë** (`dark`): e zezë e
pastër, pa drita, me të njëjtat theksa; **Dritë** (`light`): e bardhë e pastër. «Sistemi» është blu e
platformës, jo ndjekja e pajisjes. Blu dhe e zeza ndajnë variantin `dark:` dhe bllokun e përbashkët; e
zeza mbishkruan vetëm sfondet, sipërfaqet dhe tekstet (`:root[data-theme="dark"]`). Zgjedhja ruhet te
`sks-theme`. Kontrasti AA provohet për të tria te `tests/design-tokens.test.ts`.

Një ngjyrë, një punë:

- **Veprimi kryesor** (`primary`, `bg-primary-grad`): Posto, Krijo, butoni parazgjedhje dhe
  numëruesit e palexuar. Në errësirë është i bardhë me tekst blu marine, si te referenca; në dritë
  është blu me tekst të bardhë. Gjithmonë `bg-primary` bashkë me `text-on-primary`.
- **Numrat te shtylla** (`bg-count`, `text-on-count`): pilulë e plotë me kontrast të fortë, kurrë gri
  e zbehtë. Materialet numërojnë materialet e verifikuara të fakultetit tënd këtë javë, Karriera punët
  e reja këtë javë (`app/(app)/layout.tsx`).
- **Dizajnet e profilit, vetëm Pro** (`PROFILE_THEMES` te `lib/pro.ts`, `[data-profile-theme]` te
  `globals.css`): Aurora, Perëndim, Pyll, Mesnatë, Ar. Secili ndryshon kopertinën, theksin dhe tintin e
  kartave vetëm brenda profilit, me theks tjetër për temën e errët. Ngjyra e emrit (`User.nameColor`) është
  e lirë, çdo #rrggbb, dhe dritarja paralajmëron kur lexohet vështirë. Zgjidhen nga butoni me paletë te
  profili im (`profile-design-dialog.tsx`), ruhen me `saveProfileDesign` pas `hasFeature("premium_profile")`,
  dhe shfaqen vetëm sa kohë pronari e ka Pro-në.
- **Teksti lexohet lehtë:** `--text` i bardhë, `--text-muted` dhe `--text-dim` të çelëta mbi marinë.
  Ngjyrat e fakulteteve si tekst kalojnë AA mbi sfond dhe kartë (`tests/design-tokens.test.ts`).
- **Bluja e çelët** (`brand-500`, `brand-word`): shenja e verifikimit, ikona aktive e navigimit,
  «.KS» te logoja, titulli «Nga Studentët.KS», njoftimet, lidhjet si «Shiko të gjitha».
- **Unaza e storjes** (`--sunset`): blu, vjollcë, ar. **Pro** (`--sunset-pro`, `pro-gradient`): ari,
  me tekst të errët (`--pro-contrast`) që kalon 4.5:1.
- **Ari** (`warning`): «E rëndësishme», afatet, yjet e vlerësimit, emri te shiriti i demos, etiketa AI.
- **Roza** (`like`): pëlqimi dhe pika e njoftimeve. **Vjollca** (`trip`): udhëtimet. **Bluja e
  zbehtë** (`event`): eventet.
- **Filtrat e feed-it:** aktivi është pilulë e çelët me tekst të errët (`--tab-active`), të tjerët tekst
  i qetë, pa kufi dhe pa pika.
- **Shiriti i demos** (`bg-banner`): gradient blu i errët me tekst të çelët, i njëjtë në të dy temat.

Logoja është skedar: `public/brand/logo.png` (512px, rreth blu me kapelën mbi S-në në formë zemre),
me madhësitë `logo-64/128/256.png`. `BrandMark` te `components/layout/brand.tsx` e shfaq, dhe pranë saj
fjala «STUDENTËT.KS» me Poppins 800. Asistenti (`AssistantMark`) përdor të njëjtën logo me etiketën
«AI» në ar. Ikonat e PWA-së dhe favicon-i gjenerohen nga i njëjti skedar me `npm run icons`.

E gjelbra do të thotë i verifikuar, aktiv, i disponueshëm. E kuqja vetëm rrezik dhe gabim.

Ngjyrat e fakulteteve: Ekonomik ambër, Mjekësi e kaltër, Juridik vjollcë, FSHMN e gjelbër, Filologjik
rozë, Arte magenta, FIEK cyan, Arkitekturë gri e ngrohtë, Bujqësi ulliri, Edukim koral.

Tipografia: **Plus Jakarta Sans** për tekstin, **Poppins** (`font-display`) për titujt, markën, emrat
e autorëve dhe butonat kryesorë, **JetBrains Mono** vetëm për shkurtoret e tastierës dhe kodin. Numrat
marrin `.tabular` (shifra me gjerësi të njëjtë) në shkronjën e tekstit. Një serif për tituj të mëdhenj
të faqeve publike.
Shkallë fluide me `clamp()`, rreshti 1.5 tekst dhe 1.1 tituj, maksimum 68 karaktere.

Hapësira 4px. Rrezja: `rounded-card` 22 për kartat dhe modalet, `rounded-control` 14 për butonat,
fushat, zërat e navigimit dhe tabs, 999 pilula. Kufij 1px.

Lëvizja: 150 deri 250ms, `ease-out`. Kartat ndriçojnë pak te hover (`--surface-2`), butonat ngrihen
1px. Optimistic UI për reagime, ndjekje dhe ruajtje. Respekto `prefers-reduced-motion`.

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

Në shfletues: `node scripts/e2e-social.mjs` kalon reagimet, tregun, grupet dhe profilin, dhe
`npm run e2e:onboarding` kalon hyrjen nga regjistrimi te ballina, me të dy hierarkitë.
`npm run e2e:integration` ndjek katër rrugë mes moduleve (ndjekja deri te feed-i, Pro deri te
analitika, profili i karrierës deri te njoftimi i punës, kufiri i asistentit), dhe
`npm run e2e:competition` garën me katër llogari nga universitete të ndryshme,
`npm run test:integration` rregullat e garës mbi bazën e vërtetë, `npm run e2e:ai` asistentin e plotë me modelin e vërtetë (historiku, imazhet, materialet, siguria,
riprovimi), `npm run e2e:composer` ballinën e thjeshtuar, galerinë dhe kamerën e kompozuesit, `npm run e2e:stories` veprimet mbi storjet (dosje, arkiv, fshirje, përgjigje, reagim, shiriti dhe mbajtja), `npm run e2e:voice-room` dhomën e zërit me zë të vërtetë mes dy shfletuesve, `npm run e2e:replies` përgjigjet e komenteve, mesazhet e zërit dhe punët e adminit. Të gjithë krijojnë
të dhëna prove, prandaj pas tyre `npm run db:seed`.

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
- **`next/image` nuk i shfaq dot skedarët tanë.** Optimizuesi e kërkon vetë adresën nga serveri, pa
  cookie-n e sesionit, dhe `/api/media/[id]` i kthen 401: storja dilte ekran i zi. Çdo foto e ngarkuar
  shfaqet me `MediaImage` (`components/ui/media-image.tsx`), që përdor `<img>` për adresat tona dhe e
  lë optimizimin vetëm për burimet e jashtme.
- **Çdo foto pranohet.** Galeria pranon `image/*`; `lib/shrink-image.ts` e zvogëlon në shfletues në 2560px
  dhe kthen në JPEG ose WebP çdo format që serveri nuk e mban (AVIF, BMP, HEIC kur shfletuesi e hap).
  Kufiri i serverit është 25MB për foto, dhe kufiri ditor numëron skedarët, jo copat e ngarkimit.
- **Vercel** (`https://studentet-ks-gamma.vercel.app`, projekti `studentet-ks`, rajoni `fra1` pranë
  Neon-it në eu-central-1): e njëjta bazë Neon si Netlify. Ndërtimi është `vercel-build` (skema Postgres
  dhe `next build`), **pa** `db push`: ndryshimet e skemës shihen me `prisma migrate diff` dhe zbatohen me
  dorë, pa e fshirë tabelën `playing_with_neon` të Neon-it. Ngarkimet rrinë te Vercel Blob, privat
  (`studentet-ks-uploads`, `STORAGE_DRIVER=vercel-blob`). `.vercelignore` nuk e lë të dalë `.env`.
  Publikimi: `npx vercel deploy --prod --yes`. Google kërkon adresën e Vercel-it te Google Cloud Console.
- **Ngarkimi i skedarëve punon.** Bajtat shkruhen te `lib/storage.ts` (disku lokalisht, Netlify Blobs
  ose Vercel Blob në host), jashtë `public/`, me adresim sipas përmbajtjes. Merren vetëm nga `/api/media/[id]`, e cila kërkon sesion. Kufijtë dhe llojet e
  lejuara rrinë te `lib/media.ts`, si konfigurim. Kalimi te S3 është zëvendësim i tri funksioneve.
- Video është një lloj përmbajtjeje mes të tjerave, kurrë qendra. Pa luajtje automatike, pa feed
  vertikal me video. Kufiri i kohëzgjatjes është i shkurtër me qëllim: 30 sekonda te postimi, 15 te
  story.
- Asistenti punon me Groq (`AI_PROVIDER="openai"`). Çelësi vendoset me `npm run ai:key -- <çelësi>`
  (Groq `gsk_`, xAI Grok `xai-`, OpenRouter `sk-or-`) dhe provohet me `npm run ai:check`, që provon edhe
  modelin e imazheve. Pa çelës punon `MockAiProvider`. Me `AI_BASE_URL`,
  `AI_API_KEY` dhe `AI_MODEL` kalon te modeli i vërtetë pa ndryshim kodi, dhe pa çelës e thotë hapur
  nën kutinë e shkrimit se përgjigjet janë demonstruese.
- Emaili zyrtar i kontaktit rri te `lib/site.ts`, kurrë i shkruar me dorë nëpër faqe.
- Punët i publikon admini te `/admin/punet`. Publikimi njofton studentët që i përshtaten
  (`lib/job-match.ts` për rregullin, `lib/job-alerts.ts` për shkrimin në masë), jo më shumë se tri
  në ditë.
- Tekstet ligjore (kushtet, privatësia) rrinë te `content/legal.ts`, në të dy gjuhët, jo te katalogët
  e UI-së. Faqet janë `/ligjore/kushtet`, `/ligjore/privatesia` dhe `/moderimi/publik`.
- Kurset kanë faqe mësimi te `/kurset/[id]/mesimi/[lessonId]`. Qasja kontrollohet në server: i
  regjistruar, instruktori, ose mësim parapamjeje. Mësimet e demos janë tekst dhe kuize, jo video.
- Ikonat e PWA-së (`public/icon-*.png`, `apple-icon.png`) dhe `app/icon.png` gjenerohen me
  `npm run icons` nga `public/brand/logo.png`. Kur ndryshon logoja, zëvendësohet ai skedar.
- Datat dhe orët formatohen në orën e Kosovës (`TIME_ZONE` te `lib/format.ts`), kurrë në atë të makinës:
  serveri në UTC dhe shfletuesi në UTC+2 jepnin orë të ndryshme dhe prishnin hidratimin.
- **Një komponent server asinkron që i kalohet si prop një komponenti klienti** (p.sh. `sidebar` te
  `AppChrome`) duhet të ketë `Suspense` rreth vetes. Pa të, kur të dhënat e tij vinin pak pas nisjes së
  hidratimit, React gjente HTML tjetër (#418), herë pas here dhe vetëm në prodhim.
- Mos e nis kurrë `next dev` ndërsa `next start` punon nga e njëjta dosje. Kur duhen të dy, `next dev`
  niset me `NEXT_DIST_DIR=.next-dev`. Të dy shkruajnë te `.next`
  dhe serveri i prodhimit fillon të kthejë HTML në vend të JavaScript-it.
- Numrat e XP-së dhe të ditëve Pro në tekste vijnë si parametra nga `lib/xp.ts`, kurrë të shkruar
  me dorë në katalog.
- **Shpejtësia në prodhim varet nga numri i pyetjeve.** Serveri dhe baza rrinë në rajone të ndryshme,
  prandaj çdo pyetje kushton rreth 100 ms. Faqet e rënda dërgohen me `Suspense` dhe skeleton, pyetjet
  e pavarura bashkohen me `db.$transaction([...])`, dhe të dhënat jopersonale rrinë te `lib/cache.ts`.
  `DB_METRICS=1` e ndez numëruesin që shkruan «[diag] pyetje=N db=Mms» për çdo faqe.
- **Prania është e vërtetë, kurrë e simuluar.** `lastSeenAt` e shkruan vetëm rrahja nga shfletuesi i
  studentit, te `/api/prania`, dhe vetëm kur skeda është e dukshme. Pragjet rrinë te `lib/presence.ts`.
  Pika e gjelbër shfaqet vetëm te postimet dhe te profili i njerëzve që shikuesi i ndjek, me një pyetje
  të vetme për faqe (`getOnlineFollowedIds`). Nuk ka kartë «Online tani».
  Në seed një pjesë e vogël duket aktive, që karta të demonstrohet, dhe kjo është e dhënë zhvillimi.
- Statusi ka dy çelësa privatësie të ndarë: pika e gjelbër dhe koha e fundit aktive. Kur studenti e ka
  fikur pikën, tjetri e sheh si jashtë linje, kurrë si «e fshehur».
