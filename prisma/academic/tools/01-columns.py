"""Ndërton katalogun akademik nga lista zyrtare e AKA-së për 2026/27.

Rreshtat e programeve nxirren me koordinata, sepse teksti i rrafshuar i përzien
kolonat. Emrat e gjatë të programeve thyhen në disa rreshta te PDF-ja, prandaj
rreshtat pa datë bashkohen me rreshtin që vjen pas tyre.

Kufijtë e grupeve vijnë nga numërimi, që rindizet te çdo institucion ose fakultet.
Emri i grupit nuk merret me hamendje: blloqet janë lexuar një nga një dhe harta
poshtë e thotë cili bllok i takon kujt. Kështu asnjë program nuk përfundon te
fakulteti i gabuar.
"""
import io
import json
import re

import pypdf

COLUMNS = [
    ("institution", 0, 300),
    ("nr", 300, 340),
    ("program_sq", 340, 600),
    ("program_en", 600, 860),
    ("campus", 860, 905),
    ("level", 905, 960),
    ("ects", 960, 1010),
    ("quota", 1010, 1060),
    ("until", 1060, 1200),
]

# Blloqet janë lexuar një nga një nga dokumenti; secili njihet nga programi i tij
# i parë, që është i qëndrueshëm edhe kur numri i rreshtave ndryshon.
BLOCKS = {
    0: ("up", "filozofik"),
    1: ("up", "fshmn"),
    2: ("up", "filologji"),
    3: ("up", "juridik"),
    4: ("up", "ekonomik"),
    5: ("up", "ndertimore"),
    6: ("up", "fiek"),
    7: ("up", "mekanike"),
    8: ("up", "mjekesi"),
    9: ("up", "arte"),
    10: ("up", "bujqesi"),
    11: ("up", "edukim-fizik"),
    12: ("up", "edukim"),
    13: ("up", "arkitekture"),
    15: ("haxhi-zeka", None),
    16: ("isa-boletini", None),
    17: ("ushaf", None),
    18: ("kadri-zeka", None),
    19: ("fehmi-agani", None),
    23: ("ubt", None),
    24: ("ubt", None),
    25: ("ubt", None),
    26: ("aab", None),
    27: ("rit", None),
    36: ("rezonanca", None),
    37: ("heimerer", None),
    43: ("fama", None),
}

# Kontroll: programi i parë i secilit bllok duhet të jetë ky. Nëse dokumenti
# ndryshon, seed-i ndalet me gabim në vend që të mbjellë të dhëna të gabuara.
BLOCK_ANCHORS = {
    0: "Antropologji dhe trashëgimi kulturore, BA",
    1: "Matematikë, BSc",
    2: "Letërsi Shqipe, BA",
    3: "Juridik, LLB",
    5: "Gjeodezi, BSc",
    6: "Elektroenergjetikë, BSc",
    8: "Infermieri, BSc",
    10: "Ekonomi e Bujqësisë, BSc",
    13: "Arkitekturë, BSc",
    15: "Art Performues, BA",
    18: "Marrëdhënie Ndërkombëtare dhe Studime Europiane, BA",
    23: "Muzika Moderne, Prodhimi Digjital dhe Menaxhimi, BA",
    26: "Dizajn Grafik dhe Arte Vizuele, BA",
    27: "Informatikë dhe Teknologjitë Informative, BSc",
    36: "Biokimi Laboratorike, BSc",
    37: "Ergoterapi, BSc",
    43: "Juridik i Përgjithshëm, LLB",
}



