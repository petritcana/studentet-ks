# Vendimet

Çdo zgjedhje që briefi e la te gjykimi ynë, me arsyen përkrah. Kur një vendim
ndryshon, ndryshohet këtu, jo në kujtesë.

## 21 shtator 2026

### Profili publik si parazgjedhje
`isPrivate` nis `false`. Platforma jeton nga zbulimi: një student i ri që nuk
gjen njeri nuk kthehet. Privatësia është një çelës i qartë te Cilësimet, jo
gjendja fillestare.

### Kalimi privat, publik i pranon kërkesat vetë
Kur profili bëhet publik, çdo kërkesë në pritje pranohet automatikisht, sepse
përmbajtja tani hapet për këdo dhe lënia e tyre në pritje do të ishte vetëm
konfuzion. Kjo i thuhet studentit te teksti nën çelës, para se ta prekë.

### Kush e mban dukshmërinë e një profili privat
Vizitori i një profili privat sheh avatarin, emrin, @username, rreshtin akademik,
numrat dhe bion. Bio mbetet e dukshme sepse pa të askush nuk e di nëse po dërgon
kërkesë te personi i duhur.

### Pyetjet dhe përgjigjet mbeten të dukshme
Postimet e një profili privat nuk dalin te feed-i i të tjerëve, por përgjigjet
dhe materialet e tij te biblioteka e lëndës mbeten. Ato janë kontribut akademik:
nëse zhduken, dëmtohet lënda, jo privatësia.

### Prania vetëm te ata që ndjek
Pika e gjelbër shfaqet vetëm te koka e postimit dhe te profili, vetëm për
njerëzit që shikuesi i ndjek dhe që e kanë lënë statusin të dukshëm. Kutia
«Online tani» u hoq fare. Prania merret me një pyetje të vetme për faqe.

### Ngarkimi me copa, jo me trup të vetëm
Skedari shkon te `/api/ngarko` në copa nga një megabajt. Arsyeja është e prekshme:
server actions e presin trupin te një megabajt dhe Netlify te gjashtë, prandaj
çdo foto normale e telefonit dështonte. Copat lejojnë edhe përparim dhe riprovë.
Hapi tjetër i mundshëm janë URL-të e nënshkruara drejt ruajtjes, kur të kalohet
te S3.

### Stories: fotot piqen, videot jo
Te fotot teksti dhe vizatimi shkruhen brenda imazhit para ngarkimit, që storja të
duket njësoj kudo. Te videot shtresat ruhen si JSON dhe vizatohen gjatë shikimit,
sepse rikodimi i videos në shfletues është i ngadaltë dhe prishet lehtë. Teksti
ruhet gjithmonë edhe si varg, që storja të ketë përshkrim për lexuesit e ekranit.

### `server-only` edhe në teste
Provider-i i AI-së tani ndalon importin nga klienti. Testet nuk kanë klient dhe
server, prandaj `server-only` zëvendësohet me një modul bosh te `vitest.config.ts`.
Roja mbetet e vërtetë për ndërtimin.

## 21 shtator 2026, shpejtësia

### Ku shkon koha në prodhim
Serveri i Netlify punon në `us-east-2`, baza Neon në `eu-central-1`. Një pyetje e
vetme kushton 99 ms, katër paralel 303 ms, dhe një faqe bën 20 deri 25 pyetje.
Mbi to vijnë rreth 600 ms të vetë platformës, të matura me `/api/nxeh`, që bën
vetëm `SELECT 1`. Prandaj një faqe merrte 8 deri 9 sekonda.

### Çfarë u bë
Faqja tani dërgohet me rrjedhë: koka, navigimi dhe kompozuesi nisen menjëherë,
feed-i dhe shtylla vijnë pas, me skeleton në vend. Kështu faqja duket për rreth
dy sekonda në vend të nëntë. Pyetjet e përsëritura u bashkuan me `$transaction`,
lista e ndjekjeve merret një herë për kërkesë (`lib/queries/social-graph.ts`),
dhe njoftimet, reklamat, punët, sugjerimet dhe «Këtë javë» rrinë në kujtesë.
Një punë e planifikuar e prek bazën çdo pesë minuta, që të mos flejë.

### Çfarë mbetet
Zhvendosja e bazës në `us-east-2`. Kjo e heq 99 ms nga çdo pyetje dhe është e
vetmja gjë që e bën faqen të hapet menjëherë. Kërkon një projekt të ri Neon në
atë rajon; `scripts/db-copy.mjs` i kopjon të dhënat pa prekur burimin.

### Reklamat i fut admini, jo reklamuesi
Te `/admin/reklamat` futet çdo reklamë e shitur, me sa u pagua, sa ditë zgjat dhe
sa u pa. Vetëshërbimi për reklamuesin do të kishte kuptim vetëm me vëllim; sot
shitja bëhet me bisedë, prandaj mjafton një formular i brendshëm.

### Skeleton-at rrinë larg rrugëve me roje
`loading.tsx` e nis dërgimin e faqes para se të mbarojë puna e serverit. Kur nën
atë degë rri një rrugë e mbrojtur me ridrejtim, si `/admin` ose `/kurset/fitimet`,
ridrejtimi nuk e ndryshon dot më statusin dhe përgjigjja kthehet 200 me një
skeleton, jo 307. Përmbajtja nuk rrjedh, sepse roja ndalon para se të merren të
dhënat, por statusi duhet ta thotë të vërtetën. Prandaj `admin`, `moderimi` dhe
`kurset` nuk kanë skeleton, dhe rrugët e tjera e kanë.

