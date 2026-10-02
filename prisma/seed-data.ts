/**
 * Të dhënat e seed-it: institucione reale të Kosovës, lëndë reale, emra realë.
 * Asnjë Lorem ipsum, asnjë John Doe.
 */

export const UNIVERSITIES = [
  {
    abbr: "UP",
    name: 'Universiteti i Prishtinës "Hasan Prishtina"',
    nameEn: 'University of Prishtina "Hasan Prishtina"',
    city: "Prishtinë",
    emailDomain: "student.uni-pr.edu",
    type: "public",
  },
  {
    abbr: "UBT",
    name: "UBT, Kolegji për Biznes dhe Teknologji",
    nameEn: "UBT, College of Business and Technology",
    city: "Prishtinë",
    emailDomain: "ubt-uni.net",
    type: "private",
  },
  {
    abbr: "AAB",
    name: "Kolegji AAB",
    nameEn: "AAB College",
    city: "Prishtinë",
    emailDomain: "aab-edu.net",
    type: "private",
  },
  {
    abbr: "Rezonanca",
    name: "Kolegji Rezonanca",
    nameEn: "Rezonanca College",
    city: "Prishtinë",
    emailDomain: "rezonanca-rks.com",
    type: "private",
  },
  {
    abbr: "Heimerer",
    name: "Kolegji Heimerer",
    nameEn: "Heimerer College",
    city: "Prishtinë",
    emailDomain: "kolegji-heimerer.eu",
    type: "private",
  },
  {
    abbr: "RIT",
    name: "RIT Kosovo (A.U.K)",
    nameEn: "RIT Kosovo (A.U.K)",
    city: "Prishtinë",
    emailDomain: "rit.edu",
    type: "private",
  },
] as const;

/** Katërmbëdhjetë fakultetet e Universitetit të Prishtinës. */
export const UP_FACULTIES = [
  { abbr: "FIEK", color: "electrical", icon: "cpu", name: "Fakulteti i Inxhinierisë Elektrike dhe Kompjuterike", nameEn: "Faculty of Electrical and Computer Engineering" },
  { abbr: "EKO", color: "economics", icon: "trending-up", name: "Fakulteti Ekonomik", nameEn: "Faculty of Economics" },
  { abbr: "MJK", color: "medicine", icon: "stethoscope", name: "Fakulteti i Mjekësisë", nameEn: "Faculty of Medicine" },
  { abbr: "JUR", color: "law", icon: "scale", name: "Fakulteti Juridik", nameEn: "Faculty of Law" },
  { abbr: "FSHMN", color: "science", icon: "flask-conical", name: "Fakulteti i Shkencave Matematike-Natyrore", nameEn: "Faculty of Mathematics and Natural Sciences" },
  { abbr: "FIL", color: "philology", icon: "book-open", name: "Fakulteti i Filologjisë", nameEn: "Faculty of Philology" },
  { abbr: "ART", color: "arts", icon: "palette", name: "Fakulteti i Arteve", nameEn: "Faculty of Arts" },
  { abbr: "FNA", color: "architecture", icon: "building-2", name: "Fakulteti i Ndërtimtarisë dhe Arkitekturës", nameEn: "Faculty of Civil Engineering and Architecture" },
  { abbr: "FIM", color: "mechanical", icon: "cog", name: "Fakulteti i Inxhinierisë Mekanike", nameEn: "Faculty of Mechanical Engineering" },
  { abbr: "FBV", color: "agriculture", icon: "sprout", name: "Fakulteti i Bujqësisë dhe Veterinarisë", nameEn: "Faculty of Agriculture and Veterinary" },
  { abbr: "EDU", color: "education", icon: "graduation-cap", name: "Fakulteti i Edukimit", nameEn: "Faculty of Education" },
  { abbr: "FIZ", color: "philosophy", icon: "brain", name: "Fakulteti Filozofik", nameEn: "Faculty of Philosophy" },
  { abbr: "SPORT", color: "sport", icon: "dumbbell", name: "Fakulteti i Edukimit Fizik dhe Sportit", nameEn: "Faculty of Physical Education and Sport" },
  { abbr: "XHM", color: "mining", icon: "pickaxe", name: "Fakulteti i Xehetarisë dhe Metalurgjisë", nameEn: "Faculty of Mining and Metallurgy" },
] as const;

export const OTHER_FACULTIES = [
  { university: "UBT", abbr: "UBT-CS", color: "electrical", icon: "cpu", name: "Shkenca Kompjuterike dhe Inxhinieri", nameEn: "Computer Science and Engineering" },
  { university: "UBT", abbr: "UBT-MNG", color: "economics", icon: "briefcase", name: "Menaxhment, Biznes dhe Ekonomi", nameEn: "Management, Business and Economics" },
  { university: "AAB", abbr: "AAB-JUR", color: "law", icon: "scale", name: "Fakulteti Juridik", nameEn: "Faculty of Law" },
  { university: "AAB", abbr: "AAB-KOM", color: "philology", icon: "book-open", name: "Komunikim Masiv", nameEn: "Mass Communication" },
  { university: "Rezonanca", abbr: "REZ-INF", color: "medicine", icon: "stethoscope", name: "Infermieri", nameEn: "Nursing" },
  { university: "Heimerer", abbr: "HEI-FIZ", color: "medicine", icon: "activity", name: "Fizioterapi", nameEn: "Physiotherapy" },
  { university: "RIT", abbr: "RIT-CS", color: "electrical", icon: "cpu", name: "Computing and Information Technologies", nameEn: "Computing and Information Technologies" },
] as const;

type CourseSeed = {
  faculty: string;
  department: string;
  departmentEn: string;
  name: string;
  nameEn: string;
  code: string;
  year: number;
  semester: number;
  ects: number;
  professor: string;
};

