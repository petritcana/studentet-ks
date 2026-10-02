/**
 * Vendbanimet e Kosovës.
 *
 * Lista nis me të 38 komunat dhe vazhdon me qytezat dhe fshatrat e mëdhenj që
 * studentët i thonë vërtet kur i pyet «nga je». Pa këtë, një student nga Zhegra
 * ose nga Bresalca do të detyrohej të shkruante Gjilan, dhe lidhja me vendlindjen
 * do të humbiste. Çdo zë mban komunën, që dy vende me emër të ngjashëm të mos
 * përzihen.
 */

export type Place = {
  name: string;
  /** Komuna ku bie vendbanimi. Te vetë komunat përsëritet emri. */
  municipality: string;
};

export const KOSOVO_PLACES: Place[] = [
  // Komunat
  { name: "Prishtinë", municipality: "Prishtinë" },
  { name: "Prizren", municipality: "Prizren" },
  { name: "Ferizaj", municipality: "Ferizaj" },
  { name: "Pejë", municipality: "Pejë" },
  { name: "Gjakovë", municipality: "Gjakovë" },
  { name: "Gjilan", municipality: "Gjilan" },
  { name: "Mitrovicë", municipality: "Mitrovicë" },
  { name: "Mitrovicë e Veriut", municipality: "Mitrovicë e Veriut" },
  { name: "Podujevë", municipality: "Podujevë" },
  { name: "Vushtrri", municipality: "Vushtrri" },
  { name: "Suharekë", municipality: "Suharekë" },
  { name: "Rahovec", municipality: "Rahovec" },
  { name: "Drenas", municipality: "Drenas" },
  { name: "Lipjan", municipality: "Lipjan" },
  { name: "Malishevë", municipality: "Malishevë" },
  { name: "Kamenicë", municipality: "Kamenicë" },
  { name: "Viti", municipality: "Viti" },
  { name: "Deçan", municipality: "Deçan" },
  { name: "Istog", municipality: "Istog" },
  { name: "Klinë", municipality: "Klinë" },
  { name: "Skenderaj", municipality: "Skenderaj" },
  { name: "Fushë Kosovë", municipality: "Fushë Kosovë" },
  { name: "Obiliq", municipality: "Obiliq" },
  { name: "Kaçanik", municipality: "Kaçanik" },
  { name: "Hani i Elezit", municipality: "Hani i Elezit" },
  { name: "Shtime", municipality: "Shtime" },
  { name: "Dragash", municipality: "Dragash" },
  { name: "Shtërpcë", municipality: "Shtërpcë" },
  { name: "Graçanicë", municipality: "Graçanicë" },
  { name: "Novobërdë", municipality: "Novobërdë" },
  { name: "Junik", municipality: "Junik" },
  { name: "Mamushë", municipality: "Mamushë" },
  { name: "Kllokot", municipality: "Kllokot" },
  { name: "Partesh", municipality: "Partesh" },
  { name: "Ranillug", municipality: "Ranillug" },
  { name: "Leposaviq", municipality: "Leposaviq" },
  { name: "Zubin Potok", municipality: "Zubin Potok" },
  { name: "Zveçan", municipality: "Zveçan" },

  // Qyteza dhe fshatra të mëdhenj
  { name: "Besianë", municipality: "Podujevë" },
  { name: "Bresalc", municipality: "Gjilan" },
  { name: "Zhegër", municipality: "Gjilan" },
  { name: "Livoç i Epërm", municipality: "Gjilan" },
  { name: "Cërnicë", municipality: "Gjilan" },
  { name: "Velekincë", municipality: "Gjilan" },
  { name: "Përlepnicë", municipality: "Gjilan" },
  { name: "Stanishor", municipality: "Novobërdë" },
  { name: "Hajvali", municipality: "Prishtinë" },
  { name: "Matiçan", municipality: "Prishtinë" },
  { name: "Bërnicë", municipality: "Prishtinë" },
  { name: "Besi", municipality: "Prishtinë" },
  { name: "Keqekollë", municipality: "Prishtinë" },
  { name: "Barilevë", municipality: "Prishtinë" },
  { name: "Çagllavicë", municipality: "Graçanicë" },
  { name: "Llapllasellë", municipality: "Graçanicë" },
  { name: "Miradi e Epërme", municipality: "Fushë Kosovë" },
  { name: "Kuzmin", municipality: "Fushë Kosovë" },
  { name: "Milloshevë", municipality: "Obiliq" },
  { name: "Plemetin", municipality: "Obiliq" },
  { name: "Shipol", municipality: "Mitrovicë" },
  { name: "Vaganicë", municipality: "Mitrovicë" },
  { name: "Bare", municipality: "Mitrovicë" },
  { name: "Runik", municipality: "Skenderaj" },
  { name: "Prekaz", municipality: "Skenderaj" },
  { name: "Turiçec", municipality: "Skenderaj" },
  { name: "Likoshan", municipality: "Drenas" },
  { name: "Komoran", municipality: "Drenas" },
  { name: "Krajkovë", municipality: "Drenas" },
  { name: "Smrekonicë", municipality: "Vushtrri" },
  { name: "Sllakoc", municipality: "Vushtrri" },
  { name: "Dumnicë", municipality: "Vushtrri" },
  { name: "Sibovc", municipality: "Obiliq" },
  { name: "Shtimje", municipality: "Shtime" },
  { name: "Godanc", municipality: "Shtime" },
  { name: "Gadime", municipality: "Lipjan" },
  { name: "Janjevë", municipality: "Lipjan" },
  { name: "Magure", municipality: "Lipjan" },
  { name: "Shalë", municipality: "Lipjan" },
  { name: "Nerodime", municipality: "Ferizaj" },
  { name: "Talinoc", municipality: "Ferizaj" },
  { name: "Greme", municipality: "Ferizaj" },
  { name: "Doganaj", municipality: "Kaçanik" },
  { name: "Stagovë", municipality: "Kaçanik" },
  { name: "Bibaj", municipality: "Ferizaj" },
  { name: "Brezovicë", municipality: "Shtërpcë" },
  { name: "Viti i Vjetër", municipality: "Viti" },
  { name: "Smirë", municipality: "Viti" },
  { name: "Pozheran", municipality: "Viti" },
  { name: "Sadovinë", municipality: "Viti" },
  { name: "Hogosht", municipality: "Kamenicë" },
  { name: "Koretin", municipality: "Kamenicë" },
  { name: "Rogoçicë", municipality: "Kamenicë" },
  { name: "Krushë e Madhe", municipality: "Rahovec" },
  { name: "Xërxë", municipality: "Rahovec" },
  { name: "Ratkoc", municipality: "Rahovec" },
  { name: "Therandë", municipality: "Suharekë" },
  { name: "Bllacë", municipality: "Suharekë" },
  { name: "Mushtisht", municipality: "Suharekë" },
  { name: "Reçan", municipality: "Prizren" },
  { name: "Zhur", municipality: "Prizren" },
  { name: "Lubizhdë", municipality: "Prizren" },
  { name: "Korishë", municipality: "Prizren" },
  { name: "Vërmicë", municipality: "Prizren" },
  { name: "Krushë e Vogël", municipality: "Prizren" },
  { name: "Brod", municipality: "Dragash" },
  { name: "Restelicë", municipality: "Dragash" },
  { name: "Kukaj", municipality: "Malishevë" },
  { name: "Kijevë", municipality: "Klinë" },
  { name: "Gjurakoc", municipality: "Istog" },
  { name: "Banjë", municipality: "Istog" },
  { name: "Vrellë", municipality: "Istog" },
  { name: "Rakosh", municipality: "Istog" },
  { name: "Vitomiricë", municipality: "Pejë" },
  { name: "Goraždevc", municipality: "Pejë" },
  { name: "Zahaq", municipality: "Pejë" },
  { name: "Llozhan", municipality: "Pejë" },
  { name: "Isniq", municipality: "Deçan" },
  { name: "Strellc", municipality: "Deçan" },
  { name: "Prejlep", municipality: "Deçan" },
  { name: "Ponoshec", municipality: "Gjakovë" },
  { name: "Rracaj", municipality: "Gjakovë" },
  { name: "Brekoc", municipality: "Gjakovë" },
  { name: "Bec", municipality: "Gjakovë" },
  { name: "Batushë", municipality: "Gjakovë" },
  { name: "Llapushnik", municipality: "Drenas" },
  { name: "Sllatinë", municipality: "Fushë Kosovë" },
  { name: "Bellopojë", municipality: "Pejë" },
  { name: "Sharr", municipality: "Dragash" },
];

/** Kërkimi pa theks: «gjakove» e gjen «Gjakovë», «prishtina» e gjen «Prishtinë». */
export function normalizePlace(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .trim();
}

export function searchPlaces(query: string, limit = 12): Place[] {
  const needle = normalizePlace(query);
  if (!needle) return KOSOVO_PLACES.slice(0, limit);

  const starts: Place[] = [];
  const contains: Place[] = [];

  for (const place of KOSOVO_PLACES) {
    const name = normalizePlace(place.name);
    if (name.startsWith(needle)) starts.push(place);
    else if (name.includes(needle) || normalizePlace(place.municipality).includes(needle)) contains.push(place);
  }

  return [...starts, ...contains].slice(0, limit);
}

/**
 * Të 38 komunat e Kosovës, sipas alfabetit shqip. Përdoren te filtrat e qytetit
 * (Karriera, Tregu), ku studenti zgjedh qytetin, jo fshatin.
 */
export const KOSOVO_MUNICIPALITIES: string[] = KOSOVO_PLACES.filter((place) => place.name === place.municipality)
  .map((place) => place.name)
  .sort((a, b) => a.localeCompare(b, "sq"));