### Hierarkia akademike ndjek institucionin, nuk e sajon atë
Universitetet publike i kanë programet nën fakultete, kolegjet private jo. UBT-ja
ka «Shkenca Kompjuterike», jo «Fakulteti i Shkencave Kompjuterike me programin
Shkenca Kompjuterike». Prandaj hapi i fakultetit shfaqet vetëm kur institucioni
është publik dhe ka vërtet fakultete me programe aktive; te një kolegj privat as
nuk del. Një fakultet i sajuar do të ndotte kërkimin, feed-in e fakultetit dhe
renditjen e sugjerimeve, dhe do të ishte e pamundur të hiqej më vonë.

Lista e AKA-së e mban fakultetin vetëm për Universitetin e Prishtinës. Për pesë
universitetet e tjera publike fakultetet u morën nga faqet e vetë universiteteve
dhe u lidhën me programin sipas numrit të rreshtit te lista, i cili nuk ndryshon
edhe kur emri shkruhet ndryshe.

### Emrat e programeve lexohen nga teksti, kolonat japin vetëm anglishten
Leximi me koordinata i ndan kolonat mirë, por emrin e gjatë e pret keq: vazhdimi
bie në lartësinë e numrit pasues dhe dy programe ngjiten në një. Teksti i
rrafshuar e ka të kundërtën. Prandaj emri shqip merret nga teksti, ku rreshti nis
me numrin e vet dhe mbyllet me datën e akreditimit, kurse emri anglisht nga
kolona. Kështu u zhdukën të gjitha arnimet me dorë dhe u kthyen pesë programe që
kishin humbur.

### Njerëzit vijnë pas llogarisë, jo para saj
Hyrja dikur kërkonte pesë ndjekje dhe të paktën një lëndë para se llogaria të
hapej, dhe kur ata hapa u hoqën, «Hap llogarinë» dështonte pa e thënë pse. Tani
`finishOnboarding` vetëm e mbyll hyrjen, dhe profilet e sugjeruara rrinë te
`/mireseerdhe`, faqe e vet që mbijeton një rifreskim. Ndjekja aty është ftesë,
jo kusht.

### Pronësia e një skedari matet nga ngarkimi, jo nga rreshti i parë
Skedarët ruhen sipas përmbajtjes, prandaj dy studentë që ngarkojnë të njëjtën
foto marrin të njëjtin id. Me një `ownerId` të vetëm, i dyti nuk e vinte dot atë
foto as si avatar: kontrolli i pronësisë gjente të parin. Tani çdo ngarkim shkruan
një rresht te `MediaUpload`, dhe id-ja e skedarit është vetë dëshmia se studenti i
kishte bajtat. `scripts/backfill-media-claims.mjs` ua jep të vjetrit pronarëve.

### Niveli nuk është hap më vete
Zgjedhësi dikur i gruponte programet sipas emrit: «Mekatronikë» dilte një herë,
me Bachelor dhe Master si hap i dytë poshtë. Studenti e zgjidhte emrin, harronte
hapin e dytë, dhe butoni ankohej se s'ka program të zgjedhur. Tani lista i jep
të ndara: «Mekatronikë» me BSc poshtë, dhe «Mekatronikë» me MSc poshtë. Shkurtesa
nuk përkthehet në «bachelor»: ruhet te `StudyProgram.degreeTitle`, ashtu si e
shkruan lista zyrtare, prandaj një program juridik shfaq LLB dhe një muzike MMus.

### Kuota me kllapa bashkonte tre rreshta
Te lista e AKA-së kuota ndonjëherë vjen me sqarim: «160 (40 per specializim)».
Rregulla e leximit priste numër dhe pastaj datë, prandaj rreshti nuk mbyllej dot
dhe thithte dy rreshtat pasues. Kështu humbnin «Master i Mësimdhënies Lëndore»
dhe «Doktoratë në Shkencat e Edukimit», dhe i pari merrte nivelin e të fundit.

### Kontributi bazë nuk pret verifikimin
`can()` e kërkonte verifikimin për postim, koment, ngarkim, mesazh dhe storje.
Pasoja ishte se një student që sapo regjistrohej me një email të zakonshëm nuk
bënte dot asgjë: kompozuesi hapej, storja ngarkohej, dhe pastaj vinte një gabim.
Platforma i dukej e prishur që në minutën e parë. Tani ato veprime janë të hapura
për çdo llogari studenti. Verifikimi mbetet kusht aty ku ka vërtet peshë: zëri i
kampusit (anonimiteti kërkon identitet të vërtetë prapa), mesazhi te një i
panjohur, eventi publik dhe kurset me pagesë.

### Gabimi i hyrjes tregohej si çelës
Formulari e hiqte vetëm prefiksin «auth.» nga çelësi i gabimit, prandaj çdo çelës
tjetër dilte i papërkthyer: studenti lexonte «auth.errors.rateLimited». Tani
çelësi zgjidhet si rrugë e plotë. Dhe kufiri i regjistrimit numërohet vetëm te
një regjistrim i vërtetë, jo te çdo gabim shkrimi te formulari, dhe mesazhi e
thotë sa minuta duhet pritur.