/** Gjashtëdhjetë lëndë reale, të shpërndara nëpër fakultete. */
export const COURSES: CourseSeed[] = [
  // FIEK, Kompjuterikë
  { faculty: "FIEK", department: "Inxhinieri Kompjuterike", departmentEn: "Computer Engineering", name: "Hyrje në programim", nameEn: "Introduction to Programming", code: "FIEK101", year: 1, semester: 1, ects: 7, professor: "Prof. Dr. Agron Rexhepi" },
  { faculty: "FIEK", department: "Inxhinieri Kompjuterike", departmentEn: "Computer Engineering", name: "Matematika 1", nameEn: "Mathematics 1", code: "FIEK102", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Vesa Ibrahimi" },
  { faculty: "FIEK", department: "Inxhinieri Kompjuterike", departmentEn: "Computer Engineering", name: "Algjebra lineare", nameEn: "Linear Algebra", code: "FIEK103", year: 1, semester: 2, ects: 6, professor: "Prof. Dr. Vesa Ibrahimi" },
  { faculty: "FIEK", department: "Inxhinieri Kompjuterike", departmentEn: "Computer Engineering", name: "Struktura të dhënash", nameEn: "Data Structures", code: "FIEK201", year: 2, semester: 1, ects: 7, professor: "Prof. Dr. Agron Rexhepi" },
  { faculty: "FIEK", department: "Inxhinieri Kompjuterike", departmentEn: "Computer Engineering", name: "Algoritme", nameEn: "Algorithms", code: "FIEK202", year: 2, semester: 1, ects: 7, professor: "Prof. Ass. Leotrim Kabashi" },
  { faculty: "FIEK", department: "Inxhinieri Kompjuterike", departmentEn: "Computer Engineering", name: "Bazat e të dhënave", nameEn: "Databases", code: "FIEK203", year: 2, semester: 2, ects: 6, professor: "Prof. Ass. Leotrim Kabashi" },
  { faculty: "FIEK", department: "Inxhinieri Kompjuterike", departmentEn: "Computer Engineering", name: "Programim i orientuar në objekte", nameEn: "Object-Oriented Programming", code: "FIEK204", year: 2, semester: 2, ects: 6, professor: "Prof. Dr. Kushtrim Selimi" },
  { faculty: "FIEK", department: "Inxhinieri Kompjuterike", departmentEn: "Computer Engineering", name: "Rrjeta kompjuterike", nameEn: "Computer Networks", code: "FIEK301", year: 3, semester: 1, ects: 6, professor: "Prof. Dr. Kushtrim Selimi" },
  { faculty: "FIEK", department: "Inxhinieri Kompjuterike", departmentEn: "Computer Engineering", name: "Sisteme operative", nameEn: "Operating Systems", code: "FIEK302", year: 3, semester: 1, ects: 6, professor: "Prof. Dr. Agron Rexhepi" },
  { faculty: "FIEK", department: "Inxhinieri Kompjuterike", departmentEn: "Computer Engineering", name: "Inxhinieri softuerike", nameEn: "Software Engineering", code: "FIEK303", year: 3, semester: 2, ects: 6, professor: "Prof. Ass. Leotrim Kabashi" },
  { faculty: "FIEK", department: "Elektroenergjetikë", departmentEn: "Power Engineering", name: "Bazat e elektroteknikës", nameEn: "Fundamentals of Electrical Engineering", code: "FIEK111", year: 1, semester: 1, ects: 7, professor: "Prof. Dr. Bardh Statovci" },
  { faculty: "FIEK", department: "Elektroenergjetikë", departmentEn: "Power Engineering", name: "Makina elektrike", nameEn: "Electrical Machines", code: "FIEK211", year: 2, semester: 1, ects: 6, professor: "Prof. Dr. Bardh Statovci" },

  // Ekonomik
  { faculty: "EKO", department: "Banka, Financa dhe Kontabilitet", departmentEn: "Banking, Finance and Accounting", name: "Mikroekonomi", nameEn: "Microeconomics", code: "EKO101", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Ilir Berisha" },
  { faculty: "EKO", department: "Banka, Financa dhe Kontabilitet", departmentEn: "Banking, Finance and Accounting", name: "Matematikë për ekonomistë", nameEn: "Mathematics for Economists", code: "EKO102", year: 1, semester: 1, ects: 5, professor: "Prof. Ass. Vjosa Kelmendi" },
  { faculty: "EKO", department: "Banka, Financa dhe Kontabilitet", departmentEn: "Banking, Finance and Accounting", name: "Bazat e kontabilitetit", nameEn: "Fundamentals of Accounting", code: "EKO103", year: 1, semester: 2, ects: 6, professor: "Prof. Dr. Naim Hoxha" },
  { faculty: "EKO", department: "Banka, Financa dhe Kontabilitet", departmentEn: "Banking, Finance and Accounting", name: "Makroekonomi", nameEn: "Macroeconomics", code: "EKO201", year: 2, semester: 1, ects: 6, professor: "Prof. Dr. Ilir Berisha" },
  { faculty: "EKO", department: "Banka, Financa dhe Kontabilitet", departmentEn: "Banking, Finance and Accounting", name: "Statistikë", nameEn: "Statistics", code: "EKO202", year: 2, semester: 1, ects: 5, professor: "Prof. Dr. Fatmir Krasniqi" },
  { faculty: "EKO", department: "Banka, Financa dhe Kontabilitet", departmentEn: "Banking, Finance and Accounting", name: "Kontabilitet financiar", nameEn: "Financial Accounting", code: "EKO203", year: 2, semester: 2, ects: 6, professor: "Prof. Dr. Naim Hoxha" },
  { faculty: "EKO", department: "Banka, Financa dhe Kontabilitet", departmentEn: "Banking, Finance and Accounting", name: "Ekonometri", nameEn: "Econometrics", code: "EKO301", year: 3, semester: 1, ects: 6, professor: "Prof. Dr. Fatmir Krasniqi" },
  { faculty: "EKO", department: "Menaxhment dhe Informatikë", departmentEn: "Management and Informatics", name: "Bazat e menaxhmentit", nameEn: "Fundamentals of Management", code: "EKO111", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Shpend Ahmeti" },
  { faculty: "EKO", department: "Menaxhment dhe Informatikë", departmentEn: "Management and Informatics", name: "Marketing", nameEn: "Marketing", code: "EKO211", year: 2, semester: 1, ects: 6, professor: "Prof. Ass. Donjeta Maliqi" },
  { faculty: "EKO", department: "Menaxhment dhe Informatikë", departmentEn: "Management and Informatics", name: "Sjellje organizative", nameEn: "Organizational Behaviour", code: "EKO212", year: 2, semester: 2, ects: 5, professor: "Prof. Ass. Donjeta Maliqi" },

  // Mjekësi
  { faculty: "MJK", department: "Mjekësi e përgjithshme", departmentEn: "General Medicine", name: "Anatomi e njeriut", nameEn: "Human Anatomy", code: "MJK101", year: 1, semester: 1, ects: 9, professor: "Prof. Dr. Ramadan Zeqiri" },
  { faculty: "MJK", department: "Mjekësi e përgjithshme", departmentEn: "General Medicine", name: "Histologji dhe embriologji", nameEn: "Histology and Embryology", code: "MJK102", year: 1, semester: 2, ects: 7, professor: "Prof. Dr. Lindita Shala" },
  { faculty: "MJK", department: "Mjekësi e përgjithshme", departmentEn: "General Medicine", name: "Fiziologji", nameEn: "Physiology", code: "MJK201", year: 2, semester: 1, ects: 9, professor: "Prof. Dr. Besim Aliu" },
  { faculty: "MJK", department: "Mjekësi e përgjithshme", departmentEn: "General Medicine", name: "Biokimi mjekësore", nameEn: "Medical Biochemistry", code: "MJK202", year: 2, semester: 1, ects: 7, professor: "Prof. Dr. Lindita Shala" },
  { faculty: "MJK", department: "Mjekësi e përgjithshme", departmentEn: "General Medicine", name: "Patologji", nameEn: "Pathology", code: "MJK301", year: 3, semester: 1, ects: 8, professor: "Prof. Dr. Ramadan Zeqiri" },
  { faculty: "MJK", department: "Mjekësi e përgjithshme", departmentEn: "General Medicine", name: "Farmakologji", nameEn: "Pharmacology", code: "MJK302", year: 3, semester: 2, ects: 7, professor: "Prof. Dr. Besim Aliu" },
  { faculty: "MJK", department: "Stomatologji", departmentEn: "Dentistry", name: "Morfologji dentare", nameEn: "Dental Morphology", code: "MJK111", year: 1, semester: 1, ects: 7, professor: "Prof. Dr. Teuta Bajrami" },

  // Juridik
  { faculty: "JUR", department: "Drejtimi i përgjithshëm", departmentEn: "General Programme", name: "Hyrje në të drejtën", nameEn: "Introduction to Law", code: "JUR101", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Rexhep Osmani" },
  { faculty: "JUR", department: "Drejtimi i përgjithshëm", departmentEn: "General Programme", name: "E drejta romake", nameEn: "Roman Law", code: "JUR102", year: 1, semester: 2, ects: 5, professor: "Prof. Ass. Ardita Latifi" },
  { faculty: "JUR", department: "Drejtimi i përgjithshëm", departmentEn: "General Programme", name: "E drejta civile", nameEn: "Civil Law", code: "JUR201", year: 2, semester: 1, ects: 7, professor: "Prof. Dr. Rexhep Osmani" },
  { faculty: "JUR", department: "Drejtimi i përgjithshëm", departmentEn: "General Programme", name: "E drejta penale", nameEn: "Criminal Law", code: "JUR202", year: 2, semester: 2, ects: 7, professor: "Prof. Dr. Valon Haziri" },
  { faculty: "JUR", department: "Drejtimi i përgjithshëm", departmentEn: "General Programme", name: "E drejta administrative", nameEn: "Administrative Law", code: "JUR301", year: 3, semester: 1, ects: 6, professor: "Prof. Ass. Ardita Latifi" },

  // FSHMN
  { faculty: "FSHMN", department: "Kimi", departmentEn: "Chemistry", name: "Kimi e përgjithshme", nameEn: "General Chemistry", code: "FSH101", year: 1, semester: 1, ects: 7, professor: "Prof. Dr. Vesa Ibrahimi" },
  { faculty: "FSHMN", department: "Kimi", departmentEn: "Chemistry", name: "Kimi organike", nameEn: "Organic Chemistry", code: "FSH201", year: 2, semester: 1, ects: 7, professor: "Prof. Ass. Blerim Musliu" },
  { faculty: "FSHMN", department: "Biologji", departmentEn: "Biology", name: "Botanikë", nameEn: "Botany", code: "FSH111", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Njomza Dobruna" },
  { faculty: "FSHMN", department: "Biologji", departmentEn: "Biology", name: "Zoologji", nameEn: "Zoology", code: "FSH112", year: 1, semester: 2, ects: 6, professor: "Prof. Dr. Njomza Dobruna" },
  { faculty: "FSHMN", department: "Fizikë", departmentEn: "Physics", name: "Fizikë e përgjithshme", nameEn: "General Physics", code: "FSH121", year: 1, semester: 1, ects: 7, professor: "Prof. Dr. Genc Jashari" },
  { faculty: "FSHMN", department: "Matematikë", departmentEn: "Mathematics", name: "Analizë matematike", nameEn: "Mathematical Analysis", code: "FSH131", year: 1, semester: 1, ects: 8, professor: "Prof. Dr. Genc Jashari" },

  // Filologjik
  { faculty: "FIL", department: "Gjuhë dhe Letërsi Shqipe", departmentEn: "Albanian Language and Literature", name: "Letërsi shqipe", nameEn: "Albanian Literature", code: "FIL101", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Njomza Dobruna" },
  { faculty: "FIL", department: "Gjuhë dhe Letërsi Shqipe", departmentEn: "Albanian Language and Literature", name: "Gjuhësi e përgjithshme", nameEn: "General Linguistics", code: "FIL102", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Bardh Statovci" },
  { faculty: "FIL", department: "Gjuhë dhe Letërsi Shqipe", departmentEn: "Albanian Language and Literature", name: "Fonetikë dhe fonologji", nameEn: "Phonetics and Phonology", code: "FIL201", year: 2, semester: 1, ects: 5, professor: "Prof. Dr. Bardh Statovci" },
  { faculty: "FIL", department: "Gjuhë Angleze", departmentEn: "English Language", name: "Morfologji e gjuhës angleze", nameEn: "English Morphology", code: "FIL111", year: 1, semester: 1, ects: 6, professor: "Prof. Ass. Fjolla Veseli" },
  { faculty: "FIL", department: "Gjuhë Angleze", departmentEn: "English Language", name: "Përkthim dhe interpretim", nameEn: "Translation and Interpreting", code: "FIL311", year: 3, semester: 1, ects: 6, professor: "Prof. Ass. Fjolla Veseli" },

  // Arte
  { faculty: "ART", department: "Arte Figurative", departmentEn: "Fine Arts", name: "Vizatim", nameEn: "Drawing", code: "ART101", year: 1, semester: 1, ects: 8, professor: "Prof. Dr. Diellza Halimi" },
  { faculty: "ART", department: "Arte Figurative", departmentEn: "Fine Arts", name: "Histori e artit", nameEn: "History of Art", code: "ART102", year: 1, semester: 2, ects: 5, professor: "Prof. Dr. Ylli Sylejmani" },
  { faculty: "ART", department: "Arte Figurative", departmentEn: "Fine Arts", name: "Pikturë", nameEn: "Painting", code: "ART201", year: 2, semester: 1, ects: 8, professor: "Prof. Dr. Diellza Halimi" },
  { faculty: "ART", department: "Muzikë", departmentEn: "Music", name: "Solfezh", nameEn: "Solfège", code: "ART111", year: 1, semester: 1, ects: 6, professor: "Prof. Ass. Erblin Dobruna" },

  // FNA
  { faculty: "FNA", department: "Arkitekturë", departmentEn: "Architecture", name: "Projektim arkitektonik", nameEn: "Architectural Design", code: "FNA101", year: 1, semester: 1, ects: 8, professor: "Prof. Dr. Learta Nikçi" },
  { faculty: "FNA", department: "Ndërtimtari", departmentEn: "Civil Engineering", name: "Mekanika teknike", nameEn: "Engineering Mechanics", code: "FNA111", year: 1, semester: 1, ects: 7, professor: "Prof. Dr. Fisnik Sadiku" },
  { faculty: "FNA", department: "Ndërtimtari", departmentEn: "Civil Engineering", name: "Materialet e ndërtimit", nameEn: "Construction Materials", code: "FNA201", year: 2, semester: 1, ects: 6, professor: "Prof. Dr. Fisnik Sadiku" },

  // FIM
  { faculty: "FIM", department: "Konstruksione mekanike", departmentEn: "Mechanical Design", name: "Elemente makinash", nameEn: "Machine Elements", code: "FIM201", year: 2, semester: 1, ects: 7, professor: "Prof. Dr. Granit Nikçi" },
  { faculty: "FIM", department: "Konstruksione mekanike", departmentEn: "Mechanical Design", name: "Termodinamikë", nameEn: "Thermodynamics", code: "FIM202", year: 2, semester: 2, ects: 6, professor: "Prof. Dr. Granit Nikçi" },

  // FBV
  { faculty: "FBV", department: "Prodhimtari Bimore", departmentEn: "Crop Production", name: "Agroteknikë", nameEn: "Agrotechnics", code: "FBV101", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Lirim Kabashi" },
  { faculty: "FBV", department: "Prodhimtari Bimore", departmentEn: "Crop Production", name: "Prodhimtari bimore", nameEn: "Crop Production", code: "FBV201", year: 2, semester: 1, ects: 6, professor: "Prof. Dr. Lirim Kabashi" },

  // EDU
  { faculty: "EDU", department: "Programi Fillor", departmentEn: "Primary Programme", name: "Pedagogji", nameEn: "Pedagogy", code: "EDU101", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Besa Halimi" },
  { faculty: "EDU", department: "Programi Fillor", departmentEn: "Primary Programme", name: "Psikologji zhvillimore", nameEn: "Developmental Psychology", code: "EDU102", year: 1, semester: 2, ects: 6, professor: "Prof. Dr. Besa Halimi" },

  // Filozofik
  { faculty: "FIZ", department: "Psikologji", departmentEn: "Psychology", name: "Psikologji e përgjithshme", nameEn: "General Psychology", code: "FIZ101", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Arta Musliu" },
  { faculty: "FIZ", department: "Sociologji", departmentEn: "Sociology", name: "Hyrje në sociologji", nameEn: "Introduction to Sociology", code: "FIZ111", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Arta Musliu" },

  // Sport dhe Xehetari
  { faculty: "SPORT", department: "Edukim Fizik", departmentEn: "Physical Education", name: "Anatomi funksionale", nameEn: "Functional Anatomy", code: "SPT101", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Trim Berisha" },
  { faculty: "XHM", department: "Xehetari", departmentEn: "Mining", name: "Gjeologji e përgjithshme", nameEn: "General Geology", code: "XHM101", year: 1, semester: 1, ects: 6, professor: "Prof. Dr. Behar Osmani" },

  // Kolegjet
  { faculty: "UBT-CS", department: "Programi i përgjithshëm", departmentEn: "General Programme", name: "Programim në ueb", nameEn: "Web Programming", code: "UBT201", year: 2, semester: 1, ects: 6, professor: "Prof. Ass. Egzon Aliu" },
  { faculty: "UBT-MNG", department: "Programi i përgjithshëm", departmentEn: "General Programme", name: "Menaxhim projektesh", nameEn: "Project Management", code: "UBT211", year: 2, semester: 1, ects: 6, professor: "Prof. Ass. Egzona Selimi" },
  { faculty: "AAB-JUR", department: "Programi i përgjithshëm", departmentEn: "General Programme", name: "E drejta e punës", nameEn: "Labour Law", code: "AAB201", year: 2, semester: 1, ects: 6, professor: "Prof. Ass. Drilon Jashari" },
  { faculty: "REZ-INF", department: "Programi i përgjithshëm", departmentEn: "General Programme", name: "Kujdesi infermieror", nameEn: "Nursing Care", code: "REZ101", year: 1, semester: 1, ects: 7, professor: "Prof. Ass. Blerta Haziri" },
  { faculty: "RIT-CS", department: "Programi i përgjithshëm", departmentEn: "General Programme", name: "Software Development", nameEn: "Software Development", code: "RIT201", year: 2, semester: 1, ects: 6, professor: "Prof. Ass. Rron Statovci" },
];

export const MALE_NAMES = [
  "Arian", "Blerim", "Endrit", "Drilon", "Lirim", "Fisnik", "Granit", "Valon",
  "Egzon", "Leotrim", "Rron", "Diar", "Altin", "Kushtrim", "Bardh", "Agon",
  "Donat", "Erblin", "Genc", "Behar", "Labinot", "Ardit", "Shpend", "Trim",
];

export const FEMALE_NAMES = [
  "Erza", "Dea", "Rina", "Vlora", "Arta", "Besa", "Elira", "Doruntina",
  "Adelina", "Blerta", "Ardita", "Njomza", "Kaltrina", "Learta", "Donjeta",
  "Diellza", "Fjolla", "Hana", "Lirie", "Teuta", "Egzona", "Venera", "Qëndresa",
];

export const SURNAMES = [
  "Gashi", "Krasniqi", "Berisha", "Hoxha", "Morina", "Bytyqi", "Zeqiri",
  "Rexhepi", "Shala", "Kelmendi", "Aliu", "Ahmeti", "Sylejmani", "Bajrami",
  "Halimi", "Musliu", "Rrahmani", "Kabashi", "Selimi", "Ibrahimi", "Osmani",
  "Maliqi", "Jashari", "Veseli", "Latifi", "Haziri", "Sadiku", "Nikçi",
  "Dobruna", "Statovci",
];

export const HIGH_SCHOOLS = [
  "Gjimnazi 'Sami Frashëri', Prishtinë",
  "Gjimnazi 'Xhevdet Doda', Prishtinë",
  "Gjimnazi 'Gjon Buzuku', Prizren",
  "Gjimnazi 'Bedri Pejani', Pejë",
  "Gjimnazi 'Hajdar Dushi', Gjakovë",
  "Gjimnazi 'Zenel Hajdini', Gjilan",
  "Gjimnazi 'Frang Bardhi', Mitrovicë",
  "Shkolla e Mesme Teknike 'Gjin Gazulli', Prishtinë",
  "Gjimnazi 'Eqrem Çabej', Vushtrri",
];

export const BIO_TEMPLATES = [
  "{fakulteti}, {viti}. Ndihmoj me {fort}, kërkoj ndihmë me {dobet}.",
  "{viti} në {fakulteti}. I mbaj shënimet rregullt, i ndaj pa problem.",
  "Nga {qyteti}, tash në Prishtinë. {fakulteti}, {viti}.",
  "{fakulteti}. Nëse ke pyetje për {fort}, shkruaj pa ngurrim.",
  "{viti}, {fakulteti}. Punoj gjysmë orari, mësoj natën.",
  "Më gjen në bibliotekë para afateve. {fakulteti}, {viti}.",
  "{fakulteti}, {viti}. Bëj skema për çdo lëndë, i ngarkoj këtu.",
];

export const STRONG_SUBJECTS = ["statistikë", "algoritme", "anatomi", "programim", "kontabilitet", "e drejta civile", "kimi", "letërsi", "mikroekonomi", "fizikë"];
export const WEAK_SUBJECTS = ["gjermanisht", "ekonometri", "biokimi", "algjebër", "histologji", "e drejta romake", "sisteme operative", "gjuhësi", "makroekonomi", "anglisht juridik"];

export const TEXT_POSTS = [
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
  "Salla e kompjuterëve tash punon deri në 20:00. E kërkuam një vit të tërë.",
  "Grupi i lëndës është shumë më i qetë se ai i WhatsApp-it. Këtu të paktën gjen çka kërkon.",
];

export const QUESTION_TITLES = [
  "Si zgjidhet detyra 4 nga ushtrimet e kapitullit të tretë?",
  "A hyn kapitulli i fundit në provimin e afatit të qershorit?",
  "Cili është ndryshimi praktik mes dy metodave që i mësuam sot?",
  "Ku mund ta gjej literaturën shtesë që e përmendi profesori?",
  "Sa pikë duhen për të kaluar në pjesën praktike?",
  "A ka dikush shënime nga ligjërata e gjashtë?",
  "Si llogaritet kompleksiteti kur cikli varet nga hyrja?",
  "A pranohet dorëzimi i detyrës me email pas afatit?",
  "Çfarë duhet të dijë njeriu para kolokviumit të parë?",
  "Si e organizoni leximin kur ka tre provime në një javë?",
];

export const QUESTION_BODIES = [
  "E kam provuar dy herë por më del rezultat tjetër nga ai i fletës. Nuk e di ku po gabohem, ndoshta te hapi i dytë.",
  "Në ligjëratë u tha diçka tjetër nga ajo që shkruan në skriptë. Dua ta di cila vlen për provimin.",
  "Kam kërkuar në bibliotekë por s'e gjeta. Nëse dikush e ka në PDF, do të ndihmonte shumë.",
  "Po përgatitem vetëm dhe s'kam me kë ta kontrolloj. Çdo sqarim i shkurtër më ndihmon.",
  "Është hera e parë që e jap këtë provim dhe nuk e di sa thellë duhet shkuar në teori.",
];

export const ANSWER_TEXTS = [
  "Gabimi është te hapi ku e zëvendëson vlerën. Duhet ta derivosh para se ta futësh numrin, jo pas.",
  "Po, hyn i tërë. Vitin e kaluar erdhi një pyetje pikërisht nga aty, e mbaj mend sepse më mori shumë kohë.",
  "Në praktikë ndryshimi është vetëm te supozimi fillestar. Nëse të japin të dhëna të plota, të dyja japin rezultat të njëjtë.",
  "E ke te biblioteka, rafti i tretë majtas kur hyn. Ka tri kopje, njëra jepet për në shtëpi.",
  "Duhen 51 pikë nga 100, por pjesa praktike duhet kaluar veç. Nëse e lë atë, s'të ndihmon teoria.",
  "I kam shënimet e asaj ligjërate, i ngarkova te materialet e lëndës mbrëmë.",
  "Kur cikli varet nga hyrja, e llogarit me shumën e iteracioneve, jo me shumëzim. Shembulli i tretë në fletë e tregon.",
  "Profesori e pranon deri në 48 orë vonesë, por bie një pikë. Më mirë dorëzoje edhe të papërfunduar.",
  "Lexo shënimet e ligjëratave 1 deri 5 dhe bëj ushtrimet e fletës së parë. Kolokviumi vjen prej andej.",
  "Unë i ndaj ditët sipas provimit, jo sipas orëve. Një ditë e plotë për një lëndë punon më mirë se tri lëndë në një ditë.",
];

export const COMMENTS = [
  "Faleminderit, m'u desh pikërisht kjo.",
  "E provova dhe funksionoi. Po e shënoj për afatin.",
  "A mund ta shpjegosh edhe hapin e dytë? Aty më humb.",
  "Edhe unë e kisha të njëjtin problem javën e kaluar.",
  "E kam ngarkuar një version më të plotë te materialet e lëndës.",
  "Po vij edhe unë. Sa veta jemi deri tash?",
  "Shumë e dobishme, e ruajta.",
  "A e ke edhe për semestrin e dytë?",
  "Kjo ma shpëtoi javën, sinqerisht.",
  "E dërgova te grupi i gjeneratës.",
];

export const SEEK_POSTS = [
  "Kërkoj bashkëstudent për projektin e bazave të të dhënave. Kam nisur skemën, më duhet dikush për pjesën e ndërfaqes.",
  "Ofroj repeticione për matematikë të vitit të parë. Pesë euro ora, në bibliotekë ose online.",
  "Kërkoj banesë me bashkëqiramarrës afër kampusit. Jam i qetë, studioj shumë, s'bëj zhurmë.",
  "Ofroj ndihmë falas me statistikë për ata të vitit të parë. E kam kaluar me nëntë dhe dua ta kthej.",
  "Kërkoj dikë që merr të njëjtin autobus nga Podujeva, që ta ndajmë rrugën.",
];

export const CAMPUS_VOICE_POSTS = [
  "A jam vetëm unë që s'e kuptoj asgjë nga ligjërata e së martës, apo është kështu për të gjithë?",
  "Kam frikë ta pyes profesorin sepse mendoj që pyetja ime është e trashë. Po e pyes këtu.",
  "Tualetet e katit të dytë s'janë pastruar prej javësh. Dikush duhet ta thotë këtë.",
  "Erdha nga një qytet i vogël dhe ende s'kam gjetur asnjë shok këtu. A është normale pas dy muajsh?",
  "Po mendoj ta ndërroj drejtimin pas vitit të parë. A e ka bërë dikush këtë dhe s'i ka ardhur keq?",
  "Ashensori s'punon prej shtatorit dhe ka kolegë që s'mund t'i ngjiten shkallëve.",
  "Sa keq është të mos e dish çka do të bësh pas fakultetit? Sepse unë s'e di fare.",
  "Biblioteka mbyllet shumë herët gjatë afatit. Kush vendos për këto orare?",
];

export const POLL_SEEDS = [
  { text: "Kur duhet ta mbajmë sesionin e përsëritjes para provimit?", options: ["Të mërkurën në 16:00", "Të enjten në 18:00", "Të shtunën paradite"] },
  { text: "Cila metodë ju ndihmon më shumë për provime?", options: ["Ushtrime të vjetra", "Shënime të përmbledhura", "Studim në grup", "Video shpjeguese"] },
  { text: "A duhet ta kërkojmë zgjatjen e orarit të bibliotekës gjatë afatit?", options: ["Po, deri në 22:00", "Po, deri në mesnatë", "Jo, mjafton kështu"] },
  { text: "Ku po e bëni praktikën verore këtë vit?", options: ["Kompani private", "Institucion publik", "Ende s'kam vendosur"] },
];

export const MATERIAL_TITLES: Record<string, string[]> = {
  script: ["Skripta {lenda} {vit}, {prof}", "Skripta e plotë {lenda} {vit}"],
  notes: ["Shënime nga ligjëratat, {lenda} {vit}", "Shënimet e mia {lenda}, semestri {sem}"],
  past_exam: ["Provimi i qershorit {vit} me zgjidhje", "Provimi i shtatorit {vit}, {lenda}", "Kolokviumi i parë {vit} me përgjigje"],
  solved: ["Detyra të zgjidhura, kapitujt 1-5", "Ushtrime të zgjidhura para afatit, {lenda}"],
  slides: ["Prezantimet e ligjëratave, {lenda} {vit}", "Sllajdet e {prof}, {lenda}"],
  lecture: ["Ligjërata 1-8, {lenda} {vit}", "Ligjërata e plotë {lenda}, semestri {sem}"],
  book: ["Kapituj të lejuar nga literatura bazë, {lenda}", "Përmbledhje literature, {lenda}"],
  video: ["Regjistrim ligjërate, {lenda} {vit}", "Video shpjeguese për ushtrimet, {lenda}"],
};

export const MATERIAL_DESCRIPTIONS = [
  "I skanova nga fletorja ime, janë të lexueshme. Nëse gjeni gabim, shkruani në koment e i rregulloj.",
  "Përfshin edhe skemat që i bëra vetë për kapitujt më të vështirë.",
  "Kjo është versioni i rregulluar. Versionin e parë e kisha ngarkuar me dy faqe të munguara.",
  "Nga ligjëratat e këtij semestri, të plota deri te java e dhjetë.",
  "Me zgjidhje hap pas hapi, jo vetëm rezultate përfundimtare.",
  "E mora nga një kolegu i vitit të kaluar dhe e plotësova me shënimet e mia.",
];

export const EVENT_SEEDS = [
  { title: "Studio bashkë: Algoritme para afatit", kind: "study_together", location: "Biblioteka e FIEK-ut, salla 2", description: "Po e mbyllim kapitullin e kompleksitetit. Sillni fletët e ushtrimeve dhe një laptop nëse keni." },
  { title: "Studio bashkë: Anatomi, sistemi nervor", kind: "study_together", location: "Salla e leximit, Fakulteti i Mjekësisë", description: "E kalojmë tërë sistemin nervor qendror me atlas. Fillojmë në kohë." },
  { title: "Panairi i punës dhe praktikave", kind: "fair", location: "Amfiteatri i madh, UP", description: "Mbi tridhjetë kompani vendore me pozita për studentë. Sillni CV-në e shtypur." },
  { title: "Workshop: Si të shkruash CV që lexohet", kind: "workshop", location: "Salla 12, Fakulteti Ekonomik", description: "Një orë e gjysmë, praktike. Dilni me një CV të gatshme, jo me shënime." },
  { title: "Hackathon i FIEK-ut", kind: "contest", location: "Inovacioni Qendra, Prishtinë", description: "Dyzet e tetë orë, ekipe deri në katër veta. Tema shpallet në fillim." },
  { title: "Mbrëmja e gjeneratës së Juridikut", kind: "party", location: "Klubi i studentëve, Prishtinë", description: "Pas afatit të janarit. Bileta merret te përfaqësuesit e vitit." },
  { title: "Ligjëratë e hapur: E drejta e punës në praktikë", kind: "lecture", location: "Amfiteatri A, Fakulteti Juridik", description: "Me një avokat që punon me raste reale. Pyetjet në fund, gjysmë ore." },
  { title: "Gara e debatit ndëruniversitar", kind: "contest", location: "Salla e Kuvendit, Kolegji AAB", description: "Katër universitete, dy raunde. Regjistrimi mbyllet një javë para." },
  { title: "Workshop fotografie për fillestarë", kind: "workshop", location: "Fakulteti i Arteve, atelieja 3", description: "Sillni çka keni, edhe telefonin. Puna bëhet jashtë nëse s'bie shi." },
  { title: "Studio bashkë: Bazat e të dhënave", kind: "study_together", location: "Salla e kompjuterëve, FIEK", description: "Kalojmë detyrat e vjetra të provimit. Ejani me kodin e nisur." },
  { title: "Takim informues për shkëmbimet Erasmus+", kind: "workshop", location: "Rektorati, salla e senatit", description: "Afatet, dokumentet dhe gabimet që i bëjnë shumica në aplikim." },
  { title: "Turneu i futsallit mes fakulteteve", kind: "contest", location: "Palestra e UP-së", description: "Ekipe prej gjashtë vetash. Regjistrimi te përfaqësuesit e fakultetit." },
  { title: "Studio bashkë: Biokimi, metabolizmi", kind: "study_together", location: "Biblioteka Kombëtare, kati i dytë", description: "Fokusi te ciklet metabolike. Sjellim skemat e printuara." },
  { title: "Koncert i studentëve të Muzikës", kind: "party", location: "Salla e koncerteve, Fakulteti i Arteve", description: "Hyrja e lirë. Program prej një ore e gjysmë." },
  { title: "Workshop: Hyrje në analizën e të dhënave", kind: "workshop", location: "UBT, kampusi Lipjan", description: "Praktik, me të dhëna reale. Duhet laptop me tabelë të instaluar." },
];

export const JOB_SEEDS = [
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
  { title: "Praktikë në agroteknikë", type: "internship", field: "Bujqësi", city: "Pejë", remote: false, description: "Punë në terren gjatë sezonit. Për studentë të FBV-së, viti dy e lart." },
  { title: "Infermier praktikant", type: "internship", field: "Shëndetësi", city: "Prishtinë", remote: false, description: "Praktikë klinike me mbikëqyrje. Orar i përshtatshëm me ligjëratat." },
  { title: "Përkthyes shqip-anglisht", type: "part_time", field: "Gjuhë", city: "Prishtinë", remote: true, description: "Dokumente teknike dhe marketingu. Pagesa për faqe." },
  { title: "Asistent në arkitekturë", type: "internship", field: "Arkitekturë", city: "Prishtinë", remote: false, description: "Vizatime teknike dhe modele. Njohja e AutoCAD-it është e nevojshme." },
  { title: "Trajner sporti për fëmijë", type: "part_time", field: "Sport", city: "Ferizaj", remote: false, description: "Tri herë në javë pasdite. Për studentë të Edukimit Fizik." },
];

export const COMPANIES = [
  { name: "Frakton", description: "Kompani softuerike në Prishtinë, punon me klientë ndërkombëtarë.", website: "https://frakton.com", city: "Prishtinë", isVerified: true },
  { name: "Gjirafa", description: "Teknologji, media dhe tregti elektronike për tregun shqipfolës.", website: "https://gjirafa.com", city: "Prishtinë", isVerified: true },
  { name: "Banka Ekonomike", description: "Bankë komerciale me rrjet degësh në tërë Kosovën.", website: null, city: "Prishtinë", isVerified: true },
  { name: "Kutia", description: "Studio produkti dhe inxhinierie softuerike.", website: "https://kutia.net", city: "Prishtinë", isVerified: true },
  { name: "Spitali Amerikan", description: "Institucion privat shëndetësor me qendër në Prishtinë.", website: null, city: "Prishtinë", isVerified: false },
  { name: "IPKO", description: "Operator telekomunikacioni me shërbime mobile dhe internet.", website: null, city: "Prishtinë", isVerified: true },
  { name: "Instituti GAP", description: "Institut kërkimor për politika publike.", website: null, city: "Prishtinë", isVerified: false },
  { name: "Devolli Corporation", description: "Grup kompanish në prodhim dhe distribuim.", website: null, city: "Pejë", isVerified: true },
];

export const ADVERTISERS = [
  {
    name: "KFC Kosova",
    ads: [{
      title: "Menu studentore 2.50 EUR",
      titleEn: "Student menu for 2.50 EUR",
      body: "Me kartelën e studentit, çdo ditë nga ora 11:00 deri në 16:00. Vlen në të gjitha lokacionet në Prishtinë.",
      bodyEn: "With your student card, every day from 11:00 to 16:00. Valid at all Prishtina locations.",
      cta: "Shiko menunë",
      ctaEn: "See the menu",
      url: "https://example.com/kfc-menu-studentore",
    }],
  },
  {
    name: "Gjirafa50",
    ads: [{
      title: "Laptop për fakultet, me këste pa kamatë",
      titleEn: "A laptop for university, interest-free instalments",
      body: "Zgjedhje e gjerë laptopësh për studentë, me dorëzim brenda 24 orësh në tërë Kosovën.",
      bodyEn: "A wide range of student laptops, delivered within 24 hours across Kosovo.",
      cta: "Shiko ofertat",
      ctaEn: "See the offers",
      url: "https://example.com/gjirafa50-laptop",
    }],
  },
  {
    name: "ProCredit Bank",
    ads: [{
      title: "Llogaria studentore pa provizion",
      titleEn: "A student account with no fees",
      body: "Pa pagesë mirëmbajtjeje deri në moshën 26 vjeç, me kartelë debiti dhe banking digjital.",
      bodyEn: "No maintenance fee until you turn 26, with a debit card and digital banking.",
      cta: "Hape llogarinë",
      ctaEn: "Open an account",
      url: "https://example.com/procredit-studentore",
    }],
  },
  {
    name: "Meridian Express",
    ads: [{
      title: "Dërgesa falas për studentë",
      titleEn: "Free delivery for students",
      body: "Çdo pako nën 5 kg dërgohet falas brenda Prishtinës kur regjistrohesh me email studentor.",
      bodyEn: "Every parcel under 5 kg is delivered free within Prishtina when you sign up with a student email.",
      cta: "Regjistrohu",
      ctaEn: "Sign up",
      url: "https://example.com/meridian-studentet",
    }],
  },
  {
    name: "Prishtina Hackerspace",
    ads: [{
      title: "Workshope falas çdo të shtunë",
      titleEn: "Free workshops every Saturday",
      body: "Elektronikë, printim 3D dhe programim. Hapur për të gjithë studentët, pa pagesë anëtarësie.",
      bodyEn: "Electronics, 3D printing and programming. Open to all students, no membership fee.",
      cta: "Shiko kalendarin",
      ctaEn: "See the calendar",
      url: "https://example.com/hackerspace-workshope",
    }],
  },
  {
    name: "Albi Mall",
    ads: [{
      title: "Java e studentit, zbritje deri 40%",
      titleEn: "Student week, up to 40% off",
      body: "Mbi gjashtëdhjetë dyqane me zbritje për studentët gjatë tërë javës së parë të nëntorit.",
      bodyEn: "Over sixty shops with student discounts throughout the first week of November.",
      cta: "Shiko dyqanet",
      ctaEn: "See the shops",
      url: "https://example.com/albi-java-studentit",
    }],
  },
  {
    name: "Kosovo ICT Association",
    ads: [{
      title: "Regjistrimi për praktika verore",
      titleEn: "Summer internship applications are open",
      body: "Mbi njëqind vende praktike në kompani teknologjike vendore. Afati mbyllet më 30 prill.",
      bodyEn: "Over a hundred internship places at local tech companies. Applications close 30 April.",
      cta: "Apliko tani",
      ctaEn: "Apply now",
      url: "https://example.com/stikk-praktika",
    }],
  },
  {
    name: "ETC",
    ads: [{
      title: "Pajisje shkollore me çmime studentore",
      titleEn: "Study gear at student prices",
      body: "Bllok, kalkulator shkencor dhe pajisje zyre me zbritje kur tregon kartelën e studentit.",
      bodyEn: "Notebooks, scientific calculators and office supplies at a discount with your student card.",
      cta: "Shiko ofertën",
      ctaEn: "See the offer",
      url: "https://example.com/etc-studentet",
    }],
  },
];

export const BADGES = [
  { code: "verified", name: "I verifikuar", nameEn: "Verified", description: "Email institucional i konfirmuar.", descriptionEn: "Institutional email confirmed.", icon: "badge-check" },
  { code: "founder", name: "Themelues", nameEn: "Founder", description: "Nga 500 përdoruesit e parë të platformës.", descriptionEn: "One of the first 500 people here.", icon: "flag" },
  { code: "pioneer", name: "Pionier i fakultetit", nameEn: "Faculty pioneer", description: "Përdoruesi i parë nga një fakultet i ri.", descriptionEn: "The first person from a new faculty.", icon: "compass" },
  { code: "first_material", name: "I pari me material", nameEn: "First to upload", description: "Ngarkove materialin e parë për një lëndë.", descriptionEn: "You uploaded the first material for a course.", icon: "upload" },
  { code: "archivist", name: "Arkivist", nameEn: "Archivist", description: "25 materiale të miratuara.", descriptionEn: "25 approved materials.", icon: "library" },
  { code: "golden_contributor", name: "Kontribues i artë", nameEn: "Golden contributor", description: "50 materiale të miratuara.", descriptionEn: "50 approved materials.", icon: "award" },
  { code: "savior", name: "Shpëtimtar", nameEn: "Lifesaver", description: "10 përgjigje të pranuara.", descriptionEn: "10 accepted answers.", icon: "life-buoy" },
  { code: "course_leader", name: "Lider i lëndës", nameEn: "Course leader", description: "Kontributi më i vlerësuar në një lëndë këtë semestër.", descriptionEn: "The most valued contribution in a course this semester.", icon: "crown" },
  { code: "ambassador", name: "Ambasador", nameEn: "Ambassador", description: "10 ftesa të suksesshme.", descriptionEn: "10 successful invites.", icon: "users" },
  { code: "night_owl", name: "Zog nate", nameEn: "Night owl", description: "20 kontribute pas mesnate.", descriptionEn: "20 contributions after midnight.", icon: "moon" },
  { code: "streak_30", name: "Tridhjetë ditë rresht", nameEn: "Thirty days running", description: "Një muaj i tërë pa e humbur ditën.", descriptionEn: "A whole month without missing a day.", icon: "flame" },
  { code: "helper", name: "Ndihmës", nameEn: "Helper", description: "50 përgjigje të dobishme.", descriptionEn: "50 helpful answers.", icon: "hand-heart" },
  { code: "organizer", name: "Organizator", nameEn: "Organizer", description: "5 evente të mbajtura me sukses.", descriptionEn: "5 events held successfully.", icon: "calendar-check" },
  { code: "pro_supporter", name: "Mbështetës", nameEn: "Supporter", description: "Abonim Pro i paguar, që e mban platformën gjallë.", descriptionEn: "A paid Pro subscription that keeps this place running.", icon: "heart" },
  { code: "translator", name: "Përkthyes", nameEn: "Translator", description: "Ndihmove me përkthimin e platformës.", descriptionEn: "You helped translate the platform.", icon: "languages" },
];

export const PLANS = [
  { code: "monthly", months: 1, priceCents: 299, sortOrder: 1 },
  { code: "semester", months: 5, priceCents: 999, sortOrder: 2 },
  { code: "yearly", months: 12, priceCents: 1799, sortOrder: 3 },
];
