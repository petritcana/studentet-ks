// Kurset e demos me përmbajtje të vërtetë. Mësimet janë tekst dhe kuize, jo video:
// nuk kemi video për t'i ngarkuar, dhe një lidhje drejt një skedari që s'ekziston
// është më keq se asnjë.

export type QuizQuestion = { question: string; options: string[]; answer: number };

export type SeedLesson =
  | { title: string; kind: "text"; minutes: number; body: string; preview?: boolean }
  | { title: string; kind: "quiz"; questions: QuizQuestion[] };

export type SeedCourse = {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  priceCents: number;
  sections: { title: string; lessons: SeedLesson[] }[];
};

export const COURSES: SeedCourse[] = [
  {
    title: "Statistika e aplikuar me R",
    subtitle: "Nga një skedar i çrregullt te një raport që lexohet",
    description:
      "Nisim me një skedar të vërtetë të dhënash dhe mbarojmë me një raport të plotë. Çdo test statistikor vjen bashkë me pyetjen që i përgjigjet, jo si formulë e shkëputur.",
    category: "Statistikë",
    level: "intermediate",
    priceCents: 2900,
    sections: [
      {
        title: "Të dhënat para analizës",
        lessons: [
          {
            title: "Leximi i një skedari CSV",
            kind: "text",
            minutes: 8,
            preview: true,
            body:
              "Funksioni read.csv() e lexon skedarin dhe kthen një data frame, pra një tabelë ku çdo kolonë ka tipin e vet.\n\nPara çdo analize shiko strukturën me str() dhe pesë rreshtat e parë me head(). Shumica e gabimeve në fund të analizës vijnë nga një kolonë numerike që R e ka lexuar si tekst, zakonisht sepse diku ka një presje në vend të pikës dhjetore.\n\nKontrollo edhe vlerat që mungojnë me colSums(is.na(df)). Nëse një kolonë ka më shumë se një të tretën bosh, mendohu mirë para se ta përdorësh.",
          },
          {
            title: "Pastrimi dhe vlerat që mungojnë",
            kind: "text",
            minutes: 12,
            body:
              "Ka tri rrugë kur mungojnë vlera: i heq rreshtat, i plotëson, ose e lë kolonën jashtë. Asnjëra nuk është e drejtë gjithmonë.\n\nHeqja me na.omit() është e sigurt kur mungesat janë pak dhe të rastësishme. Plotësimi me mesataren e ul variancën artificialisht, prandaj mediana është zakonisht zgjedhje më e mirë për të dhëna të shtrembëruara.\n\nShkruaj gjithmonë në raport çfarë bëre me mungesat. Lexuesi duhet ta dijë se sa rreshta humbën gjatë rrugës.",
          },
          {
            title: "Kontrolli i njohurive",
            kind: "quiz",
            questions: [
              {
                question: "Cili funksion tregon tipin e secilës kolonë?",
                options: ["head()", "str()", "summary()", "names()"],
                answer: 1,
              },
              {
                question: "Për të dhëna të shtrembëruara, cila vlerë është më e sigurt për plotësim?",
                options: ["Mesatarja", "Moda", "Mediana", "Zero"],
                answer: 2,
              },
            ],
          },
        ],
      },
      {
        title: "Testet që përdoren më shpesh",
        lessons: [
          {
            title: "Testi t për dy grupe",
            kind: "text",
            minutes: 14,
            body:
              "Testi t krahason mesataret e dy grupeve. Pyetja që i bën të dhënave është e thjeshtë: a është ndryshimi që shohim më i madh se ai që do ta prisnim nga rastësia?\n\nNë R shkruhet t.test(nota ~ grupi, data = df). Rezultati jep vlerën p dhe intervalin e besimit. Intervali të thotë më shumë: jo vetëm nëse ka ndryshim, por sa i madh mund të jetë.\n\nTesti supozon shpërndarje afërsisht normale. Me grupe të vogla dhe të dhëna shumë të shtrembëruara, përdor wilcox.test().",
          },
          {
            title: "Korrelacioni dhe kufijtë e tij",
            kind: "text",
            minutes: 10,
            body:
              "cor(x, y) jep koeficientin e Pearsonit, nga -1 te 1. Një vlerë afër zeros do të thotë që nuk ka lidhje lineare, jo që nuk ka lidhje fare.\n\nKorrelacioni nuk tregon shkak. Dy variabla mund të lëvizin bashkë sepse të dyja varen nga një e tretë që nuk e ke matur.\n\nVizato gjithmonë grafikun e shpërndarjes para se ta besosh numrin. Një pikë e vetme ekstreme mund ta ndryshojë koeficientin krejtësisht.",
          },
          {
            title: "Kontrolli përfundimtar",
            kind: "quiz",
            questions: [
              {
                question: "Çfarë krahason testi t për dy grupe?",
                options: ["Variancat", "Mesataret", "Medianat", "Proporcionet"],
                answer: 1,
              },
              {
                question: "Një korrelacion afër zeros do të thotë:",
                options: [
                  "Nuk ka asnjë lidhje",
                  "Nuk ka lidhje lineare",
                  "Njëra variabël shkakton tjetrën",
                  "Të dhënat janë gabim",
                ],
                answer: 1,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Bazat e programimit në Python",
    subtitle: "Për ata që nuk kanë shkruar kurrë kod",
    description:
      "Fillon nga variabla e parë dhe mbaron me një program të vogël që e përdor vetë. Çdo mësim ka një ushtrim, dhe zgjidhja shpjegohet hap pas hapi.",
    category: "Programim",
    level: "beginner",
    priceCents: 0,
    sections: [
      {
        title: "Hapat e parë",
        lessons: [
          {
            title: "Variablat dhe tipet",
            kind: "text",
            minutes: 9,
            preview: true,
            body:
              "Një variabël është një emër që mban një vlerë. Shkruan emri = \"Arta\" dhe Python e mban mend.\n\nTipet kryesore janë int për numra të plotë, float për numra me presje, str për tekst dhe bool për True ose False. Funksioni type() të tregon cilin tip ka një vlerë.\n\nUshtrim: krijo dy variabla, viti dhe emri, dhe printo një fjali që i përdor të dyja me print().",
          },
          {
            title: "Kushtet me if",
            kind: "text",
            minutes: 11,
            body:
              "if e ekzekuton një bllok vetëm kur kushti është i vërtetë. Blloku dallohet nga hapësira në fillim të rreshtit, jo nga kllapat.\n\nnota = 8\nif nota >= 6:\n    print(\"Kalove\")\nelse:\n    print(\"Provo sërish\")\n\nelif shton kushte të tjera në mes. Python i kontrollon me radhë dhe ndalet te i pari që është i vërtetë.",
          },
          {
            title: "Kontrolli i njohurive",
            kind: "quiz",
            questions: [
              {
                question: "Cili tip mban vlerën 3.5?",
                options: ["int", "float", "str", "bool"],
                answer: 1,
              },
              {
                question: "Si e dallon Python bllokun e një if?",
                options: ["Me kllapa", "Me pikëpresje", "Me hapësirën në fillim", "Me fjalën end"],
                answer: 2,
              },
            ],
          },
        ],
      },
      {
        title: "Përsëritja dhe funksionet",
        lessons: [
          {
            title: "Ciklet for dhe while",
            kind: "text",
            minutes: 13,
            body:
              "for kalon nëpër elementet e një liste një nga një. for emri in [\"Arta\", \"Drin\"]: print(emri) printon dy emra.\n\nrange(5) jep numrat nga 0 deri 4, dhe përdoret kur të duhet të përsëritësh diçka një numër të caktuar herësh.\n\nwhile vazhdon sa kohë kushti mbetet i vërtetë. Kujdes që diçka brenda ciklit ta ndryshojë kushtin, përndryshe programi nuk ndalet kurrë.",
          },
          {
            title: "Funksionet e tua",
            kind: "text",
            minutes: 12,
            body:
              "Funksioni i jep emër një bloku kodi që do ta përdorësh disa herë.\n\ndef mesatarja(notat):\n    return sum(notat) / len(notat)\n\nreturn e kthen rezultatin te ai që e thirri. Pa return, funksioni kthen None.\n\nUshtrim: shkruaj një funksion që merr një listë notash dhe kthen sa prej tyre janë kaluese.",
          },
          {
            title: "Kontrolli përfundimtar",
            kind: "quiz",
            questions: [
              {
                question: "Çfarë jep range(3)?",
                options: ["1, 2, 3", "0, 1, 2", "0, 1, 2, 3", "3"],
                answer: 1,
              },
              {
                question: "Çfarë kthen një funksion pa return?",
                options: ["0", "Një gabim", "None", "Vlerën e fundit"],
                answer: 2,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Anatomia e sistemit nervor",
    subtitle: "Harta që të duhet para provimit",
    description:
      "Struktura pas strukture, me pyetje vetëkontrolli në fund të çdo pjese. E menduar për studentët e vitit të dytë të mjekësisë.",
    category: "Mjekësi",
    level: "intermediate",
    priceCents: 3900,
    sections: [
      {
        title: "Organizimi i përgjithshëm",
        lessons: [
          {
            title: "Sistemi nervor qendror dhe periferik",
            kind: "text",
            minutes: 10,
            preview: true,
            body:
              "Sistemi nervor qendror përbëhet nga truri dhe palca kurrizore. Gjithçka jashtë tyre, nervat kranialë, nervat spinalë dhe ganglionet, bën pjesë te sistemi periferik.\n\nSistemi periferik ndahet në somatik, që kontrollon muskujt skeletorë, dhe autonom, që rregullon organet e brendshme pa vullnetin tonë.\n\nAutonomi ka dy degë me efekte kryesisht të kundërta: simpatiku përgatit trupin për veprim, parasimpatiku për qetësi dhe tretje.",
          },
          {
            title: "Neuroni dhe sinapsa",
            kind: "text",
            minutes: 12,
            body:
              "Neuroni ka trup qelizor, dendrite që marrin sinjale dhe një akson që i përcjell larg. Mielina rreth aksonit e shpejton përcjelljen, sepse impulsi kërcen nga një nyje e Ranvierit te tjetra.\n\nNë sinapsë sinjali elektrik kthehet në kimik. Neurotransmetuesi lirohet nga fundi i aksonit, lidhet me receptorët e qelizës tjetër dhe hiqet shpejt nga hapësira sinaptike.\n\nAcetilkolina, noradrenalina, dopamina, GABA dhe glutamati janë ata që do t'i hasësh më shpesh në provim.",
          },
          {
            title: "Kontrolli i njohurive",
            kind: "quiz",
            questions: [
              {
                question: "Palca kurrizore bën pjesë te:",
                options: [
                  "Sistemi nervor periferik",
                  "Sistemi nervor qendror",
                  "Sistemi autonom",
                  "Sistemi somatik",
                ],
                answer: 1,
              },
              {
                question: "Çfarë e shpejton përcjelljen përgjatë aksonit?",
                options: ["Dendritet", "Sinapsa", "Mielina", "Trupi qelizor"],
                answer: 2,
              },
            ],
          },
        ],
      },
      {
        title: "Truri",
        lessons: [
          {
            title: "Lobet e korteksit",
            kind: "text",
            minutes: 11,
            body:
              "Lobi frontal merret me planifikimin, vendimet dhe lëvizjen vullnetare. Këtu është edhe zona e Brokës, e lidhur me prodhimin e të folurit.\n\nLobi parietal përpunon ndjesitë e trupit dhe orientimin në hapësirë. Lobi temporal përpunon dëgjimin dhe mban zonën e Vernikes, që lidhet me kuptimin e gjuhës.\n\nLobi oksipital është qendra e shikimit. Një dëmtim këtu mund ta prekë pamjen edhe kur syri është krejt i shëndoshë.",
          },
          {
            title: "Trungu i trurit dhe truri i vogël",
            kind: "text",
            minutes: 9,
            body:
              "Trungu i trurit lidh trurin me palcën kurrizore dhe përbëhet nga mesencefali, ura dhe palca e zgjatur. Këtu rrinë qendrat e frymëmarrjes dhe të rrahjeve të zemrës.\n\nTruri i vogël nuk e nis lëvizjen, por e koordinon. Dëmtimi i tij shfaqet si ecje e pasigurt dhe lëvizje që nuk e godasin saktë shënjestrën.\n\nNga trungu dalin dhjetë nga dymbëdhjetë çiftet e nervave kranialë.",
          },
          {
            title: "Kontrolli përfundimtar",
            kind: "quiz",
            questions: [
              {
                question: "Zona e Brokës ndodhet te lobi:",
                options: ["Frontal", "Parietal", "Temporal", "Oksipital"],
                answer: 0,
              },
              {
                question: "Qendra e frymëmarrjes ndodhet te:",
                options: ["Truri i vogël", "Korteksi", "Palca e zgjatur", "Talamusi"],
                answer: 2,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "E drejta kushtetuese e Kosovës",
    subtitle: "Kushtetuta e lexuar nen pas neni",
    description:
      "Kursi e ndjek tekstin e Kushtetutës dhe e lidh me vendimet e Gjykatës Kushtetuese. I dobishëm edhe për përgatitjen e provimit të jurisprudencës.",
    category: "Drejtësi",
    level: "advanced",
    priceCents: 4500,
    sections: [
      {
        title: "Parimet themelore",
        lessons: [
          {
            title: "Sovraniteti dhe ndarja e pushteteve",
            kind: "text",
            minutes: 12,
            preview: true,
            body:
              "Kushtetuta e përcakton Kosovën si shtet të pavarur, sovran, demokratik, unik dhe të pandashëm. Sovraniteti buron nga populli dhe ushtrohet përmes institucioneve të zgjedhura.\n\nPushteti ndahet në legjislativ, ekzekutiv dhe gjyqësor, me kontroll dhe balancë mes tyre. Asnjë degë nuk mund ta ushtrojë funksionin e tjetrës.\n\nKushtetuta është akti më i lartë juridik. Çdo ligj dhe akt tjetër duhet të jetë në përputhje me të, dhe mospërputhja vlerësohet nga Gjykata Kushtetuese.",
          },
          {
            title: "Të drejtat dhe liritë themelore",
            kind: "text",
            minutes: 14,
            body:
              "Kapitulli II garanton të drejtat themelore, dhe neni 22 i bën marrëveshjet ndërkombëtare për të drejtat e njeriut drejtpërdrejt të zbatueshme, me përparësi ndaj ligjeve.\n\nMes tyre janë Konventa Evropiane për të Drejtat e Njeriut dhe Deklarata Universale. Kjo do të thotë që praktika e Gjykatës Evropiane lexohet si pjesë e interpretimit.\n\nKufizimi i një të drejte lejohet vetëm me ligj, për një qëllim legjitim dhe në masën që është e domosdoshme.",
          },
          {
            title: "Kontrolli i njohurive",
            kind: "quiz",
            questions: [
              {
                question: "Kush e vlerëson përputhshmërinë e një ligji me Kushtetutën?",
                options: ["Kuvendi", "Qeveria", "Gjykata Supreme", "Gjykata Kushtetuese"],
                answer: 3,
              },
              {
                question: "Neni 22 i bën drejtpërdrejt të zbatueshme:",
                options: [
                  "Ligjet e Kuvendit",
                  "Marrëveshjet ndërkombëtare për të drejtat e njeriut",
                  "Vendimet e Qeverisë",
                  "Rregulloret komunale",
                ],
                answer: 1,
              },
            ],
          },
        ],
      },
      {
        title: "Institucionet",
        lessons: [
          {
            title: "Kuvendi",
            kind: "text",
            minutes: 11,
            body:
              "Kuvendi ka 120 deputetë të zgjedhur për katër vjet. Njëzet vende janë të garantuara për komunitetet joshumicë.\n\nAi miraton ligjet, buxhetin dhe zgjedh Qeverinë. Disa ligje me interes vital për komunitetet kërkojnë edhe shumicën e deputetëve të komuniteteve joshumicë.\n\nNdryshimi i Kushtetutës kërkon dy të tretat e të gjithë deputetëve, përfshirë dy të tretat e deputetëve nga vendet e garantuara.",
          },
          {
            title: "Gjykata Kushtetuese",
            kind: "text",
            minutes: 10,
            body:
              "Gjykata përbëhet nga nëntë gjyqtarë me mandat nëntëvjeçar, pa të drejtë rizgjedhjeje.\n\nMund t'i drejtohen institucionet, por edhe individët, pasi të kenë shteruar mjetet e tjera juridike. Kjo ankesë individuale është rruga më e shpeshtë me të cilën çështjet arrijnë te Gjykata.\n\nVendimet e saj janë përfundimtare dhe detyruese për të gjitha institucionet.",
          },
          {
            title: "Kontrolli përfundimtar",
            kind: "quiz",
            questions: [
              {
                question: "Sa deputetë ka Kuvendi?",
                options: ["100", "110", "120", "140"],
                answer: 2,
              },
              {
                question: "Sa vjet zgjat mandati i një gjyqtari kushtetues?",
                options: ["Pesë", "Shtatë", "Nëntë", "Pa afat"],
                answer: 2,
              },
            ],
          },
        ],
      },
    ],
  },
];