### Një mospërputhje hidratimi që ende nuk është kapur
Te ballina, pas publikimit të një storje, del me ndërprerje React #418: serveri
dhe shfletuesi e ndërtojnë ndryshe një degë, dhe React e rindërton atë degë te
klienti. Ndodh rreth një herë në tetë dhe nuk u riprodhua dot te serveri i
zhvillimit, ku React e tregon ndryshimin e saktë; dymbëdhjetë ngarkime të
zakonshme të ballinës janë të pastra, prandaj shkaku lidhet me radhën
publikim, rifreskim, lundrim.

Gjatë kërkimit u rregullua një shkak i vërtetë i së njëjtës familje: `EventCard`
e llogariste në klient nëse eventi kishte kaluar, me `Date.now()`. Tani vjen nga
serveri, si kërkon rregulli i projektit.

Testet e shënojnë këtë gabim veçmas, si «i njohur», që suita të mbetet e
qëndrueshme pa e fshehur çështjen.

### Asnjë llogari nuk hyn me një email të pakonfirmuar
Regjistrimi tani e dërgon një kod gjashtëshifror te vetë adresa dhe llogaria nuk
kalon më tej pa të. Edhe emaili institucional e kalon këtë hap: domeni tregon se
si duket adresa, jo kush e mban. Shenja e verifikimit jepet pas kodit, dhe vetëm
për domenet institucionale, kështu që «student i verifikuar» dhe «email i
konfirmuar» mbeten dy gjëra të ndara.

Dërgimi rri te `lib/email/`, me të njëjtën formë si `lib/billing`: një ndërfaqe
dhe disa ofrues. Pa çelës punon ofruesi i konsolës, dhe kodi shkruhet te regjistri
i serverit. Me `RESEND_API_KEY` dhe `MAIL_FROM`, i njëjti kod dërgon email të
vërtetë pa u prekur asnjë thirrje. Kodi shfaqet te faqja vetëm me `MAIL_DEV_CODE=1`
dhe vetëm kur nuk ka ofrues: në prodhim kjo do të thoshte se kushdo regjistrohet
me emailin e dikujt tjetër dhe e lexon kodin aty.

### Një buton i vetëm ndjekjeje
Kishte pesë kopje: te profili, te kartat, te rafti i njerëzve, te rreshti i
identitetit dhe te sugjerimet. Secila e trajtonte ndryshe kërkesën në pritje,
dhe dy prej tyre nuk kishin fare çndjekje. Tani është një, me katër gjendje, dhe
kalimi i miut mbi «E ndjek» e thotë hapur «Çndiqe»: pa këtë, njerëzit nuk e
gjenin dot se ku çndiqet. Çndjekja tërheq edhe një kërkesë në pritje dhe fshin
njoftimin te pronari.

### Pamjet numërohen kur karta hyn në ekran
Analitika e Pro-s duhet të tregojë sa veta e panë një postim, jo sa herë u
rifreskua faqja. Prandaj `PostView` mban një rresht për person, dhe shënimi vjen
nga `IntersectionObserver` te shfletuesi, jo nga dërgimi i faqes. Autori nuk
numërohet te pamjet e veta.

### Feed-i publik lexohet nga kushdo
Skeda e Kosovës ishte e kyçur me Pro, dhe kjo e zbrazte vetë idenë: një postim
publik që nuk lexohet dot nga të gjithë nuk është publik. Tani shkrimi aty dhe
komentimi janë Pro, leximi jo.

### Veçoritë e Pro-s janë të dhëna, jo degë kodi
`hasFeature` mbeti pika e vetme e vendimit, dhe u zgjerua me ngjitjen, veçimin,
profilin e veçuar, pamjen premium, privatësinë e avancuar, analitikën dhe grupet.
Kufijtë rrinë te `PRO_LIMITS`. Çdo kontroll bëhet te serveri: testi `e2e:pro`
provon edhe anën tjetër, që një llogari pa Pro nuk i bën dot këto veprime as kur
veprimi thirret drejtpërdrejt.

### Grupet kishin anëtarë, por jo ku të shkruhej
Faqja e grupit tregonte postime që nuk mund të krijoheshin: `createPost` nuk e
pranonte fare një grup. Tani e pranon, me anëtarësinë e kontrolluar te serveri,
dhe grupi ka kutinë e vet të shkrimit. Grupin e hap studenti, jo admini, me kufi
numri te `PRO_LIMITS`.

### Emaili, kërkimi në web dhe modeli ndjekin të njëjtën formë
Tri shtresa të jashtme, i njëjti rregull: një ndërfaqe, disa ofrues, dhe pa
çelës punon ai që nuk pretendon asgjë. `lib/email`, `lib/ai/web-search` dhe
`lib/ai/provider` kalojnë te ofruesi i vërtetë vetëm duke vendosur çelësat te
mjedisi, pa u prekur asnjë thirrje.

