// Tekstet ligjore rrinë këtu, jo te katalogët e UI-së. Janë dokumente, jo etiketa,
// dhe ndryshojnë nga dikush që nuk duhet të prekë JSON-in e përkthimeve.

export type LegalSection = { heading: string; body: string[]; list?: string[] };

export type LegalDocument = {
  title: string;
  description: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
};

type Locale = "sq" | "en";

export const TERMS: Record<Locale, LegalDocument> = {
  sq: {
    title: "Kushtet e përdorimit",
    description: "Rregullat e sjelljes, të drejtat mbi përmbajtjen dhe kufijtë e platformës.",
    updatedAt: "16 shtator 2026",
    intro: "I mbajtëm të shkurtra. Nëse diçka nuk kuptohet, na shkruaj dhe e sqarojmë.",
    sections: [
      {
        heading: "Kush mund të hyjë",
        body: [
          "Platforma është për studentë dhe të diplomuar të institucioneve të arsimit të lartë në Kosovë, 16 vjeç e lart.",
          "Verifikimi me email institucional, ID studentore dhe selfie të jep shenjën «I verifikuar». Pa të mund ta përdorësh platformën, por disa gjëra mbeten të mbyllura.",
        ],
      },
      {
        heading: "Si sillemi",
        body: ["Një rregull: ndihmo, mos poshtëro. Pjesa tjetër del prej tij."],
        list: [
          "Pa ngacmim dhe pa sulme personale, as me emër, as me aluzion.",
          "Pa gjuhë urrejtjeje mbi baza etnike, fetare, gjinore, orientimi ose aftësie.",
          "Pa përmbajtje seksuale dhe pa kërcënime.",
          "Pa të dhëna personale të të tjerëve: numra, adresa, dokumente, foto private.",
          "Pa spam, pa reklama të fshehura, pa llogari të shumëfishta.",
        ],
      },
      {
        heading: "Zëri i kampusit",
        body: [
          "Postimet këtu dalin publikisht pa emër, por llogaria prapa tyre është e verifikuar dhe e njohur për moderatorët.",
          "Duhet llogari më e vjetër se shtatë ditë dhe email institucional i verifikuar.",
        ],
        list: [
          "Asnjë emër studenti ose stafi.",
          "Asnjë foto njerëzish.",
          "Tri raportime e fshehin postimin derisa ta shohë një moderator.",
        ],
      },
      {
        heading: "Dhomat e zërit",
        body: [
          "Dhomat nuk regjistrohen. Nëse kjo ndryshon ndonjëherë, do ta shohësh qartë brenda dhomës para se të flasësh.",
          "Pritësi përgjigjet për dhomën e vet. Fjalëkalimi i një dhome nuk e kapërcen rrethin e qasjes: një dhomë fakulteti mbetet për fakultetin.",
        ],
      },
      {
        heading: "Materialet dhe të drejtat e autorit",
        body: [
          "Materiali që ngarkon mbetet i yti. Duke e ngarkuar, na lejon ta shfaqim te studentët e tjerë brenda platformës.",
        ],
        list: [
          "Nuk lejohen libra të plotë me të drejta autoriale.",
          "Materialet e profesorëve publikohen vetëm me lejen e tyre.",
          "Kërkesat për heqje shqyrtohen brenda 48 orësh.",
          "Materialet nën dy yje me mbi pesë vlerësime fshihen vetë.",
        ],
      },
      {
        heading: "Asistenti",
        body: [
          "Asistenti përgjigjet vetëm nga materialet ku ke qasje dhe i citon burimet. Çdo përgjigje e tij shënohet si e gjeneruar. Nuk e shkruan detyrën për ty.",
          "Përmbajtja jote nuk përdoret për të trajnuar modele.",
        ],
      },
      {
        heading: "Moderimi",
        body: [
          "Raportimi bëhet me një klikim dhe synojmë të reagojmë brenda 24 orësh.",
          "Masat shkojnë shkallë-shkallë: fshehje, heqje, kufizim, dhe në rastet e rënda mbyllje e llogarisë. Shifrat e agreguara publikohen çdo javë.",
        ],
      },
      {
        heading: "Pikët dhe PRO",
        body: [
          "Pikët XP nuk kanë vlerë monetare dhe nuk shkëmbehen mes llogarive. Mund të këmbehen vetëm me ditë PRO për vete.",
          "Kontributi nuk mbyllet kurrë pas pagesës: ngarkimi, pyetjet, përgjigjet dhe mesazhet janë falas.",
        ],
      },
      {
        heading: "Ndryshimet",
        body: [
          "Nëse ndryshojmë diçka që prek të drejtat e tua, të njoftojmë brenda platformës të paktën 14 ditë përpara.",
          "Mund ta eksportosh gjithçka dhe ta fshish llogarinë kur të duash.",
        ],
      },
    ],
  },
  en: {
    title: "Terms of use",
    description: "How we behave here, who owns what, and where the platform draws its lines.",
    updatedAt: "16 September 2026",
    intro: "We kept these short on purpose. If something is unclear, write to us.",
    sections: [
      {
        heading: "Who can join",
        body: [
          "The platform is for students and graduates of higher education institutions in Kosovo, aged 16 and over.",
          "Verifying with your institutional email, student ID and a selfie gives you the «Verified» mark. You can use the platform without it, but some things stay locked.",
        ],
      },
      {
        heading: "How we behave",
        body: ["One rule: help, don't humiliate. Everything else follows from it."],
        list: [
          "No harassment or personal attacks, by name or by hint.",
          "No hate speech based on ethnicity, religion, gender, orientation or ability.",
          "No sexual content and no threats.",
          "No one else's personal data: numbers, addresses, documents, private photos.",
          "No spam, no hidden advertising, no multiple accounts.",
        ],
      },
      {
        heading: "Campus voice",
        body: [
          "Posts here appear publicly without a name, but the account behind them is verified and known to moderators.",
          "You need an account older than seven days and a verified institutional email.",
        ],
        list: [
          "No names of students or staff.",
          "No photos of people.",
          "Three reports hide a post until a moderator looks at it.",
        ],
      },
      {
        heading: "Voice rooms",
        body: [
          "Rooms are not recorded. If that ever changes, you will see it clearly inside the room before you speak.",
          "The host is responsible for their room. A room password does not get around access circles: a faculty room stays within its faculty.",
        ],
      },
      {
        heading: "Materials and copyright",
        body: [
          "What you upload stays yours. By uploading it, you let us show it to other students on the platform.",
        ],
        list: [
          "No complete copyrighted books.",
          "Professors' materials are published only with their permission.",
          "Takedown requests are reviewed within 48 hours.",
          "Materials under two stars with more than five ratings are hidden automatically.",
        ],
      },
      {
        heading: "The assistant",
        body: [
          "The assistant only answers from materials you have access to and cites its sources. Every answer is marked as generated. It will not write your assignment for you.",
          "Your content is not used to train models.",
        ],
      },
      {
        heading: "Moderation",
        body: [
          "Reporting takes one click and we aim to respond within 24 hours.",
          "Measures escalate step by step: hiding, removal, restriction, and in serious cases closing the account. Aggregate figures are published weekly.",
        ],
      },
      {
        heading: "Points and PRO",
        body: [
          "XP has no monetary value and cannot be transferred between accounts. It can only be exchanged for PRO days for yourself.",
          "Contributing is never behind a paywall: uploading, asking, answering and messaging are free.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "If we change something that affects your rights, we tell you inside the platform at least 14 days ahead.",
          "You can export everything and delete your account whenever you like.",
        ],
      },
    ],
  },
};