# Trembëdhjetë emra thyhen keq te PDF-ja, sepse vazhdimi i tyre bie në të njëjtën
# lartësi me numrin e rreshtit pasues. Janë lexuar një nga një te dokumenti dhe
# rregullohen këtu, me emrin e plotë ashtu si e shkruan AKA-ja.
NAME_FIXES = {
    "Kimi, BSc Biologji, MSc (me 2 specializime 1. Botanikë": "Biologji, MSc (me 2 specializime: 1. Botanikë, 2. Zoologji)",
    "2. Zoologji)": None,
    "(në Gjuhën Angleze), BSc": "Ekonomi e Aplikuar dhe Menaxhment (në Gjuhën Angleze), BSc",
    "Komunikacion Rrugor, MSc Termoenergjetika dhe Energjia e Ripërtërishme, MSc (me 2": "Termoenergjetika dhe Energjia e Ripërtërishme, MSc (me 2 specializime)",
    "specializime)": None,
    "MMus": "Master i Muzikës në Kompozim (me specializim në Kompozim), MMus",
    "(Program i përbashkët/ Doktoratë e dyfishtë)": "Doktoratë në Shkencat e Edukimit (Program i përbashkët, doktoratë e dyfishtë)",
    "Teknologji Ushqimore, BSc Menaxhim Biznesi, (në Gjuhën Shqipe dhe Boshnjake), BSc, me": "Menaxhim Biznesi (në Gjuhën Shqipe dhe Boshnjake), BSc, me specializime: 1. Banka dhe Financa, 2. Administrim Biznesi",
    "specializime: 1. Menaxhim Biznesi, 2. Banka dhe Financa": None,
    "Inxhinieri dhe Tekonologji Ushqimore, BSc Teknologji, BSc (Me specializime 1. Inxhinieri Mjedisore dhe 2.": "Teknologji, BSc (me specializime: 1. Inxhinieri Mjedisore, 2. Inxhinieri Kimike)",
    "Juridik, LLB Teknologji, MSc (me specializim Inxhinieri e Mbrojtjes": "Teknologji, MSc (me specializim: Inxhinieri e Mbrojtjes së Mjedisit)",
    "Shkencat e Sportit dhe Lëvizjes, BSc Shkencat e Ushqimit dhe Bioteknologji, BSc, me specializimet:": "Shkencat e Ushqimit dhe Bioteknologji, BSc, me specializime: 1. Teknologjia e Ushqimit, 2. Nutricion",
    "1. Teknologjia e Uhqimit, 2. Nutricion": None,
    "Kreativ)": None,
    "3 specializime) Inxhinieria e Trafikut dhe Transportit, Ba": "Inxhinieria e Trafikut dhe Transportit, BA",
}