### Shiriti mban vetëm logon
Rreshti me @username dhe «Student i verifikuar» doli fare nga shiriti: emri i
përdoruesit dhe statusi jetojnë te menyja e avatarit dhe te profili, dhe aty
vetëm e ngushtonin kërkimin pa i thënë studentit asgjë që nuk e di. Njoftimi i
veçuar u hoq nga ballina për të njëjtën arsye: i njëjti njoftim rrinte dy herë
në të njëjtin ekran, një herë te shtylla dhe një herë mbi postimin e parë.

### Theksi i Pro-s nuk dukej sepse klasa nuk ekzistonte
Klasat ishin ndërtuar me varg në kohë ekzekutimi, `bg-${accent}-500`. Tailwind i
gjeneron klasat nga teksti që sheh te burimi, prandaj ato nuk shkruheshin kurrë
te fleta e stileve dhe ngjyra nuk dilte. Tani theksi punon si ngjyrat e
fakulteteve: tokena te `globals.css` dhe dy variabla të vendosura me `style`.
Pika e ngjyrës te cilësimet përdor të njëjtin variabël, prandaj ajo që zgjedh
studenti është saktësisht ajo që sheh.

### Biseda merr frymë vetë
Mesazhi i tjetrit dilte vetëm pas një rifreskimi, dhe kjo e bënte bisedën kuti
postare. Tani faqja e kërkon gjendjen e plotë çdo tri sekonda e gjysmë dhe e
zëvendëson listën me të: asnjë bashkim i pjesshëm, asnjë rend i prishur, dhe
reagimet, redaktimet e leximet e tjetrit vijnë bashkë me mesazhet. Rrahja ndalon
kur skeda nuk shihet. Lidhje e gjallë do të ishte më e bukur, por nuk mbijeton
te funksionet pa server, ku aplikacioni jeton.

### Emaili tani ka dy rrugë të vërteta
Hyrja me Google e provon vetë adresën, prandaj ajo llogari nuk kalon fare nga
kodi: hapi i konfirmimit ekziston për adresat që i shkruan vetë studenti. Dhe
kodet dërgohen me SMTP, p.sh. me një llogari Gmail dhe një «app password»: kjo
është rruga që e ka kushdo, pa u regjistruar te ndonjë shërbim i ri.

### Asistenti është vetëm për mësim
Rregullat e tij e thonë hapur: lëndët, detyrat, provimet, shkrimi akademik,
gjuhët, programimi për studime dhe karriera, po; gjithçka tjetër, jo, dhe kjo
thuhet shkurt në vend që të jepet gjysmë përgjigjeje. U shtua edhe Gemini si
ofrues, sepse çelësi i tij merret falas brenda pak minutash, dhe `npm run
ai:check` e provon rrugën nga fillimi në fund para se dikush të hapë faqen.

### Asistenti nuk mbante mend sepse merrte fillimin, jo fundin
`prepareAsk` e kërkonte historikun me `orderBy: asc` dhe `take: 10`: kjo merr
dhjetë mesazhet e para të fijes, jo dhjetë të fundit. Modeli e shihte gjithmonë
hapjen e bisedës dhe kurrë atë që u tha pak më parë, prandaj pyetja e dytë nuk e
kuptonte të parën. Tani merren nga fundi dhe kthehen në rend, dhe rregulli
mbrohet nga një provë e vetën.

U shtua edhe ofruesi Anthropic, të cilin `.env` i projektit e priste me
`AI_PROVIDER="anthropic"` por që nuk ekzistonte, dhe zgjedhja e ofruesit tani i
bindet asaj vlere. Kur ofruesi i emërtuar nuk ka çelës, kjo shkruhet te regjistri
në vend që të heshtë.

## 23 shtator 2026

### «Lënda ime» u hoq krejt
Skeda e materialeve dhe rrethi i parë i qasjes e kërkonin që studenti të kishte
zgjedhur lëndët një nga një. Pa atë hap, skeda dilte bosh dhe dukej e prishur.
Fakulteti e mbulon të njëjtën nevojë pa kërkuar asgjë paraprakisht, prandaj
Materialet kanë dy skeda: Fakulteti im dhe Të gjitha lëndët.

### Përgjigjet e komenteve kanë një nivel të vetëm
Një përgjigje te një përgjigje shkon te komenti i parë i fijes. Fijet e thella
nuk lexohen në telefon, dhe biseda humbet te shkalla e pestë. Autori i komentit
njoftohet, i grumbulluar sipas fijes, dhe te fija anonime njoftimi vjen pa emër.
Kush fshin komentin e vet fshin edhe përgjigjet nën të, dhe numri i komenteve te
postimi ulet me aq sa u fshinë vërtet.

### Mesazhet e zërit
Dy minuta dhe pesë megabajt. Shfletuesi e regjistron zërin në të njëjtët
kontejnerë si videon (WebM te Chrome dhe Firefox, MP4 te Safari), prandaj ruhet
me llojin e kontejnerit dhe `Message.kind = "voice"` thotë se luhet si zë.
Kohëzgjatja vjen nga regjistruesi, sepse WebM-i i shfletuesit shpesh e raporton
si të pafundme. Mikrofoni i parë hapet me vonesë, prandaj shiriti del menjëherë
me gjendjen «po hapet mikrofoni».

