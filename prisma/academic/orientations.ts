/**
 * Drejtimet brenda programeve, nga faqet zyrtare të institucioneve.
 *
 * Lista e AKA-së i numëron drejtimet («me 5 specializime») por shpesh nuk i
 * emërton. Emrat e vërtetë i publikon vetë institucioni, prandaj rrinë këtu, me
 * burimin përkrah. Asnjë drejtim nuk shtohet pa e parë te faqja zyrtare: kur
 * institucioni nuk i publikon, programi mbetet pa drejtime dhe studenti e lë bosh.
 */

export type OrientationSeed = {
  /** Institucioni, sipas slug-ut te katalogu. */
  institution: string;
  /** Slug-u i programit, ashtu si e krijon katalogu. */
  program: string;
  /** Niveli i programit, që i njëjti emër te bachelor dhe master të mos përzihet. */
  level: string;
  source: string;
  verifiedAt: string;
  items: { name: string; nameEn: string; slug: string }[];
};

export const ORIENTATIONS: OrientationSeed[] = [
  {
    institution: "ubt",
    program: "shkenca-kompjuterike-dhe-inxhinieri",
    level: "bachelor",
    source: "ubt-uni.net, Computer Science and Engineering",
    verifiedAt: "2026-09-21",
    items: [
      { name: "Inxhinieri e Sistemeve Softuerike", nameEn: "Software Systems Engineering", slug: "inxhinieri-e-sistemeve-softuerike" },
      { name: "Sisteme të Bazave të të Dhënave", nameEn: "Database Systems", slug: "sisteme-te-bazave-te-te-dhenave" },
      { name: "Grafikë Kompjuterike dhe Multimedia", nameEn: "Computer Graphics and Multimedia", slug: "grafike-kompjuterike-dhe-multimedia" },
      { name: "Rrjeta dhe Telekomunikacion", nameEn: "Networks and Telecommunications", slug: "rrjeta-dhe-telekomunikacion" },
      { name: "Programim Web", nameEn: "Web Programming", slug: "programim-web" },
      { name: "Robotikë dhe Sisteme Inteligjente", nameEn: "Robotics and Intelligent Systems", slug: "robotike-dhe-sisteme-inteligjente" },
      { name: "Bioinformatikë", nameEn: "Bioinformatics", slug: "bioinformatike" },
      { name: "Siguri e Informacionit", nameEn: "Information Security", slug: "siguri-e-informacionit" },
    ],
  },
  {
    institution: "ubt",
    program: "menaxhment-biznes-dhe-ekonomi",
    level: "bachelor",
    source: "ubt-uni.net, Management, Business and Economics",
    verifiedAt: "2026-09-21",
    items: [
      { name: "Menaxhment, Ndërmarrësi dhe Inovacion", nameEn: "Management, Entrepreneurship and Innovation", slug: "menaxhment-ndermarresi-dhe-inovacion" },
      { name: "Marketing dhe Shitje", nameEn: "Marketing and Sales", slug: "marketing-dhe-shitje" },
      { name: "Kontabilitet, Auditim dhe Tatime", nameEn: "Accounting, Auditing and Taxation", slug: "kontabilitet-auditim-dhe-tatime" },
      { name: "Financa, Banka dhe Sigurime", nameEn: "Finance, Banking and Insurance", slug: "financa-banka-dhe-sigurime" },
      { name: "Biznes Ndërkombëtar", nameEn: "International Business", slug: "biznes-nderkombetar" },
    ],
  },
];

/**
 * Programet që lista zyrtare i shënon «me N specializime» pa i emërtuar, dhe që
 * institucioni nuk i publikon askund të ndara. Mbeten pa drejtime, me qëllim.
 * Kjo listë ekziston që mospërmbushja të jetë e dukshme, jo e fshehur.
 */
export const UNVERIFIED_ORIENTATIONS = [
  "UP, Artet Vizuale (BA dhe MA), 6 specializime",
  "UP, Artet Dramatike (BA dhe MA), 7 specializime",
  "UP, Bachelor i Muzikës në Performim, 5 specializime",
  "UP, Master i Muzikës në Performim, 5 specializime",
  "UP, Master i Shkencave të Edukimit, 4 specializime",
  "UP, Master i Mësimdhënies Lëndore, 7 specializime",
  "UP, Arkitekturë MSc, 5 specializime",
  "UP, Termoenergjetika dhe Energjia e Ripërtërishme MSc, 2 specializime",
  "AAB, Administratë Publike, 2 specializime",
  "AAB, Biznes Digjital, 2 specializime",
  "AAB, Kompjuterikë dhe FinTech, 2 specializime",
];