# Rregullime të dyta: rreshta që PDF-ja i bashkoi ose i preu. Secili është
# krahasuar me dokumentin, dhe aty ku rreshti ishte vetëm vazhdim teksti, hiqet.
NAME_FIXES_2 = {
    "Dizajn Grafik, Bachelor profesional Gjuhë Gjermane, Përkthim dhe Interpretim, Bachelor": "Dizajn Grafik, Bachelor profesional",
    "Logopedi, Bachelor Profesional Marketing Digjital dhe Inteligëncë Artificiale, Bachelor": "Logopedi, Bachelor profesional",
    "boshnjake), MSc": "Menaxhimi i Marketingut Turistik (gjuhë shqipe dhe gjuhë boshnjake), MSc",
    "Ekonomi e Pergjithshme, BA KAA | Student’s Center, 2nd floor, 10000 Prishtinë. | Tel. +383 38 200 65 753 | https://akreditimi.rks-gov.net/": "Ekonomi e Përgjithshëme, BA",
    "Ekologji e Aplikuar ne Agrobiznes, BSc Menaxhim në Turizëm dhe Hotelieri (Gjuhë Shqipe dhe Gjuhë": "Menaxhim në Turizëm dhe Hotelieri (Gjuhë Shqipe dhe Gjuhë Boshnjake), BSc",
    "Boshnjake)": None,
    "boshnjake)": None,
    "specializim ne 1. Banka dhe Financa dhe 2. Administrim Biznesi": None,
    "Menaxhim Mjedisi, MSc Menaxhimi i Marketingut Turistik (gjuhe shqipe dhe gjuhe": "Menaxhimi i Marketingut Turistik (gjuhë shqipe dhe gjuhë boshnjake), MSc",
    "Inxhinieri Kimike)": None,
    "Mjedisore)": None,
    "Biznes dhe Menaxhment, Bsc (Me specializime 1. Banka,": "Biznes dhe Menaxhment, BSc (me specializime: 1. Banka, 2. Menaxhment)",
    "Teknologji, MSc (me specializim: Inxhinieri e Mbrojtjes së Mjedisit)": "Teknologji, MSc (me specializim: Inxhinieri e Mbrojtjes Mjedisore)",
    "E Drejta Penale, LLM Të Drejtat e Njeriut, E Drejtë Penale Ndërkombëtare dhe": "Të Drejtat e Njeriut, E Drejtë Penale Ndërkombëtare dhe Krahasuese, LLM",
    "Studime të Avancuara Evropiane, LLM Ekonomi e Aplikuar dhe Menaxhment": "Ekonomi e Aplikuar dhe Menaxhment, MSc",
    "Punë Sociale, BA Shkencë Politike: a) Marrëdhënie Ndërkombëtare dhe": "Shkencë Politike (Marrëdhënie Ndërkombëtare dhe Diplomaci, Administrim Publik), BA",
    "Master i Muzikës në Performim (me 5 specializime) Master i Muzikës në Kompozim (me specializim në Kompozim),": "Master i Muzikës në Performim (me 5 specializime), MMus",
    "Ekonomi e Pergjithshme, BA KAA | Student’s Center, 2nd floor, 10000 Prishtinë. | Tel. +383 38 213 -200 | www.akreditimi-ks.org": "Ekonomi e Përgjithshme, BA",
    "Fizioterapi dhe Mjekësi Sportive, MSc Shkencat Shëndetësore për Profile Terapeutike - Logopedi dhe": "Shkencat Shëndetësore për Profile Terapeutike (Logopedi dhe Ergoterapi), BSc",
    "Psikologji, BSc Shkencat Shëndetësore për Profile Diagnostike - Teknik": "Shkencat Shëndetësore për Profile Diagnostike (Teknik Laboratori), BSc",
    "Shkencat e Sportit dhe Lëvizjes, BSc Shkencat e Ushqimit dhe Bioteknologji, BSc, me specializimet: 1. Teknologjia e Uhqimit, 2. Nutricion": "Shkencat e Ushqimit dhe Bioteknologji, BSc (me 2 specializime)",
}

# Rreshta ku PDF-ja e humbi nivelin e saktë.
LEVEL_FIXES = {
    "Biologji, MSc (me 2 specializime: 1. Botanikë, 2. Zoologji)": "MSc",
    "Teknologji, MSc (me specializim: Inxhinieri e Mbrojtjes Mjedisore)": "MSc",
    "Të Drejtat e Njeriut, E Drejtë Penale Ndërkombëtare dhe Krahasuese, LLM": "LLM",
    "Ekonomi e Aplikuar dhe Menaxhment, MSc": "MSc",
    "Menaxhimi i Marketingut Turistik (gjuhë shqipe dhe gjuhë boshnjake), MSc": "MSc",
}

# Dy rreshta të AAB-së e humbin fare emrin te PDF-ja, sepse fjala e fundit bie
# në rreshtin tjetër dhe e para shkon te rreshti para tyre. Emrat e plotë janë
# lexuar te dokumenti dhe vendosen sipas numrit të rreshtit.
NAME_BY_NR = {
    ("aab", "16"): "Gjuhë Gjermane, Përkthim dhe Interpretim, Bachelor profesional",
    ("aab", "17"): "Logopedi, Bachelor profesional",
    ("aab", "18"): "Marketing Digjital dhe Inteligjencë Artificiale, Bachelor profesional",
}


def column_of(x: float):
    for name, start, end in COLUMNS:
        if start <= x < end:
            return name
    return None


reader = pypdf.PdfReader("kaa-2026.pdf")
rows: list[dict] = []