Dy gjëra u zbuluan gjatë rrugës. `Permissions-Policy` e ndalonte mikrofonin për
tërë faqen, që do të thotë se edhe dhomat e zërit nuk kishin punuar kurrë: tani
lejohet vetëm për origjinën tonë. Dhe `/api/media/[id]` nuk i njihte kërkesat me
`Range`, pa të cilat Safari nuk luan as video as zë.

Skedarët e mesazheve tani i hap vetëm kush është brenda bisedës. Më parë një
skedar i bashkëngjitur në mesazh binte te rregulli i përgjithshëm dhe hapej nga
kushdo i kyçur që e dinte adresën.

### Punët njoftojnë vetë
Punët vinin vetëm nga seed-i, prandaj njoftimi «punë e re për ty» nuk kishte nga
të nisej. Admini tani publikon te `/admin/punet` në emër të një kompanie, dhe
publikimi njofton studentët kur fusha i përket programit të tyre, kur e kanë
kërkuar vetë rolin te profili i karrierës, ose kur shpallja është për të gjitha
fushat dhe ata kanë thënë se kërkojnë punë. Njoftimi është më i rreptë se renditja
te Karriera: atje një përputhje e dobët vetëm e ngre një kartë, këtu ndërpret.

Njoftimet shkruhen në masë me katër pyetje, jo një nga një përmes `notify()`:
me bazën në rajon tjetër, dy mijë studentë do të ishin minuta. Preferenca e
kategorisë Karriera respektohet njësoj, dhe askush nuk merr më shumë se tri
njoftime pune në ditë. Logjika e përputhjes rri te `lib/job-match.ts`, pa bazë,
që të provohet me teste njësie.

### Zemra nuk është e kuqe
Pëlqimi e bënte zemrën të kuqe. Te ne e kuqja do të thotë gabim ose rrezik,
prandaj zemra merr ngjyrën e brendit dhe fryhet një herë kur preket.

### Lëvizja
Çdo faqe hyn me një zbehje prej një çerek sekonde përmes `app/(app)/template.tsx`.
Animacioni përdor `backwards`, jo `both`: pasi mbaron nuk mbetet asnjë
transformim, që elementët `fixed` dhe `sticky` brenda faqes të mos humbasin pikën
e referimit. Ndërrimi i temës rrëshqet ngjyrat në vend që t'i kërcejë. Të gjitha
bien vetë kur studenti e ka ulur lëvizjen te sistemi.

`scrollbar-none` përdorej në tetë vende por nuk ishte përcaktuar askund, prandaj
në Windows rreshtat anash tregonin shirit. Tani është te `globals.css`, bashkë me
`scroll-fade-x`, që e zbeh skajin ku rreshti vazhdon.

### Asistenti me model të vërtetë: Groq
Gemini-t i mungon plani falas në Kosovë: Google e refuzon çelësin pa billing.
Groq ofron plan falas pa kartë dhe flet protokollin e OpenAI-t, që ofruesi ynë
`openai-compatible` e njihte tashmë. `npm run ai:key` e njeh çelësin nga forma
(`gsk_`, `sk-or-`, `sk-ant-`, `AIza`, `AQ.`) dhe te Groq e zgjedh modelin nga
lista e tyre e gjallë, sepse emrat e modeleve ndërrohen shpesh. `AI_PROVIDER="mock"`
tani e mban demonstruesin me qëllim edhe kur te `.env` ka mbetur një çelës.

Modelet që arsyetojnë (gpt-oss) e harxhojnë arsyetimin nga i njëjti kufi tokenash.
Për ta arsyetimi mbahet i ulët dhe kufiri ngrihet, që përgjigjja të mos dalë e prerë.

### Përgjigjet e asistentit lexohen si tekst i formatuar
Modeli shkruan Markdown dhe LaTeX edhe kur prompti i kërkon shenja të zakonshme.
`AnswerText` i shfaq titujt, listat, theksimet dhe kodin si elemente React, kurrë si
HTML, dhe formulat i kthen në shenja: `\frac{a}{b}` del a/b, `x^{2}` del x². Kodi
brenda përgjigjes nuk preket, sepse aty kllapat kanë kuptim.

### Pyetja pasuese kërkon me pyetjen e mëparshme
«Po për javën e fundit?» nuk ka asnjë fjalë lënde, dhe kërkimi sillte materiale
të rastësishme nga fakultete të tjera. Kur pyetja është e shkurtër, kërkimi e
bashkon me pyetjen e mëparshme të bisedës. Fjalët e çdo pyetjeje studimi
(provimi, java, lexoj) nuk numërohen më si përputhje, dhe me dy materiale njësoj
të afërta fiton ai i fakultetit të studentit.

### Dy modele te asistenti, dhe asgjë nën përgjigje
Te koka e panelit studenti zgjedh mes Claude dhe Groq. Del çdo model që ka çelës
(`lib/ai/models.ts`), dhe zgjedhja mbahet mend në shfletues. Kur modeli i zgjedhur
dështon para se të japë tekst, për shembull një llogari Anthropic pa kredit, pyetja
kalon te tjetri dhe studentit i thuhet një herë për sesion.

