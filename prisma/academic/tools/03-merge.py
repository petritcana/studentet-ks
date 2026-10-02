# -*- coding: utf-8 -*-
"""Bashkon dy leximet e së njëjtës tabelë.

Teksti i rrafshuar e ruan emrin e plotë shqip, sepse rreshti nis me numrin e vet
dhe mbyllet me datën. Leximi me koordinata i ndan kolonat, prandaj prej tij merret
emri anglisht. Ndarja shqip/anglisht brenda tekstit bëhet duke gjetur ku nis emri
anglisht, që e dimë tashmë nga kolona.

Rezultati: catalog.json me emra të plotë dhe pa dy programe të ngjitura në një.
"""
import io
import json
import re

COORD = json.load(io.open("catalog-coords.json", encoding="utf-8"))
TEXT = json.load(io.open("text-rows.json", encoding="utf-8"))

# I njëjti rend blloqesh si te leximi me koordinata, i verifikuar bllok pas blloku.
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

ANCHORS = {
    0: "Antropologji dhe trashëgimi kulturore, BA",
    1: "Matematikë, BSc",
    2: "Letërsi Shqipe, BA",
    3: "Juridik, LLB",
    8: "Infermieri, BSc",
    10: "Ekonomi e Bujqësisë, BSc",
    13: "Arkitekturë, BSc",
    15: "Art Performues, BA",
    18: "Marrëdhënie Ndërkombëtare dhe Studime Europiane, BA",
    26: "Dizajn Grafik dhe Arte Vizuele, BA",
    27: "Informatikë dhe Teknologjitë Informative, BSc",
    36: "Biokimi Laboratorike, BSc",
    37: "Shkencat Shëndetësore për Profile Terapeutike - Logopedi dhe Ergoterapi, BSc",
    43: "Juridik i Përgjithshëm, LLB",
}

# Një rresht i vetëm nuk ndahet dot nga asnjë rregull: as shkurtesë niveli, as
# kllapë shqipe, dhe kolona angleze vjen e prerë. Emri është lexuar te dokumenti.
NAME_BY_NR = {
    ("up", "edukim", "8"): "Doktoratë në Shkencat e Edukimit (Program i përbashkët, doktoratë e dyfishtë)",
}

LEVEL_TOKEN = re.compile(
    r"\b(BSc|Bsc|BA|Ba|LLB|BMus|MSc|Msc|MA|Ma|LLM|MMus|MPh|PhD|Bachelor profesional|Bachelor Profesional|Bachelor Professional|Dr\. Dent|Dr\. Med|DMV)\b"
)


def split_names(head: str, name_en: str) -> tuple[str, str]:
    """Ndan emrin shqip nga ai anglisht.

    Emri shqip mbyllet gjithmonë me shkurtesën e nivelit, dhe pas saj mund të
    vijë një kllapë me drejtimet. Kolona angleze përdoret vetëm kur shkurtesa
    mungon, sepse ajo vetë ndonjëherë vjen e prerë nga PDF-ja.
    """
    # Disa emra e mbajnë shkurtesën pas anglishtes, dhe ndahen te kllapa shqipe:
    # «Master i Muzikës në Performim (me 5 specializime) Master of Music ...».
    albanian_paren = re.search(r"\(me\s[^)]*\)", head)
    level = LEVEL_TOKEN.search(head)
    # Kur shkurtesa ekziston, ajo e mbyll emrin, edhe nëse kllapa vjen para saj:
    # «Artet Dramatike (me 7 specializime), MA».
    if albanian_paren and not level:
        end = albanian_paren.end()
        return head[:end].strip(" ,"), head[end:].strip(" ,")

    match = level
    if match:
        end = match.end()
        while True:
            paren = re.match(r"\s*\([^)]*\)", head[end:])
            if not paren:
                break
            end += paren.end()
        return head[:end].strip(" ,"), head[end:].strip(" ,")

    words = [word for word in re.findall(r"[A-Za-z][\w'\-]*", name_en or "")][:3]
    for count in (2, 1):
        if len(words) < count:
            continue
        probe = r"\s+".join(re.escape(word) for word in words[:count])
        found = re.search(probe, head)
        if found and found.start() > 3:
            return head[: found.start()].strip(" ,"), head[found.start() :].strip(" ,")

    return head.strip(" ,"), ""


blocks: list[list[dict]] = []
previous = 0
for row in TEXT:
    number = int(row["nr"])
    if number <= previous or not blocks:
        blocks.append([])
    blocks[-1].append(row)
    previous = number

# Indeksi i kolonave ndan të njëjtët blloqe, prandaj emri anglisht merret prej tij.
coord_blocks: dict[int, dict[str, str]] = {}
for index, rows in COORD.items():
    coord_blocks[int(index)] = {row["nr"]: row["nameEn"] for row in rows}

catalog: dict[str, list[dict]] = {}
for index, block in enumerate(blocks):
    mapping = BLOCKS.get(index)
    if not mapping:
        continue
    institution, faculty = mapping
    by_nr = coord_blocks.get(index, {})

    for row in block:
        name, name_en = split_names(row["head"], by_nr.get(row["nr"], ""))
        name = NAME_BY_NR.get((institution, faculty or "", row["nr"]), name)
        catalog.setdefault(institution, []).append(
            {
                "nr": row["nr"],
                "name": name,
                "nameEn": name_en or name,
                "campus": row["campus"],
                "level": row["level"],
                "ects": row["ects"],
                "quota": row["quota"],
                "until": row["until"],
                "faculty": faculty,
            }
        )

for index, expected in ANCHORS.items():
    mapping = BLOCKS[index]
    found = next(
        (row["name"] for row in catalog.get(mapping[0], []) if row.get("faculty") == mapping[1]),
        "(mungon)",
    )
    if found != expected:
        raise SystemExit(f"Blloku {index}: pritej «{expected}», u gjet «{found}».")

io.open("catalog.json", "w", encoding="utf-8").write(json.dumps(catalog, ensure_ascii=False, indent=1))

print("institucione:", len(catalog), "| programe:", sum(len(v) for v in catalog.values()))
for key, items in catalog.items():
    print(f"  {len(items):3d}  {key}")