for page_index, page in enumerate(reader.pages):
    words: list[tuple[float, float, str]] = []

    def visitor(text, cm, tm, font_dict, font_size):
        value = (text or "").strip()
        if value:
            words.append((tm[4], tm[5], value))

    page.extract_text(visitor_text=visitor)

    lines: dict[int, dict[str, list[str]]] = {}
    for x, y, value in words:
        name = column_of(x)
        if name:
            lines.setdefault(round(y / 4), {}).setdefault(name, []).append(value)

    # Një program nis aty ku shfaqet numri i tij; çdo rresht pas tij, deri te
    # numri tjetër, është vazhdim i të njëjtit program.
    current: dict | None = None

    for key in sorted(lines, reverse=True):
        cells = {name: " ".join(parts).strip() for name, parts in lines[key].items()}

        number = cells.get("nr", "")
        if number.isdigit():
            if current:
                rows.append(current)
            current = {
                "nr": number,
                "name": cells.get("program_sq", ""),
                "nameEn": cells.get("program_en", ""),
                "campus": cells.get("campus", ""),
                "level": cells.get("level", ""),
                "ects": cells.get("ects", ""),
                "quota": cells.get("quota", ""),
                "until": cells.get("until", ""),
                "page": page_index + 1,
            }
            continue

        if not current:
            continue

        # Vazhdimet e emrit dhe qelizat që u vizatuan pak më poshtë.
        if cells.get("program_sq"):
            current["name"] = f"{current['name']} {cells['program_sq']}".strip()
        if cells.get("program_en"):
            current["nameEn"] = f"{current['nameEn']} {cells['program_en']}".strip()
        for field in ("campus", "level", "ects", "quota", "until"):
            if not current[field] and cells.get(field):
                current[field] = cells[field]

    if current:
        rows.append(current)

rows = [row for row in rows if row.get("until") and "-" in row["until"]]
for row in rows:
    row["name"] = re.sub(r"\s+", " ", row["name"]).strip()
    row["nameEn"] = re.sub(r"\s+", " ", row["nameEn"]).strip()

# Blloqet sipas numërimit.
blocks: list[list[dict]] = []
previous = 0
for row in rows:
    number = int(row["nr"]) if row["nr"].isdigit() else previous + 1
    if number <= previous or not blocks:
        blocks.append([])
    blocks[-1].append(row)
    previous = number

for index, expected in BLOCK_ANCHORS.items():
    found = blocks[index][0]["name"] if index < len(blocks) else "(mungon)"
    if found != expected:
        raise SystemExit(f"Blloku {index} pritej të niste me «{expected}», por nis me «{found}».")

# Blloqet e papastruara, sipas indeksit: prej tyre merret vetëm emri anglisht.
io.open("catalog-coords.json", "w", encoding="utf-8").write(
    json.dumps({str(i): b for i, b in enumerate(blocks)}, ensure_ascii=False, indent=1)
)

# Rregullimet e emrave, dhe heqja e rreshtave që janë vetëm vazhdim teksti.
cleaned: list[dict] = []
for row in rows:
    for table in (NAME_FIXES, NAME_FIXES_2):
        if row["name"] in table:
            replacement = table[row["name"]]
            if replacement is None:
                row["name"] = ""
                break
            row["name"] = replacement

    if not row["name"]:
        continue

    if row["name"] in LEVEL_FIXES:
        row["level"] = LEVEL_FIXES[row["name"]]

    cleaned.append(row)
rows = cleaned

blocks = []
previous = 0
for row in rows:
    number = int(row["nr"]) if row["nr"].isdigit() else previous + 1
    if number <= previous or not blocks:
        blocks.append([])
    blocks[-1].append(row)
    previous = number

catalog: dict[str, list[dict]] = {}
for index, block in enumerate(blocks):
    mapping = BLOCKS.get(index)
    if not mapping:
        continue
    institution, faculty = mapping
    for row in block:
        row["faculty"] = faculty
        catalog.setdefault(institution, []).append(row)

for institution, items in catalog.items():
    for row in items:
        fixed = NAME_BY_NR.get((institution, row["nr"]))
        if fixed:
            row["name"] = fixed

io.open("catalog.json", "w", encoding="utf-8").write(json.dumps(catalog, ensure_ascii=False, indent=1))

print("institucione:", len(catalog))
for key, items in catalog.items():
    empty = sum(1 for item in items if not item["name"])
    print(f"{len(items):4d}  {key}{'  (pa emër: %d)' % empty if empty else ''}")