Rreshtat «Nuk gjeta material» dhe «Përgjigje e gjeneruar» u hoqën me kërkesë. Nën
përgjigje dalin vetëm burimet që modeli i citoi vërtet me [n]: materiali që iu dha
por që nuk e përdori nuk shfaqet më si burim. Një material hyn te konteksti vetëm
kur përputhet me të paktën një të tretën e fjalëve të pyetjes.

Matematika dhe llogaritjet janë mësim edhe kur janë të thjeshta: modeli e refuzonte
«Sa bën 4 x 4 / 4?» si pyetje jashtë studimeve, prandaj rregulli e thotë hapur.

## 23 shtator 2026, asistenti si shoqërues studimi

### Groq, i vetmi ofrues
Studenti nuk zgjedh model. Asistenti flet me Groq përmes protokollit të OpenAI-t,
me tre modele: `gpt-oss-120b` për tekstin, `qwen3.8-27b` për imazhet (gpt-oss nuk
sheh), `gpt-oss-20b` për titujt dhe përmbledhjet. Kërkesa e studentit përmendte
«Grok». Grok i xAI-t dhe Groq janë kompani të ndryshme, dhe çelësi që u dha është
i Groq-ut. Kodi punon me të dy: `npm run ai:key -- xai-...` e kalon te Grok pa
ndryshim kodi. Ofruesit Anthropic dhe Gemini u hoqën.

### Plani falas i Groq-ut ka kufi tokenash në minutë
8.000 për modelin e tekstit dhe 7.000 për atë të imazheve. Prandaj imazhi i
dërgohet modelit vetëm me pyetjen e vet, dritarja e historikut është 10.000
karaktere, materiali 6.000, dhe kur Groq thotë «provo pas X sekondash» rruga pret
dhe riprovon një herë, pastaj kalon te modeli më i lehtë. Me shumë studentë
njëherësh, plani me pagesë i Groq-ut e heq këtë kufi.

### Historiku në bazë, jo në shfletues
Çdo bisedë i përket studentit që e hapi, dhe çdo rrugë kontrollon pronarin: një id
e huaj kthen 404. Lista vjen pa mesazhet, mesazhet vijnë tridhjetë në herë nga
fundi. Biseda e gjatë ruan një përmbledhje të pjesës që del jashtë dritares, dhe
ajo shkruhet para përgjigjes kur mungon, që modeli ta dijë atë që studenti tha në
fillim.

### Mënyrat e fiksuara u hoqën
Butonat «Shpjego thjesht», «Përmblidh», «Bëj kuiz» nën bisedë u hoqën. Studenti i
kërkon me fjalë, dhe rregullat e modelit i njohin. Prompti u rishkrua: asistent
edukativ i gjerë, jo vetëm për lëndët e universitetit, që përgjigjet në gjuhën e
pyetjes dhe refuzon vetëm udhëzimet që lehtësojnë dëm.

### Materialet lexohen vërtet
Ngarkimi i materialeve ruante vetëm titullin dhe madhësinë, prandaj asistenti nuk
kishte asgjë për të lexuar. Tani teksti nxirret në çastin e ngarkimit: PDF me
`unpdf` faqe për faqe, DOCX dhe PPTX me `fflate`, fotot e shënimeve të
transkriptuara nga modeli që sheh. Materiali i kyçur i jep modelit vetëm titullin.

### Refuzimi i gatshëm i modelit
`gpt-oss` herë pas here kthen vetëm «I'm sorry, but I can't help with that.», edhe
për pyetje të pafajshme si «Si quhet qeni im?». Serveri e njeh, riprovon me një
shënim, dhe vetëm nëse modeli refuzon sërish shfaq një tekst neutral në gjuhën e
studentit që nuk e akuzon për asgjë.

### Ora e Kosovës, kudo
`formatTime` përdorte orën e makinës: serveri në UTC dhe shfletuesi në UTC+2 jepnin
orë të ndryshme për të njëjtin event, dhe React-i e rindërtonte faqen me gabimin
#418. Tani çdo datë dhe orë formatohet me `Europe/Belgrade`. Pas kësaj, 95 ngarkime
të feed-it kaluan pa #418, por testi i asistentit e pa edhe dy herë. Mbetet i hapur.

## 24 shtator 2026, gara

### Gara, zëri i gjashtë i shtyllës
Në fillim Gara nuk hyri te shtylla, sepse kontrata thoshte pesë zëra, dhe hyrjet ishin te
Komuniteti dhe te menyja e avatarit. Pronari kërkoi që të dalë te shtylla bashkë me
Ballinën, Materialet, Karrierën, Komunitetin dhe Tregun, prandaj u bë zëri i gjashtë, në fund.
Karta te Komuniteti mbetet. Në celular Gara del te menyja e avatarit, si Tregu.

### Pikët e garës janë regjistër më vete
Nuk përzihen me XP-në, që ka rregullat e veta të konvertimit në Pro. Regjistri
`CompetitionPoint` është unik sipas studentit, burimit dhe id-së, prandaj dy
kërkesa njëherësh nuk japin pikë dy herë. Çdo burim ka kufi ditor, i gjithë
aktiviteti ka tavan ditor prej 150 pikësh, dhe fitoret kundër të njëjtit
kundërshtar numërohen vetëm dy herë në ditë.