export const PRIVACY: Record<Locale, LegalDocument> = {
  sq: {
    title: "Politika e privatësisë",
    description: "Si i mbledhim, i përdorim dhe i mbrojmë të dhënat e tua, sipas Ligjit Nr. 06/L-082.",
    updatedAt: "16 shtator 2026",
    intro: "Mbledhim vetëm atë që na duhet që platforma të punojë. Këtu është e gjitha.",
    sections: [
      {
        heading: "Kush jemi dhe cili ligj vlen",
        body: [
          "Përpunimi i të dhënave bie nën Ligjin Nr. 06/L-082 për Mbrojtjen e të Dhënave Personale, i harmonizuar me GDPR-në.",
          "Për çdo kërkesë rreth të dhënave të tua na shkruaj. Përgjigjemi brenda 30 ditësh.",
        ],
      },
      {
        heading: "Çfarë mbledhim",
        body: [],
        list: [
          "Llogaria: emri, emaili, emri i përdoruesit, fjalëkalimi si hash.",
          "Akademike: universiteti, fakulteti, viti dhe lëndët.",
          "Profili që e plotëson vetë: bio, interesat, fotoja dhe kopertina.",
          "Çfarë krijon: postime, komente, foto, video, materiale, pyetje, mesazhe.",
          "Prania: kur ke qenë aktiv për herë të fundit. Mund ta fshehësh nga cilësimet.",
          "Teknike: adresa IP gjatë regjistrimit, vetëm kundër abuzimit.",
        ],
      },
      {
        heading: "Verifikimi i identitetit",
        body: [
          "Foto e ID-së dhe selfie ruhen private dhe të enkriptuara. Nuk dalin kurrë përmes asnjë API-je dhe nuk i sheh asnjë student.",
          "Pasi verifikimi përfundon, imazhet fshihen. Mbetet vetëm fakti që je i verifikuar.",
        ],
      },
      {
        heading: "Baza ligjore",
        body: [],
        list: [
          "Kontrata: llogaria, materialet dhe funksionet bazë.",
          "Interesi legjitim: siguria, parandalimi i spamit dhe moderimi.",
          "Pëlqimi: njoftimet push dhe analitika. Të dyja janë të fikura derisa t'i ndezësh.",
          "Detyrimi ligjor: kur e kërkon një autoritet kompetent.",
        ],
      },
      {
        heading: "Zëri i kampusit",
        body: [
          "Postimet dalin me pseudonim. Identiteti prapa tyre nuk i zbulohet asnjë përdoruesi dhe e shohin vetëm moderatorët, vetëm kur postimi raportohet për ngacmim, kërcënim ose shkelje ligjore.",
        ],
      },
      {
        heading: "Kujt ia japim",
        body: ["Nuk i shesim të dhënat e tua dhe nuk ua japim reklamuesve. Reklamuesit shohin vetëm shifra të agreguara."],
        list: [
          "Ofruesit teknikë që na duhen, si strehimi, me kontratë përpunimi.",
          "Autoritetet, vetëm me kërkesë ligjore të vlefshme.",
        ],
      },
      {
        heading: "Sa gjatë",
        body: [
          "Sa kohë llogaria është aktive. Kur e fshin, të dhënat hiqen menjëherë dhe jo më vonë se 30 ditë.",
          "Mesazhet e dhomave të zërit fshihen bashkë me dhomën. Zëri nuk regjistrohet.",
        ],
      },
      {
        heading: "Të drejtat e tua",
        body: ["Shumicën i ushtron vetë nga cilësimet."],
        list: [
          "Eksporto gjithçka që mbajmë për ty, si JSON.",
          "Ndrysho çdo fushë të profilit.",
          "Fshije llogarinë me gjithë përmbajtjen.",
          "Fik njoftimet, analitikën dhe statusin online pa e humbur qasjen.",
          "Ankohu te Agjencia për Informim dhe Privatësi.",
        ],
      },
      {
        heading: "Siguria dhe cookies",
        body: [
          "Fjalëkalimet ruhen me bcrypt. Skedarët e ngarkuar nuk janë publikë dhe merren vetëm pas hyrjes.",
          "Një cookie sesioni të mban të kyçur dhe nuk kërkon pëlqim. Cookies analitike janë të fikura derisa t'i ndezësh.",
          "Nëse ndodh një shkelje që rrezikon të dhënat e tua, njoftojmë autoritetin brenda 72 orësh dhe ty pa vonesë.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy policy",
    description: "How we collect, use and protect your data, under Law No. 06/L-082.",
    updatedAt: "16 September 2026",
    intro: "We only collect what the platform needs to work. This is all of it.",
    sections: [
      {
        heading: "Who we are and which law applies",
        body: [
          "Processing falls under Law No. 06/L-082 on Personal Data Protection, which is aligned with the GDPR.",
          "Write to us with any request about your data. We reply within 30 days.",
        ],
      },
      {
        heading: "What we collect",
        body: [],
        list: [
          "Account: name, email, username, password as a hash.",
          "Academic: university, faculty, year and courses.",
          "The profile you fill in yourself: bio, interests, photo and cover.",
          "What you create: posts, comments, photos, videos, materials, questions, messages.",
          "Presence: when you were last active. You can hide it in settings.",
          "Technical: IP address at sign-up, used only against abuse.",
        ],
      },
      {
        heading: "Identity verification",
        body: [
          "Your ID photo and selfie are stored privately and encrypted. They are never exposed through any API and no student can see them.",
          "Once verification is done, the images are deleted. Only the fact that you are verified remains.",
        ],
      },
      {
        heading: "Legal basis",
        body: [],
        list: [
          "Contract: your account, materials and core features.",
          "Legitimate interest: security, spam prevention and moderation.",
          "Consent: push notifications and analytics. Both stay off until you turn them on.",
          "Legal obligation: when a competent authority requires it.",
        ],
      },
      {
        heading: "Campus voice",
        body: [
          "Posts appear under a pseudonym. The identity behind them is never shown to other users and is visible only to moderators, only when a post is reported for harassment, threats or a legal violation.",
        ],
      },
      {
        heading: "Who we share with",
        body: ["We don't sell your data and we don't hand it to advertisers. Advertisers only see aggregate numbers."],
        list: [
          "Technical providers we depend on, such as hosting, under a processing agreement.",
          "Authorities, only with a valid legal request.",
        ],
      },
      {
        heading: "How long",
        body: [
          "For as long as your account is active. When you delete it, your data is removed right away and within 30 days at the latest.",
          "Voice room chat is deleted with the room. Audio is not recorded.",
        ],
      },
      {
        heading: "Your rights",
        body: ["You can use most of them yourself from settings."],
        list: [
          "Export everything we hold about you as JSON.",
          "Change any profile field.",
          "Delete your account and everything attached to it.",
          "Turn off notifications, analytics and online status without losing access.",
          "Complain to the Information and Privacy Agency.",
        ],
      },
      {
        heading: "Security and cookies",
        body: [
          "Passwords are stored with bcrypt. Uploaded files are not public and can only be fetched after signing in.",
          "One session cookie keeps you signed in and needs no consent. Analytics cookies stay off until you turn them on.",
          "If a breach puts your data at risk, we notify the authority within 72 hours and you without delay.",
        ],
      },
    ],
  },
};
