export const COURSE_NOTES: { match: string; text: string }[] = [
  {
    match: "analizë matematike",
    text: "Derivati i një funksioni në një pikë është kufiri i raportit të ndryshimit të funksionit ndaj ndryshimit të argumentit, kur ky i fundit shkon në zero. Gjeometrikisht derivati jep pjerrësinë e tangjentes së grafikut në atë pikë. Integrali i caktuar është kufiri i shumave të Riemann dhe mat sipërfaqen nën kurbë. Teorema themelore e analizës i lidh të dyja: integrimi dhe derivimi janë veprime të kundërta.",
  },
  {
    match: "matematika 1",
    text: "Limiti përshkruan sjelljen e funksionit pranë një pike, pa qenë nevoja që funksioni të jetë i përcaktuar aty. Një funksion është i vazhdueshëm në një pikë kur limiti ekziston dhe përputhet me vlerën e funksionit. Derivati llogaritet me rregullat e prodhimit, të herësit dhe të zinxhirit. Funksioni ka ekstrem lokal aty ku derivati i parë bëhet zero dhe ndërron shenjë.",
  },
  {
    match: "matematikë për ekonomistë",
    text: "Funksioni i kërkesës e lidh sasinë e kërkuar me çmimin dhe zakonisht është zbritës. Elasticiteti matet si raport i ndryshimit përqindor të sasisë ndaj ndryshimit përqindor të çmimit. Derivati i parë i funksionit të fitimit tregon të ardhurën marxhinale, dhe fitimi maksimizohet aty ku ajo barazohet me koston marxhinale. Optimizimi me kufizime zgjidhet me shumëzuesin e Lagranzhit.",
  },
  {
    match: "algjebra lineare",
    text: "Matrica është një tabelë numrash mbi të cilën përkufizohen mbledhja dhe shumëzimi. Determinanti i një matrice katrore tregon nëse ajo është e invertueshme: matrica ka të anasjelltë vetëm kur determinanti nuk është zero. Sistemet lineare zgjidhen me eliminimin e Gausit. Vektori vetjak i një matrice është një vektor që nën veprimin e matricës ndryshon vetëm në gjatësi, dhe faktori i ndryshimit quhet vlerë vetjake.",
  },
  {
    match: "hyrje në programim",
    text: "Variabla është një emër që i referohet një vendi në memorie ku ruhet një vlerë. Tipi i të dhënës përcakton se cilat veprime lejohen mbi atë vlerë. Struktura e kontrollit if e ndan rrjedhën e programit sipas një kushti, ndërsa cikli while e përsërit një bllok sa kohë kushti qëndron i vërtetë. Funksioni është një bllok kodi me emër, që merr argumente dhe kthen një rezultat, dhe shërben për të mos e përsëritur të njëjtën logjikë.",
  },
  {
    match: "struktura të dhënash",
    text: "Vargu i ruan elementet në vende ngjitur të memories, prandaj qasja sipas indeksit është e menjëhershme, por futja në mes kërkon zhvendosje. Lista e lidhur e ruan secilin element me një tregues drejt tjetrit: futja është e lirë, por qasja kërkon kalim nga fillimi. Stiva punon sipas parimit i fundit brenda i pari jashtë, kurse radha sipas i pari brenda i pari jashtë. Pema binare e kërkimit e mban çdo vlerë më të vogël majtas dhe më të madhe djathtas, prandaj kërkimi është logaritmik kur pema është e balancuar.",
  },
  {
    match: "algoritme",
    text: "Kompleksiteti kohor shprehet me notacionin O të madh dhe tregon si rritet numri i veprimeve me madhësinë e hyrjes. Kërkimi binar punon vetëm mbi të dhëna të renditura dhe e përgjysmon hapësirën në çdo hap, prandaj është O(log n). Renditja me bashkim e ndan vargun më dysh, i rendit pjesët dhe i bashkon, me kompleksitet O(n log n) në çdo rast. Programimi dinamik i ruan zgjidhjet e nënproblemeve që të mos llogariten dy herë.",
  },
  {
    match: "bazat e të dhënave",
    text: "Çelësi primar e identifikon në mënyrë unike secilin rresht të një tabele, kurse çelësi i huaj e lidh rreshtin me një tabelë tjetër. Normalizimi i ndan të dhënat në tabela që të mos përsëriten dhe të mos bien në kundërshtim me njëra-tjetrën. Bashkimi i brendshëm i kthen vetëm rreshtat që përputhen në të dyja tabelat, kurse bashkimi i majtë i mban të gjithë rreshtat e tabelës së majtë. Transaksioni ka katër veti: atomicitet, qëndrueshmëri, izolim dhe përhershmëri.",
  },
  {
    match: "programim i orientuar në objekte",
    text: "Klasa është plani, objekti është realizimi konkret i atij plani në memorie. Enkapsulimi i fsheh të dhënat brenda objektit dhe e lejon qasjen vetëm përmes metodave. Trashëgimia e lejon një klasë t'i marrë sjelljet e një klase tjetër dhe t'i shtojë ose ndryshojë. Polimorfizmi e lejon të njëjtën thirrje metode të sillet ndryshe sipas tipit real të objektit.",
  },
  {
    match: "rrjeta kompjuterike",
    text: "Modeli OSI e ndan komunikimin në shtatë shtresa, nga fizikja te aplikativja. Protokolli TCP siguron dorëzim të renditur dhe pa humbje përmes konfirmimeve dhe ridërgimit, kurse UDP nuk garanton asgjë por është më i shpejtë. Adresa IP e identifikon pajisjen në rrjet, ndërsa porta e identifikon shërbimin brenda pajisjes. DNS e përkthen emrin e domenit në adresë IP.",
  },
  {
    match: "sisteme operative",
    text: "Procesi është një program në ekzekutim me hapësirën e vet të memories, kurse fija është njësi ekzekutimi brenda procesit që e ndan atë hapësirë. Planifikuesi vendos cili proces e merr procesorin dhe për sa kohë. Bllokimi i ndërsjellë ndodh kur dy procese e presin njëri-tjetrin dhe asnjëri nuk e lëshon burimin që mban. Memoria virtuale e lejon programin ta shohë një hapësirë të vazhdueshme, ndërsa sistemi i ruan faqet në disk kur memoria fizike mbaron.",
  },
  {
    match: "inxhinieri softuerike",
    text: "Kërkesat funksionale e përshkruajnë çfarë bën sistemi, ato jofunksionale se sa mirë e bën: shpejtësi, siguri, disponueshmëri. Modeli ujëvarë i kalon fazat një nga një, kurse metodat e shkathëta punojnë me përsëritje të shkurtra dhe kthim informacioni nga përdoruesi. Testimi njësi e provon një funksion të vetëm të izoluar, testimi i integrimit i provon pjesët së bashku. Borxhi teknik është kostoja e ardhshme e një zgjidhjeje të shpejtë të sotme.",
  },
  {
    match: "programim në ueb",
    text: "HTML e jep strukturën e dokumentit, CSS paraqitjen dhe JavaScript sjelljen. Kërkesa HTTP ka metodë, adresë, koka dhe trup opsional, kurse përgjigjja ka kod statusi. Modeli i objektit të dokumentit e paraqet faqen si pemë nyjesh që skripti mund ta ndryshojë. Renderimi në server e dërgon HTML të gatshëm, ai në klient e ndërton faqen në shfletues.",
  },
  {
    match: "mikroekonomi",
    text: "Kurba e kërkesës zbret sepse në çmim më të ulët konsumatorët blejnë më shumë, kurse ajo e ofertës ngjitet. Pika ku ato priten është ekuilibri i tregut. Kostoja oportune e një zgjedhjeje është vlera e alternativës më të mirë të hequr dorë. Firma e maksimizon fitimin në sasinë ku e ardhura marxhinale barazohet me koston marxhinale.",
  },
  {
    match: "makroekonomi",
    text: "Produkti i brendshëm bruto e mat vlerën e të gjitha të mirave dhe shërbimeve përfundimtare të prodhuara brenda një vendi gjatë një viti. Inflacioni është rritja e përgjithshme e nivelit të çmimeve me kalimin e kohës, dhe matet zakonisht me indeksin e çmimeve të konsumit. Papunësia matet si përqindje e fuqisë punëtore aktive që kërkon punë dhe nuk gjen. Politika monetare vepron përmes normës së interesit, kurse ajo fiskale përmes tatimeve dhe shpenzimeve publike.",
  },
  {
    match: "ekonometri",
    text: "Regresioni linear e modelon lidhjen mes një ndryshoreje të varur dhe një a më shumë të pavarura. Metoda e katrorëve më të vegjël i zgjedh koeficientët që e minimizojnë shumën e katrorëve të mbetjeve. Koeficienti i përcaktimit tregon sa nga ndryshueshmëria e të dhënave e shpjegon modeli. Multikolineariteti shfaqet kur dy ndryshore të pavarura janë shumë të lidhura mes vete dhe i bën koeficientët të paqëndrueshëm.",
  },
  {
    match: "statistikë",
    text: "Mesatarja aritmetike ndikohet nga vlerat ekstreme, kurse mediana jo, prandaj për të dhëna të shtrembëruara mediana e përshkruan më mirë qendrën. Devijimi standard e mat shpërndarjen e vlerave rreth mesatares. Shpërndarja normale është simetrike, dhe rreth 95 për qind e vlerave bien brenda dy devijimeve standarde nga mesatarja. Testi i hipotezës e refuzon hipotezën zero kur vlera p është më e vogël se niveli i zgjedhur i domethënies.",
  },
  {
    match: "bazat e kontabilitetit",
    text: "Ekuacioni themelor i kontabilitetit thotë se aktivet janë të barabarta me detyrimet plus kapitalin. Çdo transaksion shënohet dy herë, një herë në debi dhe një herë në kredi, dhe shumat duhet të barazohen. Bilanci e tregon gjendjen në një moment të caktuar, kurse pasqyra e të ardhurave e tregon performancën gjatë një periudhe. Amortizimi e shpërndan koston e një aktivi afatgjatë përgjatë viteve të përdorimit.",
  },
  {
    match: "kontabilitet financiar",
    text: "Parimi i përllogaritjes kërkon që të ardhurat të njihen kur fitohen, jo kur arkëtohen. Pasqyra e rrjedhës së parasë i ndan lëvizjet në veprimtari operative, investuese dhe financuese. Inventari vlerësohet me metodën i pari hyrë i pari dalë ose me koston mesatare të ponderuar. Provizioni njihet kur ekziston një detyrim i mundshëm që mund të vlerësohet me besueshmëri.",
  },
  {
    match: "bazat e menaxhmentit",
    text: "Menaxhimi ka katër funksione: planifikim, organizim, udhëheqje dhe kontroll. Struktura funksionale i grupon njerëzit sipas specialitetit, kurse ajo divizionale sipas produktit ose tregut. Analiza SWOT i vendos përballë njëra-tjetrës pikat e forta, të dobëta, mundësitë dhe kërcënimet. Delegimi e kalon autoritetin poshtë, por përgjegjësia përfundimtare mbetet te menaxheri.",
  },
  {
    match: "marketing",
    text: "Miksi i marketingut përfshin produktin, çmimin, vendin dhe promovimin. Segmentimi e ndan tregun në grupe me nevoja të ngjashme, pastaj zgjidhet segmenti i synuar dhe pozicionimi në mendjen e konsumatorit. Cikli i jetës së produktit kalon nëpër hyrje, rritje, pjekuri dhe rënie, dhe strategjia ndryshon në secilën fazë. Vlera e perceptuar, jo kostoja, është ajo që e mban çmimin.",
  },
  {
    match: "sjellje organizative",
    text: "Motivimi i brendshëm vjen nga vetë puna, ai i jashtëm nga shpërblimi. Teoria e Maslout i rendit nevojat nga fiziologjike te vetërealizimi. Kultura organizative janë vlerat dhe normat e pashkruara që e përcaktojnë si sillen njerëzit kur askush nuk i shikon. Konflikti nuk është gjithmonë i dëmshëm: konflikti mbi idetë e përmirëson vendimin, ai mbi personat e prish ekipin.",
  },
  {
    match: "menaxhim projektesh",
    text: "Projekti ka fillim dhe fund të përcaktuar dhe jep një rezultat unik. Trekëndëshi i kufizimeve i lidh qëllimin, kohën dhe koston: ndryshimi i njërit i prek të tjerët. Struktura e ndarjes së punës e copëton projektin në detyra të matshme. Rruga kritike është vargu i detyrave që e përcakton kohëzgjatjen minimale, dhe një vonesë aty e vonon tërë projektin.",
  },
  {
    match: "anatomi e njeriut",
    text: "Trupi i njeriut organizohet në qeliza, inde, organe dhe sisteme. Sistemi skeletor ka rreth 206 eshtra te i rrituri dhe kryen mbështetje, mbrojtje dhe prodhim të qelizave të gjakut. Zemra ka katër dhoma: dy atriume që e marrin gjakun dhe dy ventrikuj që e nxjerrin. Mëlçia e prodhon biliaren, e ruan glukozën si glikogjen, i zbërthen ilaçet dhe e sintetizon albuminën e plazmës.",
  },
  {
    match: "anatomi funksionale",
    text: "Muskuli skeletor lidhet me eshtrat përmes tendinave dhe e prodhon lëvizjen duke u tkurrur. Agonisti e kryen lëvizjen, antagonisti e kundërshton dhe e kontrollon atë. Nyja e gjurit është nyje mentesh dhe e lejon kryesisht përkuljen dhe shtrirjen, me rrotullim të kufizuar. Qëndrimi i drejtë varet nga baraspesha mes muskujve të përparmë dhe të pasmë të trungut.",
  },
  {
    match: "fiziologji",
    text: "Homeostaza është aftësia e organizmit ta mbajë mjedisin e brendshëm të qëndrueshëm pavarësisht ndryshimeve të jashtme. Potenciali i veprimit në neuron lind nga hyrja e shpejtë e joneve të natriumit dhe dalja e kaliumit. Veshkat e rregullojnë vëllimin dhe përbërjen e gjakut përmes filtrimit glomerular dhe riabsorbimit tubular. Frymëmarrja rregullohet kryesisht nga niveli i dioksidit të karbonit në gjak, jo nga oksigjeni.",
  },
  {
    match: "patologji",
    text: "Inflamacioni akut ka pesë shenja klasike: skuqje, ënjtje, nxehtësi, dhimbje dhe humbje funksioni. Nekroza është vdekje qelizore e pakontrolluar me shpërthim të përmbajtjes, kurse apoptoza është vdekje e programuar dhe e rregulluar. Neoplazia beninje rritet ngadalë dhe mbetet e kufizuar, ajo malinje e pushton indin përreth dhe jep metastaza. Ishemia shkakton dëmtim sepse indi nuk merr oksigjen të mjaftueshëm.",
  },
  {
    match: "farmakologji",
    text: "Farmakokinetika e përshkruan çfarë i bën organizmi ilaçit: absorbim, shpërndarje, metabolizëm dhe eliminim. Farmakodinamika e përshkruan çfarë i bën ilaçi organizmit, përmes lidhjes me receptorë. Gjysmëjeta është koha që i duhet përqendrimit në plazmë të bjerë përgjysmë dhe e përcakton intervalin e dozimit. Agonisti e aktivizon receptorin, antagonisti e bllokon pa e aktivizuar.",
  },
  {
    match: "biokimi",
    text: "Proteinat ndërtohen nga aminoacidet e lidhura me lidhje peptidike, dhe funksioni varet nga struktura tredimensionale. Enzimat e ulin energjinë e aktivizimit dhe e shpejtojnë reaksionin pa u konsumuar vetë. Glikoliza e zbërthen glukozën në piruvat dhe jep dy molekula ATP pa oksigjen. Cikli i Krebsit dhe zinxhiri i transportit të elektroneve e prodhojnë pjesën më të madhe të ATP-së në prani të oksigjenit.",
  },
  {
    match: "histologji",
    text: "Indi epitelial i mbulon sipërfaqet dhe i vesh zgavrat, me qeliza të ngjitura ngushtë dhe pa enë gjaku. Indi lidhor e mbush hapësirën mes organeve dhe e ka të zhvilluar matriksin jashtëqelizor. Indi muskulor ndahet në të strijuar skeletor, të zemrës dhe të lëmuar. Ngjyrosja me hematoksilinë dhe eozinë i bën bërthamat të kaltra dhe citoplazmën rozë.",
  },
  {
    match: "morfologji dentare",
    text: "I rrituri ka 32 dhëmbë të përhershëm, tetë në secilën gjysmë të harkut: dy prerës, një kanin, dy paramolarë dhe tre molarë. Kurora mbulohet nga smalti, indi më i fortë i trupit, ndërsa rrënja nga cementi. Dentina e përbën masën kryesore dhe e përcjell ndjeshmërinë drejt pulpës. Kontakti i duhur mes dhëmbëve fqinjë e mbron papilën dhe e parandalon mbetjen e ushqimit.",
  },
  {
    match: "kujdesi infermieror",
    text: "Procesi infermieror ka pesë hapa: vlerësim, diagnozë, planifikim, zbatim dhe vlerësim i rezultatit. Shenjat vitale përfshijnë temperaturën, pulsin, frymëmarrjen, tensionin arterial dhe ngopjen me oksigjen. Higjiena e duarve mbetet masa më efektive për parandalimin e infeksioneve spitalore. Dokumentimi duhet të jetë i saktë, i menjëhershëm dhe pa interpretime personale.",
  },
  {
    match: "fizioterapi",
    text: "Vlerësimi nis nga anamneza, vazhdon me vëzhgimin e qëndrimit dhe matjen e amplitudës së lëvizjes. Ushtrimi aktiv e kryen pacienti vetë, ai pasiv kryhet nga terapisti pa përpjekje muskulore. Ftohja përdoret në fazën akute për ta ulur ënjtjen, nxehtësia më vonë për ta rritur qarkullimin. Rikthimi në aktivitet bëhet gradualisht dhe sipas dhimbjes, jo sipas kalendarit.",
  },
  {
    match: "hyrje në të drejtën",
    text: "Norma juridike ka tri pjesë: hipotezën, dispozitën dhe sanksionin. E drejta objektive është tërësia e normave, e drejta subjektive është mundësia që norma ia jep një personi. Burimet e së drejtës janë kushtetuta, ligji, akti nënligjor, zakoni dhe praktika gjyqësore. Hierarkia e akteve kërkon që akti më i ulët të mos bjerë ndesh me atë më të lartin.",
  },
  {
    match: "e drejta civile",
    text: "Kontrata lind nga takimi i vullneteve dhe kërkon zotësi juridike, pëlqim të lirë, objekt të lejuar dhe shkak të ligjshëm. Pronësia përfshin të drejtën e përdorimit, të përfitimit dhe të disponimit. Përgjegjësia jashtëkontraktore lind kur dikush shkakton dëm me faj dhe detyrohet ta shpërblejë. Parashkrimi e shuan mundësinë e kërkimit gjyqësor pas kalimit të afatit ligjor.",
  },
  {
    match: "e drejta penale",
    text: "Vepra penale ka katër elemente: veprimin, pasojën, lidhjen shkakësore dhe fajin. Dashja ekziston kur kryesi e dëshiron pasojën ose e pranon atë, pakujdesia kur nuk e parashikon ndonëse duhej. Mbrojtja e nevojshme e përjashton kundërligjshmërinë kur sulmi është i atëçastshëm dhe i kundërligjshëm. Parimi i ligjshmërisë thotë se nuk ka vepër penale dhe as dënim pa ligj të mëparshëm.",
  },
  {
    match: "e drejta e punës",
    text: "Kontrata e punës mund të jetë me afat të caktuar ose të pacaktuar, dhe forma me shkrim është e detyrueshme. Koha e plotë e punës nuk i kalon dyzet orë në javë, dhe puna jashtë orarit paguhet me shtesë. Pushimi vjetor nuk mund të jetë më i shkurtër se katër javë pune. Ndërprerja e kontratës nga punëdhënësi kërkon arsye të justifikuar dhe njoftim paraprak.",
  },
  {
    match: "e drejta administrative",
    text: "Akti administrativ është vendim i organit publik që prodhon pasoja juridike ndaj një subjekti të caktuar. Procedura administrative kërkon dëgjimin e palës para se të merret vendimi që e prek atë. Ankesa administrative i drejtohet organit më të lartë, pastaj hapet rruga e kontrollit gjyqësor. Diskrecioni nuk do të thotë arbitraritet: vendimi duhet arsyetuar dhe duhet të jetë proporcional.",
  },
  {
    match: "e drejta romake",
    text: "E drejta romake e ndau materien në personat, sendet dhe padinë. Persona sui iuris ishin ata që nuk i nënshtroheshin pushtetit të tjetrit, alieni iuris ata që i nënshtroheshin. Mancipatio ishte forma solemne e kalimit të pronësisë mbi sendet res mancipi. Institucionet e Justinianit mbeten baza mbi të cilën u ndërtua e drejta civile evropiane.",
  },
  {
    match: "kimi e përgjithshme",
    text: "Atomi përbëhet nga bërthama me protone dhe neutrone, dhe nga elektronet që lëvizin rreth saj. Numri atomik është numri i protoneve dhe e përcakton elementin. Lidhja jonike lind nga kalimi i elektroneve, ajo kovalente nga ndarja e tyre. Moli përmban numrin e Avogadros të njësive, rreth 6,022 herë dhjetë në fuqinë njëzetetre.",
  },
  {
    match: "kimi organike",
    text: "Karboni formon katër lidhje dhe mund të lidhet me vetveten në zinxhirë e unaza, prandaj numri i komponimeve organike është kaq i madh. Grupi funksional e përcakton sjelljen kimike të molekulës: hidroksili te alkoolet, karbonili te aldehidet dhe ketonet, karboksili te acidet. Izomerët kanë të njëjtën formulë molekulare por strukturë të ndryshme. Reaksioni i zëvendësimit e ndërron një grup me një tjetër, ai i adicionit i shton atome në një lidhje të dyfishtë.",
  },
  {
    match: "fizikë e përgjithshme",
    text: "Ligji i parë i Njutonit thotë se trupi e ruan gjendjen e qetësisë ose të lëvizjes drejtvizore të njëtrajtshme derisa mbi të vepron një forcë. Ligji i dytë e lidh forcën me masën dhe nxitimin. Energjia nuk krijohet dhe nuk zhduket, por shndërrohet nga një formë në tjetrën. Momenti i impulsit ruhet kur mbi sistemin nuk vepron moment i jashtëm force.",
  },
  {
    match: "termodinamikë",
    text: "Ligji i parë i termodinamikës është ruajtja e energjisë: ndryshimi i energjisë së brendshme është nxehtësia e dhënë minus puna e kryer. Ligji i dytë thotë se entropia e një sistemi të izoluar nuk zvogëlohet kurrë. Procesi izotermik ndodh në temperaturë konstante, ai adiabatik pa shkëmbim nxehtësie. Cikli i Karnosë e jep efikasitetin maksimal teorik mes dy temperaturave.",
  },
  {
    match: "mekanika teknike",
    text: "Statika i studion trupat në ekuilibër, ku shuma e forcave dhe shuma e momenteve janë zero. Forca e prerjes dhe momenti përkulës e përcaktojnë sforcimin brenda trarit. Tensioni normal është forca për njësi sipërfaqe, dhe ligji i Hukut e lidh atë me deformimin relativ derisa materiali mbetet elastik. Koeficienti i sigurisë e mban sforcimin e punës nën kufirin e rrjedhshmërisë.",
  },
  {
    match: "elemente makinash",
    text: "Lidhja me vidë e bashkon dy pjesë dhe mban kryesisht ngarkesë tërheqëse, prandaj momenti i shtrëngimit duhet kontrolluar. Kushineta me rrotullim e zvogëlon fërkimin mes boshtit dhe strehës dhe zgjidhet sipas ngarkesës radiale e aksiale. Transmisioni me dhëmbëzorë e ndryshon shpejtësinë dhe momentin në raport të kundërt me numrin e dhëmbëve. Lodhja e materialit shkakton thyerje nën ngarkesa të përsëritura shumë nën kufirin e rrjedhshmërisë.",
  },
  {
    match: "bazat e elektroteknikës",
    text: "Ligji i Omit e lidh tensionin me rrymën dhe rezistencën. Në lidhjen serike rryma është e njëjtë dhe rezistencat mblidhen, në atë paralele tensioni është i njëjtë dhe përcjellshmëritë mblidhen. Ligjet e Kirkofit thonë se shuma e rrymave në një nyje është zero dhe shuma e tensioneve në një konturë të mbyllur është zero. Fuqia në një qark të rrymës së vazhduar është prodhimi i tensionit me rrymën.",
  },
  {
    match: "makina elektrike",
    text: "Transformatori punon me induksion elektromagnetik dhe e ndryshon tensionin pa e ndryshuar frekuencën. Raporti i tensioneve është i barabartë me raportin e numrit të spirave. Motori asinkron trefazor e krijon një fushë magnetike rrotulluese në stator, dhe rotori e ndjek atë me një rrëshqitje të vogël. Gjeneratori e bën veprimin e kundërt: e shndërron energjinë mekanike në elektrike.",
  },
  {
    match: "materialet e ndërtimit",
    text: "Betoni përbëhet nga çimentoja, agregati, uji dhe ndonjëherë shtesat. Raporti ujë-çimento e përcakton rezistencën: sa më i ulët, aq më e lartë rezistenca, por aq më e vështirë vendosja. Çeliku e merr tërheqjen aty ku betoni është i dobët, prandaj kombinohen në betonin e armuar. Rezistenca në shtypje matet zakonisht në kube ose cilindra pas njëzetetetë ditësh.",
  },
  {
    match: "projektim arkitektonik",
    text: "Projekti nis nga programi funksional: cilat hapësira duhen, sa të mëdha dhe si lidhen mes vete. Orientimi ndaj diellit dhe erës e përcakton rehatinë dhe konsumin e energjisë para se të vendoset forma. Shkalla e vizatimit zgjidhet sipas nivelit të detajit, nga situacioni te detaji konstruktiv. Qarkullimi vertikal dhe daljet e emergjencës janë kufizime që nuk negociohen.",
  },
  {
    match: "gjeologji",
    text: "Shkëmbinjtë ndahen në magmatikë, sedimentarë dhe metamorfikë sipas mënyrës së formimit. Cikli i shkëmbinjve i lidh të tria: njëri shndërrohet në tjetrin nën temperaturë, shtypje ose gërryerje. Tektonika e pllakave i shpjegon tërmetet, vullkanet dhe malformimin e vargmaleve. Shtresëzimi i lejon gjeologët ta lexojnë kohën relative: shtresa më e ulët është më e vjetër, përveç kur struktura është përmbysur.",
  },
  {
    match: "psikologji e përgjithshme",
    text: "Perceptimi nuk është kopjim i realitetit, por ndërtim aktiv ku përvoja e mëparshme e plotëson informacionin që mungon. Kujtesa afatshkurtër mban rreth shtatë njësi për pak dhjetëra sekonda, ndërsa ajo afatgjatë nuk ka kufi të njohur. Kushtëzimi klasik e lidh një stimul neutral me një reagim, ai operant e forcon sjelljen përmes pasojave. Paragjykimi i konfirmimit na bën ta kërkojmë informacionin që e mbështet atë që besojmë.",
  },
  {
    match: "psikologji zhvillimore",
    text: "Piazhe i përshkroi katër stade: senzorimotor, paraoperacional, i operacioneve konkrete dhe i atyre formale. Vygotski theksoi se zhvillimi ndodh në bashkëveprim shoqëror, brenda zonës së zhvillimit të afërm. Lidhja e sigurt me kujdestarin në vitet e para e mbështet rregullimin emocional më vonë. Adoleshenca karakterizohet nga ndërtimi i identitetit dhe nga rritja e ndikimit të bashkëmoshatarëve.",
  },
  {
    match: "pedagogji",
    text: "Mësimdhënia e mirë nis nga objektiva të qarta të të nxënit, jo nga përmbajtja. Vlerësimi formativ ndodh gjatë procesit dhe e udhëzon nxënësin, ai përmbledhës në fund dhe e mat rezultatin. Diferencimi do të thotë përshtatje e detyrës, jo ulje e pritshmërisë. Kthimi i informacionit ndihmon kur është specifik, i menjëhershëm dhe i lidhur me kriterin, jo kur është vetëm notë.",
  },
  {
    match: "hyrje në sociologji",
    text: "Sociologjia e studion sjelljen njerëzore si produkt të strukturave shoqërore, jo vetëm të zgjedhjeve individuale. Socializimi është procesi përmes të cilit individi i përvetëson normat dhe vlerat e grupit. Statusi është pozita në strukturë, roli është sjellja që pritet nga ajo pozitë. Stratifikimi shoqëror e shpërndan në mënyrë të pabarabartë pasurinë, pushtetin dhe prestigjin.",
  },
  {
    match: "gjuhësi e përgjithshme",
    text: "Sosyri e ndau gjuhën si sistem nga ligjërimi si përdorim konkret. Shenja gjuhësore ka dy anë, kuptuesin dhe të kuptuarin, dhe lidhja mes tyre është arbitrare. Sinkronia e studion gjuhën në një moment të caktuar, diakronia në zhvillimin historik. Niveli fonologjik, morfologjik, sintaksor dhe semantik e përshkruajnë gjuhën nga tingulli te kuptimi.",
  },
  {
    match: "fonetikë",
    text: "Fonetika i studion tingujt si dukuri fizike, fonologjia funksionin e tyre dallues brenda një gjuhe. Fonema është njësia më e vogël që e ndryshon kuptimin, siç dëshmohet nga çiftet minimale. Zanoret klasifikohen sipas lartësisë së gjuhës, pjesës së gojës dhe rrumbullakimit të buzëve. Bashkëtingëlloret klasifikohen sipas vendit, mënyrës së shqiptimit dhe zëshmërisë.",
  },
  {
    match: "morfologji e gjuhës angleze",
    text: "Morfema është njësia më e vogël me kuptim, dhe ndahet në të lira që qëndrojnë vetë dhe të lidhura që kërkojnë bazë. Prapashtesat rrjedhore e ndryshojnë klasën e fjalës, ato eptimore vetëm formën gramatikore. Anglishtja e formon shumësin kryesisht me prapashtesën s, por ruan edhe forma të parregullta të trashëguara. Përbërja dhe konvertimi janë dy mënyrat më prodhimtare të fjalëformimit në anglishten bashkëkohore.",
  },
  {
    match: "letërsi shqipe",
    text: "Letërsia e vjetër shqipe nis me Mesharin e Gjon Buzukut të vitit 1555, libri i parë i njohur në gjuhën shqipe. Rilindja Kombëtare e vuri letërsinë në shërbim të vetëdijes kombëtare, me Naim Frashërin si zë qendror. Poezia moderne shqipe u zhvillua përtej modelit romantik, me Lasgush Poradecin dhe më vonë me Martin Camajn. Analiza e tekstit letrar kërkon vëmendje njëkohësisht te forma dhe te konteksti historik.",
  },
  {
    match: "përkthim",
    text: "Përkthimi fjalë për fjalë e ruan formën dhe e humb kuptimin, prandaj njësia e përkthimit rrallë është fjala. Ekuivalenca formale i qëndron pranë burimit, ajo dinamike i jep përparësi efektit te lexuesi i ri. Termat teknikë kërkojnë qëndrueshmëri brenda të njëjtit tekst, prandaj mbahet fjalorth. Interpretimi konsekutiv punon me shënime dhe memorie, ai simultan me vonesë prej pak sekondash.",
  },
  {
    match: "histori e artit",
    text: "Arti i Rilindjes e rikthen perspektivën lineare dhe përmasat e trupit të njeriut si masë. Baroku e kërkon lëvizjen, kontrastin e fortë të dritës dhe ndjesinë dramatike. Impresionizmi e braktisi studion për ta pikturuar dritën jashtë, me penelata të dukshme. Arti modern e zhvendosi pyetjen nga çfarë përfaqëson vepra te si vepron ajo mbi shikuesin.",
  },
  {
    match: "solfezh",
    text: "Solfezhi e lidh shenjën e shkruar me tingullin e kënduar, prandaj ushtrohet me intonim dhe me ritëm njëkohësisht. Shkalla madhore ka gjysmëtone mes shkallës së tretë dhe të katërt dhe mes të shtatës e të tetës. Intervali matet si numër shkallësh dhe cilësohet si i pastër, madhor, minor, i zmadhuar ose i zvogëluar. Masa e tregon si grupohen rrahjet, dhe theksi bie natyrshëm në rrahjen e parë.",
  },
  {
    match: "pikturë",
    text: "Ngjyrat parësore nuk fitohen nga përzierja, kurse dytësoret lindin nga përzierja e dy parësoreve. Ngjyrat plotësuese qëndrojnë përballë njëra-tjetrës në rrethin kromatik dhe e forcojnë njëra-tjetrën kur vihen pranë. Vlera e tonit, jo ngjyra, e ndërton formën dhe thellësinë. Kompozimi udhëhiqet nga pesha vizuale dhe nga rruga që e ndjek syri nëpër sipërfaqe.",
  },
  {
    match: "vizatim",
    text: "Vizatimi nis nga vëzhgimi i raporteve, jo nga detaji: fillimisht ndërtohen masat kryesore dhe boshtet. Perspektiva me një pikë ikjeje përdoret kur objekti shihet ballazi, ajo me dy pika kur shihet nga këndi. Hija e vet qëndron mbi objekt, hija e hedhur bie mbi sipërfaqen përreth dhe e ngul objektin në hapësirë. Linja e ndryshueshme në trashësi e jep thellësinë më mirë se një linjë uniforme.",
  },
  {
    match: "botanikë",
    text: "Fotosinteza ndodh në kloroplaste dhe e shndërron dioksidin e karbonit dhe ujin në glukozë duke përdorur energjinë e dritës. Rrënja e thith ujin dhe kripërat minerale, kërcelli i përcjell, gjethja e kryen shkëmbimin e gazeve. Ksilemi e çon ujin lart, floemi i shpërndan lëndët ushqyese në të dyja drejtimet. Stomat e rregullojnë humbjen e ujit dhe hyrjen e dioksidit të karbonit.",
  },
  {
    match: "zoologji",
    text: "Klasifikimi i kafshëve nis nga plani i trupit: simetria, prania e zgavrës trupore dhe mënyra e zhvillimit embrional. Jovertebrorët përbëjnë pjesën dërrmuese të specieve të njohura. Vertebrorët ndahen në peshq, amfibë, zvarranikë, zogj dhe gjitarë. Homeotermia e mban temperaturën e trupit të qëndrueshme dhe kërkon konsum të lartë energjie.",
  },
  {
    match: "prodhimtari bimore",
    text: "Rotacioni i kulturave e ruan pjellorinë e tokës dhe i ndërpret ciklet e sëmundjeve. Bimët bishtajore e fiksojnë azotin atmosferik përmes baktereve simbiotike në nyjet e rrënjëve. Koha e mbjelljes përcaktohet nga temperatura e tokës dhe lagështia, jo nga kalendari. Plehërimi bëhet mbi bazën e analizës së tokës, që të mos shpenzohet dhe të mos ndotet.",
  },
  {
    match: "agroteknikë",
    text: "Përgatitja e tokës synon strukturë të thërrmuar që e mban ujin dhe e lejon rrënjën të depërtojë. Lërimi i thellë e përmbys shtresën, punimi minimal e ruan lagështinë dhe e zvogëlon erozionin. Ujitja me pika e çon ujin te rrënja dhe i zvogëlon humbjet nga avullimi. Mbrojtja e integruar e bimëve e vë kontrollin kimik si mjet të fundit, pas atij agroteknik e biologjik.",
  },
];

/** Shënimet e lëndës, nëse ekzistojnë për këtë emër. */
export function courseNotes(courseName: string): string | null {
  const name = courseName.toLowerCase();
  const found = COURSE_NOTES.find((entry) => name.includes(entry.match));
  return found ? found.text : null;
}