### Vetëm i verifikuari i jep pikë universitetit
Studenti i paverifikuar i mbledh për vete, që të shohë përparimin, por universiteti
nuk fryhet nga llogari që nuk dihet nëse janë studentë të tij.

### Beteja asinkrone
Të dy lojtarët marrin të njëjtat pyetje dhe luajnë kur të duan brenda 24 orëve.
Faqja pyet serverin çdo tri sekonda, që përparimi i kundërshtarit dhe rezultati të
dalin pa rifreskim. Beteja «Gjej kundërshtar» pa kundërshtar mbyllet kundër
komunitetit, me mesataren e të gjithë lojtarëve të kategorisë.

### Mirëmbajtja pa punë në sfond
Nuk ka cron. Skadimi i sfidave, mbyllja e javës, arritjet e universiteteve dhe
mbyllja e ngjarjeve ndodhin kur dikush hap garën, dhe secila është idempotente
(`updateMany` me kusht, ose çelës unik).

### Renditja «Të gjithë»
Kontrata thoshte «kurrë renditje globale». Kërkesa e garës e kërkon shprehimisht,
prandaj u shtua, por me të njëjtin kufi: njëzet të parët dhe vendi yt, kurrë fundi.

### Kontrolli i përkthimeve lexon ICU
Njoftimet e garës përdorin `{category, select, ...}` që emri i kategorisë të dalë në
gjuhën e studentit. Kontrolli i vjetër i numëronte alternativat si parametra dhe
shihte «ndryshim» mes gjuhëve. Tani `i18n-check` lexon strukturën e ICU-së.

## 24 shtator 2026, dizajni «Aurora Lime Sunset»

### Riveshje, jo rindërtim
Specifikimi i dizajnit kërkonte vetëm pamje të re: asnjë faqe, rrugë, tekst ose veçori nuk
ndryshoi vend. Tokenat e vjetër (`bg`, `surface`, `brand-500`, `warning`) morën vlerat e reja në
errësirë, dhe u shtuan rolet që mungonin (`primary`, `sunset`, `like`, `trip`, pllakat e kategorive),
kështu që çdo komponent ndoqi pa u prekur një nga një. Drita mban ngjyrat e pishës.

### Xhami vetëm për kartat
`--surface` në errësirë është gjysmë i tejdukshëm. Menytë, dialogët, fletët dhe tooltip-et kaluan te
`surface-solid`, sepse një meny e tejdukshme mbi një postim nuk lexohet.

### Teksti mbi Pro është i errët
Specifikimi e donte të bardhë mbi perëndimin portokalli-rozë. I bardhi mbi `#ffb347` jep 1.8:1, larg
kufirit 4.5:1 që specifikimi vetë kërkon. Teksti u bë vishnje shumë e errët, që kalon në të dy skajet.

### Butoni «Shkarko» te karta e materialit
Shkarkimi dhe kontrolli i qasjes jetojnë te faqja e materialit. Te feed-i «Shkarko» është pjesë e lidhjes
që të çon aty, jo shkarkim i drejtpërdrejtë që do ta anashkalonte kontrollin.

### Ikonat te kompozuesi
Referenca kishte foto dhe skedar. Materialet nuk krijohen nga ballina, prandaj te kompozuesi dalin Foto
dhe Video, që e hapin kompozuesin me bashkëngjitjen gati.

## 24 shtator 2026, ballina më e thjeshtë dhe kamera

### Shiriti i postimit pa ikona
Foto dhe Video te shiriti mbi feed u hoqën: shiriti ka vetëm avatarin, fushën dhe «Krijo». Çdo
bashkëngjitje zgjidhet brenda kompozuesit.

### Foto / Video, një galeri e vetme
Kompozuesi kishte katër butona të barabartë. Tani fotot dhe videot zgjidhen nga e njëjta galeri, deri në
dhjetë skedarë, sepse studenti nuk e mendon ndryshe një foto nga një video kur poston. Sondazh dhe Zë
mbeten, më poshtë dhe më të vegjël.

### Kamera e vërtetë
«Kamera» hap `getUserMedia` brenda faqes: pamje e gjallë, foto me një prekje, video deri në 30 sekonda,
rishikim, pastaj ngarkim me të njëjtën rrugë si galeria. Kamera fiket sapo mbyllet dritarja. Kur shfletuesi
nuk e jep (leje e refuzuar, pa HTTPS, pa kamerë), kalon te `<input capture>`, që në celular hap kamerën e
pajisjes. Për këtë `Permissions-Policy` lejon `camera=(self)`: deri tani e bllokonte krejt.

### Filtrat pa rreshtin e shpjegimit
Rreshti «Vetëm ata që i ndjek, kronologjik.» u hoq. Shpjegimi i secilit filtër mbetet te `title`, që del
kur kalon miun sipër, dhe filtrat u bënë pilula me theksin e vet.

### Shtylla e djathtë te skaji
`PageWithRail` e qendërzonte feed-in me shtyllën, dhe në ekrane të gjera mbetej hapësirë bosh djathtas.
Tani feed-i merr hapësirën deri 760px dhe shtylla ngjitet te skaji i djathtë i përmbajtjes, në të njëjtën
largësi nga skaji si shtylla e majtë. Poshtë saj lihet vend që butoni i asistentit të mos e mbulojë.

