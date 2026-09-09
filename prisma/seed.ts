/**
 * Seed realist. Platforma duhet të duket e gjallë që në ekranin e parë, prandaj
 * këtu s'ka asnjë "Lorem ipsum" dhe asnjë emër i huaj: universitete, fakultete,
 * lëndë, profesorë, qytete dhe tekste studentore nga Kosova.
 *
 * Gjeneruesi i rastësisë është deterministik, kështu që `db seed` jep gjithmonë
 * të njëjtën bazë dhe pamjet mund të krahasohen mes ekzekutimeve.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// --- rastësi deterministike ------------------------------------------------

let seedState = 20250909;
function random() {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}
function pickMany<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return out;
}
function chance(probability: number) {
  return random() < probability;
}
function intBetween(min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}
function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3600 * 1000);
}
function daysFromNow(days: number, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

// --- fjalorë ---------------------------------------------------------------

const MALE_NAMES = [
  "Arian", "Blerim", "Endrit", "Drilon", "Lirim", "Fisnik", "Granit", "Valon",
  "Egzon", "Leotrim", "Rron", "Diar", "Altin", "Kushtrim", "Bardh", "Agon",
  "Donat", "Erblin", "Genc", "Behar", "Labinot", "Ardit", "Shpend", "Trim",
];

const FEMALE_NAMES = [
  "Erza", "Dea", "Rina", "Vlora", "Arta", "Besa", "Elira", "Doruntina",
  "Adelina", "Blerta", "Ardita", "Njomza", "Kaltrina", "Learta", "Donjeta",
  "Diellza", "Fjolla", "Hana", "Lirie", "Teuta", "Egzona", "Venera", "Qëndresa",
];

const SURNAMES = [
  "Gashi", "Krasniqi", "Berisha", "Hoxha", "Morina", "Bytyqi", "Zeqiri",
  "Rexhepi", "Shala", "Kelmendi", "Aliu", "Ahmeti", "Sylejmani", "Bajrami",
  "Halimi", "Musliu", "Rrahmani", "Kabashi", "Selimi", "Ibrahimi", "Osmani",
  "Maliqi", "Jashari", "Veseli", "Latifi", "Haziri", "Sadiku", "Nikçi",
  "Dobruna", "Statovci",
];

const CITIES = [
  "Prishtinë", "Prizren", "Pejë", "Gjakovë", "Gjilan", "Mitrovicë", "Ferizaj",
  "Vushtrri", "Podujevë", "Suharekë", "Rahovec", "Lipjan", "Skenderaj",
  "Drenas", "Kaçanik", "Istog", "Klinë", "Viti", "Malishevë", "Deçan",
];

const HIGH_SCHOOLS = [
  "Gjimnazi 'Sami Frashëri', Prishtinë",
  "Gjimnazi 'Xhevdet Doda', Prishtinë",
  "Gjimnazi 'Gjon Buzuku', Prizren",
  "Gjimnazi 'Bedri Pejani', Pejë",
  "Gjimnazi 'Hajdar Dushi', Gjakovë",
  "Gjimnazi 'Zenel Hajdini', Gjilan",
  "Gjimnazi 'Frang Bardhi', Mitrovicë",
  "Gjimnazi 'Kuvendi i Lezhës', Ferizaj",
  "Shkolla e Mesme Teknike 'Gjin Gazulli', Prishtinë",
  "Gjimnazi 'Eqrem Çabej', Vushtrri",
];

const INTERESTS = [
  "programim", "dizajn", "muzikë", "sport", "sipërmarrësi", "vullnetarizëm",
  "gjuhë", "fotografi", "gaming", "letërsi", "aktivizëm",
];

const BIO_TEMPLATES = [
  "{fakulteti}, {viti}. Ndihmoj me {fort}, kërkoj ndihmë me {dobet}.",
  "{viti} në {fakulteti}. I mbaj shënimet rregullt, i ndaj pa problem.",
  "Nga {qyteti}, tash në Prishtinë. {fakulteti}, {viti}.",
  "{fakulteti}. Nëse ke pyetje për {fort}, shkruaj pa ngurrim.",
  "{viti}, {fakulteti}. Punoj gjysmë orari, mësoj natën.",
  "Më gjen në bibliotekë para afateve. {fakulteti}, {viti}.",
  "{fakulteti}, {viti}. Bëj skema për çdo lëndë, i ngarkoj këtu.",
  "Dua ta mbaroj {viti} pa mbetur asnjë provim. {fakulteti}.",
];

const STRONG_SUBJECTS = [
  "statistikë", "matematikë", "anatomi", "programim", "kontabilitet",
  "e drejta civile", "kimi", "letërsi", "mikroekonomi", "fizikë",
];

const WEAK_SUBJECTS = [
  "gjermanisht", "ekonometri", "biokimi", "algjebër", "histologji",
  "e drejta romake", "algoritme", "gjuhësi", "makroekonomi", "anglisht juridik",
];

// --- struktura akademike ---------------------------------------------------

const UNIVERSITIES = [
  {
    name: 'Universiteti i Prishtinës "Hasan Prishtina"',
    abbr: "UP",
    city: "Prishtinë",
    emailDomain: "student.uni-pr.edu",
  },
  { name: "UBT — Kolegji për Biznes dhe Teknologji", abbr: "UBT", city: "Prishtinë", emailDomain: "ubt-uni.net" },
  { name: "Kolegji AAB", abbr: "AAB", city: "Prishtinë", emailDomain: "aab-edu.net" },
];

type CourseSeed = {
  name: string;
  code: string;
  year: number;
  semester: number;
  ects: number;
  professor: string;
};

type DepartmentSeed = { name: string; courses: CourseSeed[] };

type FacultySeed = {
  name: string;
  color: string;
  icon: string;
  departments: DepartmentSeed[];
};

const FACULTIES: FacultySeed[] = [
  {
    name: "Fakulteti Ekonomik",
    color: "economics",
    icon: "trending-up",
    departments: [
      {
        name: "Banka, Financa dhe Kontabilitet",
        courses: [
          { name: "Mikroekonomi", code: "EKO101", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Ilir Berisha" },
          { name: "Matematikë për ekonomistë", code: "EKO102", year: 1, semester: 1, ects: 5, professor: "Prof. Ass. Vjosa Kelmendi" },
          { name: "Bazat e kontabilitetit", code: "EKO103", year: 1, semester: 2, ects: 6, professor: "Prof. Dr. Naim Hoxha" },
          { name: "Makroekonomi", code: "EKO201", year: 2, semester: 1, ects: 6, professor: "Prof. Dr. Ilir Berisha" },
          { name: "Statistikë", code: "EKO202", year: 2, semester: 1, ects: 5, professor: "Prof. Dr. Fatmir Krasniqi" },
          { name: "Kontabilitet financiar", code: "EKO203", year: 2, semester: 2, ects: 6, professor: "Prof. Dr. Naim Hoxha" },
          { name: "Ekonometri", code: "EKO301", year: 3, semester: 1, ects: 6, professor: "Prof. Dr. Fatmir Krasniqi" },
          { name: "Financa publike", code: "EKO302", year: 3, semester: 2, ects: 5, professor: "Prof. Ass. Blerta Sadiku" },
        ],
      },
      {
        name: "Menaxhment dhe Informatikë",
        courses: [
          { name: "Bazat e menaxhmentit", code: "MEN101", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Shpend Ahmeti" },
          { name: "Marketing", code: "MEN201", year: 2, semester: 1, ects: 6, professor: "Prof. Ass. Donjeta Maliqi" },
          { name: "Menaxhimi i burimeve njerëzore", code: "MEN202", year: 2, semester: 2, ects: 5, professor: "Prof. Ass. Donjeta Maliqi" },
          { name: "Sistemet informative të biznesit", code: "MEN301", year: 3, semester: 1, ects: 6, professor: "Prof. Dr. Agron Rexhepi" },
        ],
      },
    ],
  },
  {
    name: "Fakulteti i Mjekësisë",
    color: "medicine",
    icon: "stethoscope",
    departments: [
      {
        name: "Mjekësi e përgjithshme",
        courses: [
          { name: "Anatomi e njeriut I", code: "MJK101", year: 1, semester: 1, ects: 9, professor: "Prof. Dr. Ramadan Zeqiri" },
          { name: "Histologji dhe embriologji", code: "MJK102", year: 1, semester: 2, ects: 7, professor: "Prof. Dr. Lindita Shala" },
          { name: "Fiziologji", code: "MJK201", year: 2, semester: 1, ects: 9, professor: "Prof. Dr. Besim Aliu" },
          { name: "Biokimi mjekësore", code: "MJK202", year: 2, semester: 1, ects: 7, professor: "Prof. Dr. Lindita Shala" },
          { name: "Patologji", code: "MJK301", year: 3, semester: 1, ects: 8, professor: "Prof. Dr. Ramadan Zeqiri" },
          { name: "Farmakologji", code: "MJK302", year: 3, semester: 2, ects: 7, professor: "Prof. Dr. Besim Aliu" },
        ],
      },
      {
        name: "Stomatologji",
        courses: [
          { name: "Morfologji dentare", code: "STO101", year: 1, semester: 1, ects: 7, professor: "Prof. Dr. Teuta Bajrami" },
          { name: "Materialet dentare", code: "STO201", year: 2, semester: 1, ects: 6, professor: "Prof. Ass. Granit Nikçi" },
        ],
      },
    ],
  },
  {
    name: "Fakulteti Juridik",
    color: "law",
    icon: "scale",
    departments: [
      {
        name: "Drejtimi i përgjithshëm",
        courses: [
          { name: "Hyrje në të drejtën", code: "JUR101", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Rexhep Osmani" },
          { name: "E drejta romake", code: "JUR102", year: 1, semester: 2, ects: 5, professor: "Prof. Ass. Ardita Latifi" },
          { name: "E drejta civile", code: "JUR201", year: 2, semester: 1, ects: 7, professor: "Prof. Dr. Rexhep Osmani" },
          { name: "E drejta penale", code: "JUR202", year: 2, semester: 2, ects: 7, professor: "Prof. Dr. Valon Haziri" },
          { name: "E drejta administrative", code: "JUR301", year: 3, semester: 1, ects: 6, professor: "Prof. Ass. Ardita Latifi" },
          { name: "E drejta ndërkombëtare publike", code: "JUR302", year: 3, semester: 2, ects: 6, professor: "Prof. Dr. Valon Haziri" },
        ],
      },
    ],
  },
  {
    name: "Fakulteti i Shkencave Matematike-Natyrore",
    color: "science",
    icon: "flask-conical",
    departments: [
      {
        name: "Shkenca Kompjuterike",
        courses: [
          { name: "Hyrje në programim", code: "INF101", year: 1, semester: 1, ects: 7, professor: "Prof. Dr. Agron Rexhepi" },
          { name: "Algjebra lineare", code: "INF102", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Vesa Ibrahimi" },
          { name: "Programim i orientuar në objekte", code: "INF201", year: 2, semester: 1, ects: 7, professor: "Prof. Dr. Agron Rexhepi" },
          { name: "Bazat e të dhënave", code: "INF202", year: 2, semester: 2, ects: 6, professor: "Prof. Ass. Leotrim Kabashi" },
          { name: "Algoritme dhe struktura të dhënash", code: "INF203", year: 2, semester: 1, ects: 7, professor: "Prof. Ass. Leotrim Kabashi" },
          { name: "Rrjeta kompjuterike", code: "INF301", year: 3, semester: 1, ects: 6, professor: "Prof. Dr. Kushtrim Selimi" },
          { name: "Inxhinieri softuerike", code: "INF302", year: 3, semester: 2, ects: 6, professor: "Prof. Dr. Kushtrim Selimi" },
        ],
      },
      {
        name: "Kimi",
        courses: [
          { name: "Kimi e përgjithshme", code: "KIM101", year: 1, semester: 1, ects: 7, professor: "Prof. Dr. Vesa Ibrahimi" },
          { name: "Kimi organike", code: "KIM201", year: 2, semester: 1, ects: 7, professor: "Prof. Ass. Blerim Musliu" },
        ],
      },
      {
        name: "Fizikë",
        courses: [
          { name: "Fizikë e përgjithshme I", code: "FIZ101", year: 1, semester: 1, ects: 7, professor: "Prof. Dr. Genc Jashari" },
          { name: "Mekanikë teorike", code: "FIZ201", year: 2, semester: 1, ects: 6, professor: "Prof. Dr. Genc Jashari" },
        ],
      },
    ],
  },
  {
    name: "Fakulteti i Filologjisë",
    color: "philology",
    icon: "book-open",
    departments: [
      {
        name: "Gjuhë dhe Letërsi Shqipe",
        courses: [
          { name: "Letërsi shqipe I", code: "FIL101", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Njomza Dobruna" },
          { name: "Gjuhësi e përgjithshme", code: "FIL102", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Bardh Statovci" },
          { name: "Fonetikë dhe fonologji", code: "FIL201", year: 2, semester: 1, ects: 5, professor: "Prof. Dr. Bardh Statovci" },
          { name: "Letërsi e Rilindjes Kombëtare", code: "FIL202", year: 2, semester: 2, ects: 6, professor: "Prof. Dr. Njomza Dobruna" },
        ],
      },
      {
        name: "Gjuhë Angleze",
        courses: [
          { name: "Morfologji e gjuhës angleze", code: "ANG101", year: 1, semester: 1, ects: 6, professor: "Prof. Ass. Fjolla Veseli" },
          { name: "Përkthim dhe interpretim", code: "ANG301", year: 3, semester: 1, ects: 6, professor: "Prof. Ass. Fjolla Veseli" },
        ],
      },
    ],
  },
  {
    name: "Fakulteti i Arteve",
    color: "arts",
    icon: "palette",
    departments: [
      {
        name: "Arte Figurative",
        courses: [
          { name: "Vizatim I", code: "ART101", year: 1, semester: 1, ects: 8, professor: "Prof. Dr. Diellza Halimi" },
          { name: "Histori e artit", code: "ART102", year: 1, semester: 2, ects: 5, professor: "Prof. Dr. Ylli Sylejmani" },
          { name: "Pikturë II", code: "ART201", year: 2, semester: 1, ects: 8, professor: "Prof. Dr. Diellza Halimi" },
        ],
      },
      {
        name: "Muzikë",
        courses: [
          { name: "Solfezh", code: "MUZ101", year: 1, semester: 1, ects: 6, professor: "Prof. Ass. Erblin Dobruna" },
          { name: "Harmoni", code: "MUZ201", year: 2, semester: 1, ects: 6, professor: "Prof. Ass. Erblin Dobruna" },
        ],
      },
    ],
  },
];

const BADGES = [
  { code: "verified", name: "I verifikuar", description: "Email institucional i konfirmuar.", icon: "badge-check" },
  { code: "founder", name: "Themelues", description: "Nga 500 përdoruesit e parë të platformës.", icon: "flag" },
  { code: "pioneer", name: "Pionier i fakultetit", description: "Përdoruesi i parë nga një fakultet i ri.", icon: "compass" },
  { code: "first_material", name: "I pari me material", description: "Ngarkove materialin e parë për një lëndë.", icon: "upload" },
  { code: "archivist", name: "Arkivist", description: "25 materiale të miratuara.", icon: "library" },
  { code: "savior", name: "Shpëtimtar", description: "10 përgjigje të pranuara.", icon: "life-buoy" },
  { code: "course_leader", name: "Lider i lëndës", description: "Kontributi më i vlerësuar në një lëndë këtë semestër.", icon: "crown" },
  { code: "ambassador", name: "Ambasador", description: "10 ftesa të suksesshme.", icon: "users" },
  { code: "night_owl", name: "Zog nate", description: "20 kontribute pas mesnate.", icon: "moon" },
  { code: "streak_30", name: "Tridhjetë ditë rresht", description: "Një muaj i tërë pa e humbur ditën.", icon: "flame" },
  { code: "helper", name: "Ndihmës", description: "50 përgjigje të dobishme.", icon: "hand-heart" },
  { code: "organizer", name: "Organizator", description: "5 evente të mbajtura me sukses.", icon: "calendar-check" },
];

const COMPANIES = [
  { name: "Frakton", description: "Kompani softuerike në Prishtinë, punon me klientë ndërkombëtarë.", website: "https://frakton.com", city: "Prishtinë", isVerified: true },
  { name: "Gjirafa", description: "Teknologji, media dhe tregti elektronike për tregun shqipfolës.", website: "https://gjirafa.com", city: "Prishtinë", isVerified: true },
  { name: "Banka Ekonomike", description: "Bankë komerciale me rrjet degësh në tërë Kosovën.", website: "https://bekonomike.com", city: "Prishtinë", isVerified: true },
  { name: "Kutia", description: "Studio produkti dhe inxhinierie softuerike.", website: "https://kutia.net", city: "Prishtinë", isVerified: true },
  { name: "Spitali Amerikan", description: "Institucion privat shëndetësor me qendër në Prishtinë.", website: null, city: "Prishtinë", isVerified: false },
  { name: "Oda Ekonomike e Kosovës", description: "Organizatë që lidh bizneset vendore me tregun.", website: null, city: "Prishtinë", isVerified: false },
  { name: "IPKO", description: "Operator telekomunikacioni me shërbime mobile dhe internet.", website: "https://ipko.com", city: "Prishtinë", isVerified: true },
  { name: "Instituti GAP", description: "Institut kërkimor për politika publike.", website: null, city: "Prishtinë", isVerified: false },
];

// --- tekste postimesh ------------------------------------------------------

const TEXT_POSTS = [
  "A e keni vërejtur që salla 4 s'ka ngrohje fare këtë javë? Merrni xhaketa, ligjërata zgjat dy orë.",
  "Sot e mbarova provimin e fundit të semestrit. Për ata që e kanë nesër, mos e lini leximin e fundit për në mëngjes.",
  "Biblioteka e re është hapur deri në 22:00 gjatë afatit. E konfirmova vetë mbrëmë.",
  "Kush ka libra të vjetër që s'i përdor më, sillini të hënën te holli. Po i mbledhim për vitin e parë.",
  "Ligjërata e së premtes u shty për javën tjetër. E ka thënë asistenti në fund të orës, jo në email.",
  "Nëse ju del gabim me regjistrimin e provimit në SEMS, provoni nga shfletuesi tjetër. Mua m'u zgjidh ashtu.",
  "Falë atij që i ngarkoi shënimet e ligjëratës së tetë. Munda ta kap atë pjesë që s'e kuptova në sallë.",
  "Sot pashë se kantina ka ndryshuar çmimet. Kafja 50 cent, sanduiçi një euro e njëzet.",
  "Po kërkoj dikë që e ka bërë praktikën në ndonjë bankë. Dua të di si funksionon aplikimi.",
  "Këshillë për vitin e parë: mos i lini detyrat e para pa dorëzuar, ato mbahen mend deri në fund.",
  "Për ata që udhëtojnë nga Ferizaji, autobusi i orës 7:10 arrin para ligjëratës së parë pa problem.",
  "E gjeta një kanal me video shpjeguese për derivate. Nëse ju duhet, shkruani në koment e ju dërgoj.",
  "Kush po e mbron temën këtë afat? Po mbledh disa këshilla nga ata që e kanë kaluar.",
  "Sot ishte ligjërata më e mirë e semestrit. Profesori solli një rast real dhe u kuptua gjithçka.",
  "A ka dikush orarin e ri të konsultimeve? I vjetri ende është në tabelë.",
  "E mbarova skemën e tërë lëndës në një faqe. Nesër e ngarkoj që ta keni edhe ju.",
  "Paralajmërim: afati për regjistrimin e semestrit mbaron të premten, jo të hënën si vitin e kaluar.",
  "Kush do të shkojë bashkë në panairin e punës? Është më lehtë kur nuk shkon vetëm.",
  "Provimi ishte më i lehtë se testet e vitit të kaluar, por pyetja e fundit kërkonte të lexuarit e kapitullit të tetë.",
  "Sot mora përgjigjen për praktikën verore. Nëse dikush ka pyetje për procesin, jam këtu.",
  "Salla e kompjuterëve tash punon deri në 20:00. E kërkuam një vit të tërë.",
  "Ai që e kërkonte librin e statistikës, e gjeta një kopje në bibliotekë. Shkruaj privatisht.",
  "Grupi i lëndës është shumë më i qetë se ai i WhatsApp-it. Këtu të paktën gjen çka kërkon.",
  "Nesër ka protestë studentore për transportin. Nisja në 11:00 te sheshi.",
  "E kalova provimin e tretë herën e parë. Nëse dikush ka nevojë për shënimet, i kam të skanuara.",
];

const QUESTION_TITLES = [
  "Si zgjidhet detyra 4 nga ushtrimet e kapitullit të tretë?",
  "A hyn kapitulli i fundit në provimin e afatit të qershorit?",
  "Cili është ndryshimi praktik mes dy metodave që i mësuam sot?",
  "Ku mund ta gjej literaturën shtesë që e përmendi profesori?",
  "Sa pikë duhen për të kaluar në pjesën praktike?",
  "A ka dikush shënime nga ligjërata e gjashtë?",
  "Si llogaritet elasticiteti kur funksioni s'është linear?",
  "A pranohet dorëzimi i detyrës me email pas afatit?",
  "Çfarë duhet të dijë njeriu para kolokviumit të parë?",
  "Si e organizoni leximin kur ka tre provime në një javë?",
];

const QUESTION_BODIES = [
  "E kam provuar dy herë por më del rezultat tjetër nga ai i fletës. Nuk e di ku po gabohem, ndoshta te hapi i dytë.",
  "Në ligjëratë u tha diçka tjetër nga ajo që shkruan në skriptë. Dua ta di cila vlen për provimin.",
  "Kam kërkuar në bibliotekë por s'e gjeta. Nëse dikush e ka në PDF, do të ndihmonte shumë.",
  "Po përgatitem vetëm dhe s'kam me kë ta kontrolloj. Çdo sqarim i shkurtër më ndihmon.",
  "Është hera e parë që e jap këtë provim dhe nuk e di sa thellë duhet shkuar në teori.",
];

const ANSWER_TEXTS = [
  "Gabimi është te hapi ku e zëvendëson vlerën. Duhet ta derivosh para se ta futësh numrin, jo pas.",
  "Po, hyn i tërë. Vitin e kaluar erdhi një pyetje pikërisht nga aty, e mbaj mend sepse më mori shumë kohë.",
  "Në praktikë ndryshimi është vetëm te supozimi fillestar. Nëse të japin të dhëna të plota, të dyja japin rezultat të njëjtë.",
  "E ke te biblioteka, rafti i tretë majtas kur hyn. Ka tri kopje, njëra jepet për në shtëpi.",
  "Duhen 51 pikë nga 100, por pjesa praktike duhet kaluar veç. Nëse e lë atë, s'të ndihmon teoria.",
  "I kam shënimet e asaj ligjërate, i ngarkova te materialet e lëndës mbrëmë.",
  "Kur funksioni s'është linear, e llogarit në një pikë të caktuar me derivat. Formula është në kapitullin e dytë, faqja 34.",
  "Profesori e pranon deri në 48 orë vonesë, por bie një pikë. Më mirë dorëzoje edhe të papërfunduar.",
  "Lexo shënimet e ligjëratave 1 deri 5 dhe bëj ushtrimet e fletës së parë. Kolokviumi vjen prej andej.",
  "Une i ndaj ditët sipas provimit, jo sipas orëve. Një ditë të plotë për një lëndë punon më mirë se tri lëndë në një ditë.",
];

const MATERIAL_TITLES: Record<string, string[]> = {
  script: ["Skripta {lenda} {vit}, {prof}", "Skripta e plotë {lenda} {vit}"],
  notes: ["Shënime nga ligjëratat, {lenda} {vit}", "Shënimet e mia {lenda}, semestri {sem}"],
  past_exam: ["Provimi i qershorit {vit} me zgjidhje", "Provimi i shtatorit {vit}, {lenda}", "Kolokviumi i parë {vit} me përgjigje"],
  solved: ["Detyra të zgjidhura, kapitujt 1-5", "Ushtrime të zgjidhura para afatit, {lenda}"],
  slides: ["Prezantimet e ligjëratave, {lenda} {vit}", "Sllajdet e {prof}, {lenda}"],
  lecture: ["Ligjërata 1-8, {lenda} {vit}", "Ligjërata e plotë {lenda}, semestri {sem}"],
  book: ["Kapituj të lejuar nga literatura bazë, {lenda}", "Përmbledhje literature, {lenda}"],
  video: ["Regjistrim ligjërate, {lenda} {vit}", "Video shpjeguese për ushtrimet, {lenda}"],
};

const MATERIAL_DESCRIPTIONS = [
  "I skanova nga fletorja ime, janë të lexueshme. Nëse gjeni gabim, shkruani në koment e i rregulloj.",
  "Përfshin edhe skemat që i bëra vetë për kapitujt më të vështirë.",
  "Kjo është versioni i rregulluar. Versionin e parë e kisha ngarkuar me dy faqe të munguara.",
  "Nga ligjëratat e këtij semestri, të plota deri te java e dhjetë.",
  "Me zgjidhje hap pas hapi, jo vetëm rezultate përfundimtare.",
  "E mora nga një kolegu i vitit të kaluar dhe e plotësova me shënimet e mia.",
];

const EVENT_SEEDS = [
  { title: "Studio bashkë: Statistikë para afatit", kind: "study_together", location: "Biblioteka e Fakultetit Ekonomik, salla 2", description: "Po e mbyllim kapitullin e regresionit. Sillni fletët e ushtrimeve dhe një laptop nëse keni." },
  { title: "Studio bashkë: Anatomi, sistemi nervor", kind: "study_together", location: "Salla e leximit, Fakulteti i Mjekësisë", description: "E kalojmë tërë sistemin nervor qendror me atlas. Fillojmë në kohë." },
  { title: "Panairi i punës dhe praktikave 2026", kind: "fair", location: "Amfiteatri i madh, UP", description: "Mbi tridhjetë kompani vendore me pozita për studentë. Sillni CV-në e shtypur." },
  { title: "Workshop: Si të shkruash CV që lexohet", kind: "workshop", location: "Salla 12, Fakulteti Ekonomik", description: "Një orë e gjysmë, praktike. Dilni me një CV të gatshme, jo me shënime." },
  { title: "Hackathon i Shkencave Kompjuterike", kind: "contest", location: "Inovacioni Qendra, Prishtinë", description: "Dyzet e tetë orë, ekipe deri në katër veta. Tema shpallet në fillim." },
  { title: "Mbrëmja e gjeneratës së Juridikut", kind: "party", location: "Klubi i studentëve, Prishtinë", description: "Pas afatit të janarit. Bileta merret te përfaqësuesit e vitit." },
  { title: "Ligjëratë e hapur: E drejta e punës në praktikë", kind: "lecture", location: "Amfiteatri A, Fakulteti Juridik", description: "Me një avokat që punon me raste reale. Pyetjet në fund, gjysmë ore." },
  { title: "Gara e debatit ndëruniversitar", kind: "contest", location: "Salla e Kuvendit, Kolegji AAB", description: "Katër universitete, dy raunde. Regjistrimi mbyllet një javë para." },
  { title: "Workshop fotografie për fillestarë", kind: "workshop", location: "Fakulteti i Arteve, atelieja 3", description: "Sillni çka keni, edhe telefonin. Puna bëhet jashtë nëse s'bie shi." },
  { title: "Studio bashkë: Programim i orientuar në objekte", kind: "study_together", location: "Salla e kompjuterëve, FSHMN", description: "Kalojmë detyrat e vjetra të provimit. Ejani me kodin e nisur." },
  { title: "Takim informues për shkëmbimet Erasmus+", kind: "workshop", location: "Rektorati, salla e senatit", description: "Afatet, dokumentet dhe gabimet që i bëjnë shumica në aplikim." },
  { title: "Turneu i futsallit mes fakulteteve", kind: "contest", location: "Palestra e UP-së", description: "Ekipe prej gjashtë vetash. Regjistrimi te përfaqësuesit e fakultetit." },
  { title: "Studio bashkë: Biokimi, metabolizmi", kind: "study_together", location: "Biblioteka Kombëtare, kati i dytë", description: "Fokusi te ciklet metabolike. Sjellim skemat e printuara." },
  { title: "Koncert i studentëve të Muzikës", kind: "party", location: "Salla e koncerteve, Fakulteti i Arteve", description: "Hyrja e lirë. Program prej një ore e gjysmë." },
  { title: "Workshop: Hyrje në analizën e të dhënave", kind: "workshop", location: "UBT, kampusi Lipjan", description: "Praktik, me të dhëna reale. Duhet laptop me tabelë të instaluar." },
];

const JOB_SEEDS = [
  { title: "Praktikant në zhvillim softueri", type: "internship", field: "Teknologji", city: "Prishtinë", remote: false, description: "Tre muaj, me mentor. Punë me projekte reale, jo vetëm vëzhgim. Njohuri bazë në një gjuhë programimi mjaftojnë." },
  { title: "Praktikë në departamentin e financave", type: "internship", field: "Financa", city: "Prishtinë", remote: false, description: "Për studentë të vitit të tretë ose master. Punë me raporte mujore dhe barazime." },
  { title: "Asistent marketingu, gjysmë orari", type: "part_time", field: "Marketing", city: "Prishtinë", remote: false, description: "Njëzet orë në javë, orar i përshtatshëm me ligjëratat. Përvojë me rrjete sociale është plus." },
  { title: "Bursë studimi për vitin akademik", type: "scholarship", field: "Të gjitha fushat", city: "Prishtinë", remote: false, description: "Mbulon tarifën e studimeve dhe një shumë mujore. Kërkohet mesatare mbi tetë." },
  { title: "Zhvillues frontend junior", type: "full_time", field: "Teknologji", city: "Prishtinë", remote: true, description: "Për ata që e mbarojnë studimet këtë vit. Punë hibride, dy ditë në zyrë." },
  { title: "Praktikë në laborator klinik", type: "internship", field: "Shëndetësi", city: "Prishtinë", remote: false, description: "Për studentë të Mjekësisë, viti tre e lart. Përfshin punë me pajisje reale nën mbikëqyrje." },
  { title: "Asistent juridik", type: "part_time", field: "Drejtësi", city: "Prizren", remote: false, description: "Përgatitje dokumentesh dhe kërkim praktike gjyqësore. Njohja e procedurës civile është e nevojshme." },
  { title: "Konkurs për esé: Ekonomia e gjelbër", type: "contest", field: "Ekonomi", city: "Prishtinë", remote: true, description: "Tre çmime. Esé deri në tre mijë fjalë, në shqip ose anglisht." },
  { title: "Shkëmbim semestral në Slloveni", type: "exchange", field: "Të gjitha fushat", city: "Jashtë vendit", remote: false, description: "Një semestër me kredi që njihen. Kërkohet certifikatë e gjuhës angleze." },
  { title: "Hackathon i shëndetësisë digjitale", type: "hackathon", field: "Teknologji", city: "Prishtinë", remote: false, description: "Dyzet e tetë orë. Ekipet ndërdisiplinore kanë përparësi." },
  { title: "Praktikant në analizë të dhënash", type: "internship", field: "Teknologji", city: "Prishtinë", remote: true, description: "Punë me tabela dhe raporte javore. Njohuri bazë statistike janë të mjaftueshme." },
  { title: "Redaktor përmbajtjeje, gjysmë orari", type: "part_time", field: "Media", city: "Prishtinë", remote: true, description: "Për studentë të Filologjisë. Shkrim dhe redaktim në shqip, dy tekste në ditë." },
  { title: "Asistent kërkimor", type: "part_time", field: "Kërkim", city: "Prishtinë", remote: false, description: "Mbledhje dhe kodim të dhënash për një studim politikash publike. Gjashtë muaj." },
  { title: "Praktikë në degën bankare", type: "internship", field: "Financa", city: "Gjilan", remote: false, description: "Punë me klientë dhe procese të përditshme bankare. Mundësi punësimi pas praktikës." },
  { title: "Dizajner grafik junior", type: "full_time", field: "Dizajn", city: "Prishtinë", remote: false, description: "Portofol i kërkuar. Punë me identitete vizuale dhe materiale për shtyp." },
];

const CAMPUS_VOICE_POSTS = [
  "A jam vetëm unë që s'e kuptoj asgjë nga ligjërata e së martës, apo është kështu për të gjithë?",
  "Kam frikë ta pyes profesorin sepse mendoj që pyetja ime është e trashë. Po e pyes këtu.",
  "Tualetet e katit të dytë s'janë pastruar prej javësh. Dikush duhet ta thotë këtë.",
  "Erdha nga një qytet i vogël dhe ende s'kam gjetur asnjë shok këtu. A është normale pas dy muajsh?",
  "Po mendoj ta ndërroj drejtimin pas vitit të parë. A e ka bërë dikush këtë dhe s'i ka ardhur keq?",
  "Ashensori s'punon prej shtatorit dhe ka kolegë që s'mund t'i ngjiten shkallëve.",
  "Sa keq është të mos e dish çka do të bësh pas fakultetit? Sepse unë s'e di fare.",
  "Biblioteka mbyllet shumë herët gjatë afatit. Kush vendos për këto orare?",
];

const SEEK_POSTS = [
  "Kërkoj bashkëstudent për projektin e bazave të të dhënave. Kam nisur skemën, më duhet dikush për pjesën e ndërfaqes.",
  "Ofroj repeticione për matematikë të vitit të parë. Pesë euro ora, në bibliotekë ose online.",
  "Kërkoj banesë me bashkëqiramarrës afër kampusit. Jam i qetë, studioj shumë, s'bëj zhurmë.",
  "Ofroj ndihmë falas me statistikë për ata të vitit të parë. E kam kaluar me nëntë dhe dua ta kthej.",
  "Kërkoj dikë që merr të njëjtin autobus nga Podujeva, që ta ndajmë rrugën.",
  "Ofroj përkthim shqip-anglisht për punime seminarike. Kam përvojë dyvjeçare.",
];

const POLL_SEEDS = [
  { text: "Kur duhet ta mbajmë sesionin e përsëritjes para provimit?", options: ["Të mërkurën në 16:00", "Të enjten në 18:00", "Të shtunën paradite"] },
  { text: "Cila metodë ju ndihmon më shumë për provime?", options: ["Ushtrime të vjetra", "Shënime të përmbledhura", "Studim në grup", "Video shpjeguese"] },
  { text: "A duhet ta kërkojmë zgjatjen e orarit të bibliotekës gjatë afatit?", options: ["Po, deri në 22:00", "Po, deri në mesnatë", "Jo, mjafton kështu"] },
  { text: "Ku po e bëni praktikën verore këtë vit?", options: ["Kompani private", "Institucion publik", "Ende s'kam vendosur"] },
];

const COMMENTS = [
  "Faleminderit, m'u desh pikërisht kjo.",
  "E provova dhe funksionoi. Po e shënoj për afatin.",
  "A mund ta shpjegosh edhe hapin e dytë? Aty më humb.",
  "Edhe unë e kisha të njëjtin problem javën e kaluar.",
  "E kam ngarkuar një version më të plotë te materialet e lëndës.",
  "Kjo duhet të ishte thënë në ligjëratë, jo këtu.",
  "Po vij edhe unë. Sa veta jemi deri tash?",
  "Nuk pajtohem plotësisht, por e kuptoj pikën tënde.",
  "Shumë e dobishme, e ruajta.",
  "A e ke edhe për semestrin e dytë?",
  "Kjo ma shpëtoi javën, sinqerisht.",
  "E dërgova te grupi i gjeneratës.",
];

// --- seed ------------------------------------------------------------------

async function clear() {
  // Rendi ka rëndësi vetëm te tabelat pa cascade.
  await db.pushSubscription.deleteMany();
  await db.moderationLog.deleteMany();
  await db.report.deleteMany();
  await db.notification.deleteMany();
  await db.userBadge.deleteMany();
  await db.badge.deleteMany();
  await db.jobPost.deleteMany();
  await db.company.deleteMany();
  await db.rsvp.deleteMany();
  await db.message.deleteMany();
  await db.conversationMember.deleteMany();
  await db.conversation.deleteMany();
  await db.groupMember.deleteMany();
  await db.answerVote.deleteMany();
  await db.answer.deleteMany();
  await db.question.deleteMany();
  await db.materialRating.deleteMany();
  await db.pollVote.deleteMany();
  await db.pollOption.deleteMany();
  await db.reaction.deleteMany();
  await db.bookmark.deleteMany();
  await db.comment.deleteMany();
  await db.post.deleteMany();
  await db.material.deleteMany();
  await db.event.deleteMany();
  await db.group.deleteMany();
  await db.invite.deleteMany();
  await db.userBlock.deleteMany();
  await db.follow.deleteMany();
  await db.enrollment.deleteMany();
  await db.examDate.deleteMany();
  await db.scheduleSlot.deleteMany();
  await db.course.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.verificationToken.deleteMany();
  await db.user.deleteMany();
  await db.department.deleteMany();
  await db.faculty.deleteMany();
  await db.university.deleteMany();
}

async function main() {
  console.log("Po pastrohet baza...");
  await clear();

  // 1. Institucionet ---------------------------------------------------------
  console.log("Universitetet dhe fakultetet...");
  const universities = [];
  for (const uni of UNIVERSITIES) {
    universities.push(await db.university.create({ data: uni }));
  }
  const up = universities[0];

  type SeededFaculty = { id: string; universityId: string; name: string; color: string; icon: string };
  type SeededDepartment = { id: string; facultyId: string; name: string; facultyColor: string };
  type SeededCourse = {
    id: string;
    departmentId: string;
    name: string;
    code: string;
    year: number;
    semester: number;
    ects: number;
    professor: string;
    facultyId: string;
    facultyColor: string;
  };

  const faculties: SeededFaculty[] = [];
  const departments: SeededDepartment[] = [];
  const courses: SeededCourse[] = [];

  for (const facultySeed of FACULTIES) {
    const faculty = await db.faculty.create({
      data: {
        universityId: up.id,
        name: facultySeed.name,
        color: facultySeed.color,
        icon: facultySeed.icon,
      },
    });
    faculties.push(faculty);

    for (const departmentSeed of facultySeed.departments) {
      const department = await db.department.create({
        data: { facultyId: faculty.id, name: departmentSeed.name },
      });
      departments.push({ ...department, facultyColor: faculty.color });

      for (const courseSeed of departmentSeed.courses) {
        const course = await db.course.create({
          data: { departmentId: department.id, ...courseSeed },
        });
        courses.push({ ...course, facultyId: faculty.id, facultyColor: faculty.color });

        // Orari: dy terminë në javë për çdo lëndë.
        const firstDay = intBetween(1, 4);
        const secondDay = ((firstDay + 2 - 1) % 5) + 1;
        const startHour = intBetween(8, 16);
        await db.scheduleSlot.createMany({
          data: [
            {
              courseId: course.id,
              dayOfWeek: firstDay,
              startTime: `${String(startHour).padStart(2, "0")}:00`,
              endTime: `${String(startHour + 2).padStart(2, "0")}:00`,
              room: `Salla ${intBetween(1, 14)}`,
              kind: "lecture",
            },
            {
              courseId: course.id,
              dayOfWeek: secondDay,
              startTime: `${String(startHour + 1).padStart(2, "0")}:00`,
              endTime: `${String(startHour + 2).padStart(2, "0")}:00`,
              room: `Salla ${intBetween(1, 14)}`,
              kind: "exercise",
            },
          ],
        });

        await db.examDate.create({
          data: {
            courseId: course.id,
            term: pick(["Afati i janarit", "Afati i qershorit", "Afati i shtatorit"]),
            date: daysFromNow(intBetween(5, 60), intBetween(9, 14)),
            room: `Amfiteatri ${pick(["A", "B", "C"])}`,
          },
        });
      }
    }
  }

  // Fakultetet e dy kolegjeve, që kërkimi të mos jetë vetëm UP.
  for (const uni of universities.slice(1)) {
    for (const [name, color, icon] of [
      ["Fakulteti i Shkencave Kompjuterike", "science", "cpu"],
      ["Fakulteti i Menaxhmentit", "economics", "briefcase"],
    ] as const) {
      const faculty = await db.faculty.create({
        data: { universityId: uni.id, name, color, icon },
      });
      faculties.push(faculty);
      const department = await db.department.create({
        data: { facultyId: faculty.id, name: "Programi i përgjithshëm" },
      });
      departments.push({ ...department, facultyColor: color });
    }
  }

  console.log(`  ${faculties.length} fakultete, ${courses.length} lëndë`);

  // 2. Badge-t ---------------------------------------------------------------
  const badges = [];
  for (const badge of BADGES) {
    badges.push(await db.badge.create({ data: badge }));
  }
  const badgeByCode = Object.fromEntries(badges.map((badge) => [badge.code, badge]));

  // 3. Përdoruesit -----------------------------------------------------------
  console.log("Përdoruesit...");
  const passwordHash = await bcrypt.hash("provoje123", 10);
  const usedUsernames = new Set<string>();

  const upDepartments = departments.filter((department) =>
    faculties.slice(0, 6).some((faculty) => faculty.id === department.facultyId),
  );

  type SeededUser = {
    id: string;
    name: string;
    username: string;
    facultyId: string | null;
    departmentId: string | null;
    year: number | null;
    city: string | null;
    highSchool: string | null;
    interests: string[];
    isVerified: boolean;
  };

  const users: SeededUser[] = [];

  // Katër personat e dizajnit hyjnë me emër dhe rol të caktuar.
  const anchors = [
    { name: "Arian Gashi", facultyIndex: 0, year: 1, city: "Gjilan", strong: "matematikë", weak: "kontabilitet" },
    { name: "Erza Bytyqi", facultyIndex: 1, year: 3, city: "Prishtinë", strong: "anatomi", weak: "biokimi" },
    { name: "Blerim Krasniqi", facultyIndex: 3, year: 2, city: "Prishtinë", strong: "programim", weak: "algjebër" },
    { name: "Dea Morina", facultyIndex: 5, year: 2, city: "Pejë", strong: "vizatim", weak: "histori e artit" },
  ];

  for (let index = 0; index < 60; index += 1) {
    const anchor = anchors[index];
    const isFemale = anchor ? ["Erza Bytyqi", "Dea Morina"].includes(anchor.name) : chance(0.5);
    const firstName = anchor ? anchor.name.split(" ")[0] : pick(isFemale ? FEMALE_NAMES : MALE_NAMES);
    const lastName = anchor ? anchor.name.split(" ")[1] : pick(SURNAMES);
    const name = `${firstName} ${lastName}`;

    let username = `${firstName}.${lastName}`
      .toLowerCase()
      .replace(/ë/g, "e")
      .replace(/ç/g, "c")
      .replace(/[^a-z.]/g, "");
    let suffix = 1;
    while (usedUsernames.has(username)) {
      suffix += 1;
      username = `${username.replace(/\d+$/, "")}${suffix}`;
    }
    usedUsernames.add(username);

    const faculty = anchor ? faculties[anchor.facultyIndex] : pick(faculties.slice(0, 6));
    const facultyDepartments = upDepartments.filter(
      (department) => department.facultyId === faculty.id,
    );
    const department = facultyDepartments.length > 0 ? pick(facultyDepartments) : pick(upDepartments);
    const year = anchor ? anchor.year : intBetween(1, 4);
    const level = year <= 4 ? (chance(0.85) ? "bachelor" : "master") : "master";
    const city = anchor ? anchor.city : pick(CITIES);
    const isVerified = anchor ? index !== 0 : chance(0.65);
    const interests = pickMany(INTERESTS, intBetween(2, 5));

    const bio = pick(BIO_TEMPLATES)
      .replace("{fakulteti}", faculty.name.replace("Fakulteti i ", "").replace("Fakulteti ", ""))
      .replace("{viti}", `viti ${["I", "II", "III", "IV"][year - 1]}`)
      .replace("{qyteti}", city)
      .replace("{fort}", anchor ? anchor.strong : pick(STRONG_SUBJECTS))
      .replace("{dobet}", anchor ? anchor.weak : pick(WEAK_SUBJECTS));

    const user = await db.user.create({
      data: {
        email: isVerified
          ? `${username}@student.uni-pr.edu`
          : `${username}@gmail.com`,
        passwordHash,
        username,
        name,
        bio,
        universityId: up.id,
        facultyId: faculty.id,
        departmentId: department.id,
        year,
        level,
        city,
        highSchool: chance(0.7) ? pick(HIGH_SCHOOLS) : null,
        isVerified,
        emailVerified: isVerified ? hoursAgo(intBetween(24, 2000)) : null,
        onboardedAt: hoursAgo(intBetween(24, 3000)),
        xp: intBetween(20, 2400),
        dailyStreak: chance(0.6) ? intBetween(1, 42) : 0,
        lastStreakAt: hoursAgo(intBetween(1, 40)),
        role: index === 1 ? "moderator" : "student",
        interests: JSON.stringify(interests),
        createdAt: hoursAgo(intBetween(24, 4000)),
        lastSeenAt: hoursAgo(intBetween(0, 400)),
      },
    });

    users.push({
      id: user.id,
      name: user.name,
      username: user.username,
      facultyId: user.facultyId,
      departmentId: user.departmentId,
      year: user.year,
      city: user.city,
      highSchool: user.highSchool,
      interests,
      isVerified: user.isVerified,
    });

    await db.invite.create({
      data: {
        inviterId: user.id,
        code: `${username.split(".")[0].slice(0, 4)}${intBetween(1000, 9999)}`.toUpperCase(),
      },
    });
  }

  // Llogari demo, që të hyhet menjëherë pa u regjistruar.
  const demoUser = await db.user.create({
    data: {
      email: "demo@student.uni-pr.edu",
      passwordHash,
      username: "demo",
      name: "Studenti Demo",
      bio: "Llogari demonstruese. Ekonomiku, viti II. Ndihmoj me statistikë, kërkoj ndihmë me gjermanisht.",
      universityId: up.id,
      facultyId: faculties[0].id,
      departmentId: upDepartments.find((d) => d.facultyId === faculties[0].id)!.id,
      year: 2,
      level: "bachelor",
      city: "Prishtinë",
      highSchool: HIGH_SCHOOLS[0],
      isVerified: true,
      emailVerified: hoursAgo(100),
      onboardedAt: hoursAgo(100),
      xp: 640,
      dailyStreak: 6,
      lastStreakAt: hoursAgo(3),
      interests: JSON.stringify(["programim", "letërsi", "sipërmarrësi"]),
      createdAt: hoursAgo(720),
    },
  });
  users.push({
    id: demoUser.id,
    name: demoUser.name,
    username: demoUser.username,
    facultyId: demoUser.facultyId,
    departmentId: demoUser.departmentId,
    year: demoUser.year,
    city: demoUser.city,
    highSchool: demoUser.highSchool,
    interests: ["programim", "letërsi", "sipërmarrësi"],
    isVerified: true,
  });
  await db.invite.create({ data: { inviterId: demoUser.id, code: "DEMO2026" } });

  console.log(`  ${users.length} përdorues`);

  // 4. Regjistrimet në lëndë -------------------------------------------------
  console.log("Regjistrimet dhe grupet...");
  const academicYear = "2025/26";
  const enrollmentsByUser = new Map<string, string[]>();

  for (const user of users) {
    const facultyCourses = courses.filter(
      (course) => course.facultyId === user.facultyId && course.year === user.year,
    );
    const fallback = courses.filter((course) => course.facultyId === user.facultyId);
    const pool = facultyCourses.length >= 3 ? facultyCourses : fallback;
    const chosen = pickMany(pool, Math.min(pool.length, intBetween(4, 6)));
    enrollmentsByUser.set(user.id, chosen.map((course) => course.id));

    for (const course of chosen) {
      await db.enrollment.create({
        data: { userId: user.id, courseId: course.id, academicYear },
      });
    }
  }

  // 5. Grupet: një kanal për çdo lëndë dhe një për çdo gjeneratë --------------
  const courseGroups = new Map<string, string>();
  for (const course of courses) {
    const group = await db.group.create({
      data: {
        name: course.name,
        type: "course",
        courseId: course.id,
        privacy: "public",
        description: `Kanali i lëndës ${course.name}. Materialet, pyetjet dhe provimet e kaluara janë këtu.`,
        facultyKey: course.facultyColor,
      },
    });
    courseGroups.set(course.id, group.id);
  }

  const generationGroups = new Map<string, string>();
  for (const faculty of faculties.slice(0, 6)) {
    for (let year = 1; year <= 4; year += 1) {
      const group = await db.group.create({
        data: {
          name: `${faculty.name.replace("Fakulteti i ", "").replace("Fakulteti ", "")}, viti ${["I", "II", "III", "IV"][year - 1]}`,
          type: "generation",
          privacy: "public",
          description: "Gjenerata jote. Njoftimet, afatet dhe pyetjet e përditshme.",
          facultyKey: faculty.color,
        },
      });
      generationGroups.set(`${faculty.id}-${year}`, group.id);
    }
  }

  const customGroups = [
    { name: "Programues të rinj të Kosovës", description: "Ndajmë burime, detyra dhe pyetje për programim.", privacy: "public", facultyKey: "science" },
    { name: "Debat dhe oratori", description: "Përgatitje për garat e debatit ndëruniversitar.", privacy: "request", facultyKey: "law" },
    { name: "Fotografia e kampusit", description: "Fotografitë e eventeve dhe të jetës studentore.", privacy: "public", facultyKey: "arts" },
    { name: "Përgatitje për Erasmus+", description: "Afatet, dokumentet dhe përvojat e atyre që kanë shkuar.", privacy: "public", facultyKey: "philology" },
  ];
  const customGroupIds: string[] = [];
  for (const group of customGroups) {
    const created = await db.group.create({ data: { ...group, type: "custom" } });
    customGroupIds.push(created.id);
  }

  for (const user of users) {
    const courseIds = enrollmentsByUser.get(user.id) ?? [];
    for (const courseId of courseIds) {
      const groupId = courseGroups.get(courseId);
      if (groupId) {
        await db.groupMember.create({ data: { groupId, userId: user.id } });
      }
    }
    const generationGroupId = generationGroups.get(`${user.facultyId}-${user.year}`);
    if (generationGroupId) {
      await db.groupMember.create({ data: { groupId: generationGroupId, userId: user.id } });
    }
    for (const groupId of customGroupIds) {
      if (chance(0.22)) {
        await db.groupMember.create({ data: { groupId, userId: user.id } });
      }
    }
  }

  // 6. Grafi social ----------------------------------------------------------
  console.log("Grafi social...");
  const followPairs = new Set<string>();
  for (const user of users) {
    const sameGeneration = users.filter(
      (other) =>
        other.id !== user.id &&
        other.facultyId === user.facultyId &&
        other.year === user.year,
    );
    const sameFaculty = users.filter(
      (other) => other.id !== user.id && other.facultyId === user.facultyId,
    );
    const anyone = users.filter((other) => other.id !== user.id);

    const targets = [
      ...pickMany(sameGeneration, Math.min(sameGeneration.length, intBetween(4, 8))),
      ...pickMany(sameFaculty, Math.min(sameFaculty.length, intBetween(2, 5))),
      ...pickMany(anyone, intBetween(1, 4)),
    ];

    for (const target of targets) {
      const key = `${user.id}:${target.id}`;
      if (followPairs.has(key)) continue;
      followPairs.add(key);
      await db.follow.create({
        data: { followerId: user.id, followingId: target.id, createdAt: hoursAgo(intBetween(1, 3000)) },
      });
    }
  }

  // Reciprociteti: ku të dyja drejtimet ekzistojnë, shënohet si shoqëri.
  for (const key of followPairs) {
    const [a, b] = key.split(":");
    if (followPairs.has(`${b}:${a}`)) {
      await db.follow.updateMany({
        where: { followerId: a, followingId: b },
        data: { isMutual: true },
      });
    }
  }

  const mutualCount = await db.follow.count({ where: { isMutual: true } });
  console.log(`  ${followPairs.size} ndjekje, ${mutualCount} të ndërsjella`);

  // 7. Materialet ------------------------------------------------------------
  console.log("Materialet...");
  const materials = [];
  const materialTypes = ["script", "notes", "past_exam", "solved", "slides", "lecture", "book", "video"];

  for (let index = 0; index < 80; index += 1) {
    const course = pick(courses);
    const eligible = users.filter((user) => user.facultyId === course.facultyId);
    const uploader = eligible.length > 0 ? pick(eligible) : pick(users);
    const type = pick(materialTypes);
    const year = pick(["2023", "2024", "2025"]);
    const title = pick(MATERIAL_TITLES[type])
      .replace("{lenda}", course.name)
      .replace("{vit}", year)
      .replace("{prof}", course.professor.replace("Prof. Dr. ", "Prof. ").replace("Prof. Ass. ", "Prof. "))
      .replace("{sem}", String(course.semester));

    const ratingCount = intBetween(0, 24);
    const rating = ratingCount === 0 ? 0 : Math.round((3.2 + random() * 1.8) * 10) / 10;
    const status = ratingCount >= 3 && rating >= 3.5 ? "verified" : "pending";

    const material = await db.material.create({
      data: {
        uploaderId: uploader.id,
        courseId: course.id,
        title,
        type,
        fileUrl: `/materialet/${course.code.toLowerCase()}-${index}.pdf`,
        mimeType: type === "video" ? "video/mp4" : "application/pdf",
        size: intBetween(240, 24000) * 1024,
        pages: type === "video" ? null : intBetween(6, 180),
        professor: course.professor,
        academicYear: `${year}/${Number(year) + 1 - 2000}`,
        description: pick(MATERIAL_DESCRIPTIONS),
        rating,
        ratingCount,
        downloads: intBetween(4, 640),
        verificationStatus: status,
        createdAt: hoursAgo(intBetween(2, 4000)),
      },
    });
    materials.push({ ...material, facultyId: course.facultyId });

    const raters = pickMany(
      users.filter((user) => user.id !== uploader.id),
      Math.min(ratingCount, 12),
    );
    for (const rater of raters) {
      await db.materialRating.create({
        data: {
          materialId: material.id,
          userId: rater.id,
          value: rating >= 4 ? intBetween(4, 5) : intBetween(3, 5),
        },
      });
    }
  }

  // 8. Pyetjet dhe përgjigjet ------------------------------------------------
  console.log("Pyetjet dhe përgjigjet...");
  const questions = [];
  for (let index = 0; index < 40; index += 1) {
    const course = pick(courses);
    const eligible = users.filter((user) => user.facultyId === course.facultyId);
    const author = eligible.length > 0 ? pick(eligible) : pick(users);

    const question = await db.question.create({
      data: {
        authorId: author.id,
        courseId: course.id,
        title: pick(QUESTION_TITLES),
        text: pick(QUESTION_BODIES),
        views: intBetween(6, 420),
        createdAt: hoursAgo(intBetween(1, 2000)),
      },
    });

    const answerCount = index % 2 === 0 ? intBetween(1, 4) : intBetween(0, 2);
    const answerers = pickMany(
      users.filter((user) => user.id !== author.id),
      answerCount,
    );
    const answerIds: string[] = [];
    for (const answerer of answerers) {
      const answer = await db.answer.create({
        data: {
          questionId: question.id,
          authorId: answerer.id,
          text: pick(ANSWER_TEXTS),
          votes: intBetween(0, 28),
          createdAt: hoursAgo(intBetween(1, 1800)),
        },
      });
      answerIds.push(answer.id);
    }

    // Gjysma e pyetjeve kanë përgjigje të pranuar.
    if (index % 2 === 0 && answerIds.length > 0) {
      await db.question.update({
        where: { id: question.id },
        data: { acceptedAnswerId: answerIds[0] },
      });
    }
    questions.push(question);
  }

  // 9. Eventet ---------------------------------------------------------------
  console.log("Eventet...");
  const events = [];
  for (let index = 0; index < 25; index += 1) {
    const seed = EVENT_SEEDS[index % EVENT_SEEDS.length];
    const creator = pick(users);
    const faculty = faculties.find((item) => item.id === creator.facultyId) ?? faculties[0];
    const inPast = index >= 20;
    const date = inPast ? hoursAgo(intBetween(48, 700)) : daysFromNow(intBetween(0, 45), intBetween(9, 20));

    const event = await db.event.create({
      data: {
        creatorId: creator.id,
        title: index < EVENT_SEEDS.length ? seed.title : `${seed.title} — edicioni ${Math.floor(index / EVENT_SEEDS.length) + 1}`,
        description: seed.description,
        date,
        location: seed.location,
        facultyId: faculty.id,
        kind: seed.kind,
        createdAt: hoursAgo(intBetween(24, 900)),
      },
    });
    events.push(event);

    const attendees = pickMany(users, intBetween(4, 26));
    for (const attendee of attendees) {
      await db.rsvp.create({
        data: {
          eventId: event.id,
          userId: attendee.id,
          status: chance(0.78) ? "going" : "maybe",
        },
      });
    }
  }

  // 10. Kompanitë dhe punët --------------------------------------------------
  console.log("Punët dhe praktikat...");
  const companies = [];
  for (const company of COMPANIES) {
    companies.push(await db.company.create({ data: company }));
  }
  for (const job of JOB_SEEDS) {
    await db.jobPost.create({
      data: {
        companyId: pick(companies).id,
        title: job.title,
        type: job.type,
        field: job.field,
        city: job.city,
        isRemote: job.remote,
        description: job.description,
        deadline: daysFromNow(intBetween(3, 70), 23),
        link: chance(0.6) ? "https://konkurse.example/aplikimi" : null,
        createdAt: hoursAgo(intBetween(2, 700)),
      },
    });
  }

  // 11. Postimet -------------------------------------------------------------
  console.log("Postimet...");
  let pollIndex = 0;
  for (let index = 0; index < 200; index += 1) {
    const author = pick(users);
    const authorCourses = enrollmentsByUser.get(author.id) ?? [];
    const course = authorCourses.length > 0 ? courses.find((item) => item.id === pick(authorCourses)) : undefined;

    const roll = random();
    let type: string;
    if (roll < 0.4) type = "text";
    else if (roll < 0.55) type = "question";
    else if (roll < 0.7) type = "material";
    else if (roll < 0.78) type = "poll";
    else if (roll < 0.87) type = "event";
    else if (roll < 0.94) type = "seek";
    else type = "campus_voice";

    let text = pick(TEXT_POSTS);
    let materialId: string | null = null;
    let eventId: string | null = null;
    const isAnonymous = type === "campus_voice";

    if (type === "question") {
      text = `${pick(QUESTION_TITLES)} ${pick(QUESTION_BODIES)}`;
    } else if (type === "material") {
      const facultyMaterials = materials.filter((item) => item.facultyId === author.facultyId);
      const material = facultyMaterials.length > 0 ? pick(facultyMaterials) : pick(materials);
      materialId = material.id;
      text = `E ngarkova: ${material.title}. ${pick(MATERIAL_DESCRIPTIONS)}`;
    } else if (type === "event") {
      const event = pick(events);
      eventId = event.id;
      text = `${event.title} — ${event.location}. Kush vjen?`;
    } else if (type === "seek") {
      text = pick(SEEK_POSTS);
    } else if (type === "campus_voice") {
      text = pick(CAMPUS_VOICE_POSTS);
    } else if (type === "poll") {
      text = POLL_SEEDS[pollIndex % POLL_SEEDS.length].text;
    }

    const createdAt = hoursAgo(Math.floor(random() ** 2 * 720) + 1);

    const post = await db.post.create({
      data: {
        authorId: author.id,
        type,
        text,
        courseId: type === "material" || type === "question" ? course?.id ?? null : chance(0.35) ? course?.id ?? null : null,
        facultyId: author.facultyId,
        materialId,
        eventId,
        isAnonymous,
        pseudonym: isAnonymous ? `Studenti #${intBetween(1, 99)}` : null,
        createdAt,
      },
    });

    if (type === "poll") {
      const seed = POLL_SEEDS[pollIndex % POLL_SEEDS.length];
      pollIndex += 1;
      const options = [];
      for (let optionIndex = 0; optionIndex < seed.options.length; optionIndex += 1) {
        options.push(
          await db.pollOption.create({
            data: { postId: post.id, text: seed.options[optionIndex], order: optionIndex },
          }),
        );
      }
      const voters = pickMany(users, intBetween(6, 40));
      for (const voter of voters) {
        await db.pollVote.create({
          data: { postId: post.id, optionId: pick(options).id, userId: voter.id },
        });
      }
    }

    const reactors = pickMany(
      users.filter((user) => user.id !== author.id),
      intBetween(0, 34),
    );
    for (const reactor of reactors) {
      await db.reaction.create({
        data: {
          userId: reactor.id,
          postId: post.id,
          type: pick(["like", "like", "like", "helpful", "celebrate"]),
          createdAt: hoursAgo(intBetween(1, 400)),
        },
      });
    }

    const commenters = pickMany(
      users.filter((user) => user.id !== author.id),
      intBetween(0, 6),
    );
    for (const commenter of commenters) {
      await db.comment.create({
        data: {
          postId: post.id,
          authorId: commenter.id,
          text: pick(COMMENTS),
          createdAt: hoursAgo(intBetween(1, 300)),
        },
      });
    }

    await db.post.update({
      where: { id: post.id },
      data: {
        likeCount: reactors.length,
        commentCount: commenters.length,
        saveCount: intBetween(0, 18),
      },
    });

    // Ruajtjet
    for (const saver of pickMany(users, intBetween(0, 4))) {
      await db.bookmark
        .create({ data: { userId: saver.id, targetId: post.id, targetType: "post" } })
        .catch(() => undefined);
    }
  }

  // 12. Bisedat --------------------------------------------------------------
  console.log("Bisedat...");
  const mutuals = await db.follow.findMany({ where: { isMutual: true }, take: 60 });
  const conversationKeys = new Set<string>();

  const MESSAGE_TEXTS = [
    "Hej, a i ke shënimet e ligjëratës së fundit?",
    "I kam, po t'i dërgoj tash.",
    "Faleminderit shumë, m'u desh urgjent.",
    "A po vjen nesër në bibliotekë? Fillojmë në dhjetë.",
    "Po, po vij. Sille edhe fletën e ushtrimeve.",
    "E kalova provimin. Falë atyre skemave që i ngarkove.",
    "Urime. E dija që do ta kalosh.",
    "A e di kush e mban ligjëratën e së premtes?",
    "Asistenti, profesori është jashtë vendit këtë javë.",
    "Po e nis projektin sonte. Nëse ke kohë, hidhi një sy pjesës së parë.",
  ];

  for (const follow of mutuals) {
    const key = [follow.followerId, follow.followingId].sort().join(":");
    if (conversationKeys.has(key)) continue;
    conversationKeys.add(key);
    if (conversationKeys.size > 28) break;

    const conversation = await db.conversation.create({
      data: {
        type: "direct",
        createdAt: hoursAgo(intBetween(2, 900)),
        updatedAt: hoursAgo(intBetween(0, 100)),
      },
    });
    await db.conversationMember.createMany({
      data: [
        { conversationId: conversation.id, userId: follow.followerId },
        { conversationId: conversation.id, userId: follow.followingId },
      ],
    });

    const messageCount = intBetween(2, 8);
    for (let index = 0; index < messageCount; index += 1) {
      await db.message.create({
        data: {
          conversationId: conversation.id,
          authorId: index % 2 === 0 ? follow.followerId : follow.followingId,
          text: MESSAGE_TEXTS[index % MESSAGE_TEXTS.length],
          createdAt: hoursAgo(intBetween(1, 200) + (messageCount - index) * 2),
        },
      });
    }
  }

  // Demo-ja duhet të ketë biseda pa i kërkuar.
  const demoFriends = pickMany(users.filter((user) => user.id !== demoUser.id), 4);
  for (const friend of demoFriends) {
    await db.follow
      .create({ data: { followerId: demoUser.id, followingId: friend.id, isMutual: true } })
      .catch(() => undefined);
    await db.follow
      .create({ data: { followerId: friend.id, followingId: demoUser.id, isMutual: true } })
      .catch(() => undefined);

    const conversation = await db.conversation.create({
      data: { type: "direct", updatedAt: hoursAgo(intBetween(1, 40)) },
    });
    await db.conversationMember.createMany({
      data: [
        { conversationId: conversation.id, userId: demoUser.id },
        { conversationId: conversation.id, userId: friend.id },
      ],
    });
    for (let index = 0; index < 4; index += 1) {
      await db.message.create({
        data: {
          conversationId: conversation.id,
          authorId: index % 2 === 0 ? friend.id : demoUser.id,
          text: MESSAGE_TEXTS[index % MESSAGE_TEXTS.length],
          createdAt: hoursAgo(20 - index * 3),
        },
      });
    }
  }

  // 13. Badge-t e fituara ----------------------------------------------------
  console.log("Badge-t dhe njoftimet...");
  for (const user of users) {
    if (user.isVerified) {
      await db.userBadge.create({
        data: { userId: user.id, badgeId: badgeByCode.verified.id, context: null },
      });
    }
    if (chance(0.3)) {
      await db.userBadge
        .create({ data: { userId: user.id, badgeId: badgeByCode.founder.id, context: null } })
        .catch(() => undefined);
    }
    if (chance(0.15)) {
      const course = pick(courses);
      await db.userBadge
        .create({
          data: {
            userId: user.id,
            badgeId: badgeByCode.course_leader.id,
            context: course.name,
          },
        })
        .catch(() => undefined);
    }
    if (chance(0.2)) {
      await db.userBadge
        .create({ data: { userId: user.id, badgeId: badgeByCode.savior.id, context: null } })
        .catch(() => undefined);
    }
    if (chance(0.12)) {
      await db.userBadge
        .create({ data: { userId: user.id, badgeId: badgeByCode.archivist.id, context: null } })
        .catch(() => undefined);
    }
  }

  // 14. Njoftimet për llogarinë demo ----------------------------------------
  const notifiers = pickMany(users.filter((user) => user.id !== demoUser.id), 8);
  const notificationSeeds = [
    { type: "follow", text: "po të ndjek", context: "Jeni bashkë në 3 lëndë." },
    { type: "comment", text: "komentoi te postimi yt", context: "«E provova dhe funksionoi.»" },
    { type: "accepted", text: "e pranoi përgjigjen tënde", context: "Statistikë · +40 XP" },
    { type: "material", text: "ngarkoi material për Statistikë", context: "Provimi i qershorit 2024 me zgjidhje" },
    { type: "mutual", text: "u bë shoku yt", context: "Tani mund t'i shkruani lirshëm." },
    { type: "event", text: "të ftoi te një event", context: "Studio bashkë, e mërkurë 16:00" },
    { type: "question_nudge", text: "pyeti për Mikroekonomi", context: "Ti e ke marrë atë provim." },
    { type: "badge", text: "Fitove badge-in Ndihmës", context: "50 përgjigje të dobishme" },
  ];
  for (let index = 0; index < notificationSeeds.length; index += 1) {
    const seed = notificationSeeds[index];
    await db.notification.create({
      data: {
        userId: demoUser.id,
        type: seed.type,
        actorId: seed.type === "badge" ? null : notifiers[index % notifiers.length].id,
        text: seed.text,
        context: seed.context,
        isRead: index > 3,
        createdAt: hoursAgo(index * 7 + 1),
      },
    });
  }

  // 15. Moderimi -------------------------------------------------------------
  const reportablePosts = await db.post.findMany({ take: 6, orderBy: { createdAt: "desc" } });
  for (const post of reportablePosts.slice(0, 4)) {
    await db.report.create({
      data: {
        reporterId: pick(users).id,
        targetId: post.id,
        targetType: "post",
        reason: pick(["spam", "harassment", "personal_data", "other"]),
        note: "E raportova sepse s'më duket në rregull për këtë kanal.",
        status: chance(0.5) ? "open" : "reviewing",
        createdAt: hoursAgo(intBetween(1, 90)),
      },
    });
  }

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  for (let week = 0; week < 4; week += 1) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() - week * 7);
    await db.moderationLog.create({
      data: {
        weekOf: date,
        removed: intBetween(4, 19),
        reviewed: intBetween(20, 60),
        dismissed: intBetween(5, 25),
      },
    });
  }

  const counts = {
    universitete: await db.university.count(),
    fakultete: await db.faculty.count(),
    lende: await db.course.count(),
    perdorues: await db.user.count(),
    postime: await db.post.count(),
    komente: await db.comment.count(),
    materiale: await db.material.count(),
    pyetje: await db.question.count(),
    pergjigje: await db.answer.count(),
    evente: await db.event.count(),
    pune: await db.jobPost.count(),
    badge: await db.badge.count(),
    grupe: await db.group.count(),
    biseda: await db.conversation.count(),
  };
  console.log("Gati:", counts);
  console.log("Hyr me: demo@student.uni-pr.edu / provoje123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