## 24 shtator 2026, avatari pa foto

### Një avatar për secilën gjini, jo fytyra të ndryshme
Portretet e vizatuara sipas emrit (ngjyrë lëkure, flokë, syze) u hoqën: pronari kërkoi një avatar të
vetëm, që nuk ngjan me asnjë racë. Tani ka tre: djalë, vajzë, neutral. Siluetë e sheshtë në ngjyrat e
markës, pa ngjyrë lëkure dhe pa tipare (`public/avatars/`).

### Gjinia vjen nga studenti, kurrë nga emri
`User.gender` zgjidhet te cilësimet dhe në hapin e fundit të hyrjes, me «Pa thënë» si zgjedhje e
barabartë. Hamendja nga emri do të gabonte dikë, dhe gabimi këtu është fyes. Seed-i e di gjininë sepse
emrat e tij dalin nga lista të ndara për djem dhe vajza.

### Avatari plotësohet në shtresën e bazës
`lib/db.ts` shton `gender` kudo ku lexohet `User.avatar` dhe plotëson avatarin që mungon, edhe brenda
relacioneve. Kështu 41 pyetjet që lexojnë avatarin nuk u prekën një nga një. Fusha e llogaritur e Prisma-s
u provua e para, por u ngjit objekteve një simbol dhe React-i refuzoi t'i kalonte te klienti; prandaj
shtrirja e pyetjes. Në bazë `avatar` mbetet null, dhe «a ka foto» pyetet me `isDefaultAvatar`.

## 24 shtator 2026, pa kod konfirmimi emaili

Pronari kërkoi që konfirmimi i emailit me kod të hiqet krejt. Në Netlify nuk ka ofrues emaili, kodi nuk
mbërrinte kurrë, dhe çdo llogari e re mbetej jashtë. Regjistrimi tani e hap llogarinë me email të shënuar
si të pranuar dhe çon drejt te profili. Faqja `/konfirmo`, veprimet e kodit dhe testi i tyre u hoqën;
modeli `EmailCode` mbetet në skemë, që baza live të mos ketë ndryshim. Shenja e verifikimit institucional
nuk jepet më nga domeni pas kodit: vjen vetëm nga `/verifikimi`.

## 25 shtator 2026, bisedë e re dhe fotot e mëdha

### Kërkimi i njerëzve te mesazhet
Deri tani një bisedë nisej vetëm nga profili. Tani faqja e mesazheve dhe paneli në shirit kanë një fushë
kërkimi për njerëzit, dhe «Bisedë e re» hap të njëjtin kërkim me shokët si sugjerim. Kërkimi provon edhe
variantet me germë të madhe, sepse Postgres-i i prodhimit i dallon.

### Pse nuk ngarkoheshin fotot e mëdha
Kufiri ditor i ngarkimeve (60) numëronte çdo copë 1MB, jo çdo skedar: një foto 6MB harxhonte gjashtë, dhe
pas pak fotosh ngarkimi ndalej për tërë ditën. Për më tepër kufiri ishte 8MB, ndërsa mesazhi i gabimit
thoshte 25MB. Tani kufiri numëron skedarët (200 në ditë), fotoja lejohet deri 25MB, dhe shfletuesi e
zvogëlon para dërgimit në 2560px, që edhe një foto 20MB të ngarkohet në sekonda.

### Faqja pa kufi gjerësie
Në ekrane mbi 1600px faqja rrinte në mes me hapësira bosh anash. Pronari kërkoi që të zërë tërë
ekranin: kufiri `max-w-[1600px]` u hoq nga shiriti dhe nga trupi, dhe feed-i nuk kufizohet më në 760px.

## 25 shtator 2026, filtra, njoftime, Kampusi dhe storjet

- **Karriera:** tre rreshta me çipa u bënë tri lista rënëse (lloji, fusha, qyteti) plus «Në distancë».
  Qytetet ishin vetëm ato që kishin punë; tani janë të 38 komunat, plus vendet e tjera që kanë punët.
- **Tregu:** lista e qytetit ishte `<select>` vendas mbi sfond të tejdukshëm, prandaj në errësirë dilte e
  bardhë. Tani është lista e temës, me të 38 komunat; çdo `<select>` tjetër merr ngjyrat e temës nga
  `globals.css`.
- **Kompozuesi:** shtrirja u bë listë vertikale me përshkrim, dhe Sondazhi e Zëri u bënë butona të njëjtë
  me Foto / Video dhe Kamerën.
- **«Nga Studentët.KS»:** përpara vetëm data, lloji dhe titulli me germa më të mëdha; detajet me prekje.
- **Kampusi:** dilnin vetëm sugjerimet, dhe kush ndiqej zhdukej. Tani ka shtatë pamje dhe kërkim me emër.
  Renditja brenda fakultetit është sipas emrit, jo sipas aktivitetit, që të mos zbulohet kush ishte aktiv.
- **Storjet:** fotoja e mbush storjen në vend që të rrijë në mes me sfond të turbullt; teksti shkruhet
  drejt mbi foto; filtri ndërrohet me rrëshqitje ose me pilula nën foto. Teksti i storjes nuk përsëritet
  më si titull poshtë saj te shikuesi, sepse është tashmë brenda fotos.
