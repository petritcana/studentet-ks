# -*- coding: utf-8 -*-
"""Shkruan prisma/academic/catalog.ts nga catalog-final.json."""
import io
import json
import re
import unicodedata

DATA = json.load(io.open("catalog-final.json", encoding="utf-8"))
OUT = "../catalog.ts"

HEADER = '''// Katalogu akademik i Kosovës, i gjeneruar nga lista zyrtare e programeve të
// akredituara e Agjencisë së Kosovës për Akreditim për vitin 2026/27.
//
// Burimi: Agjencia e Kosovës për Akreditim, «Programet e akredituara 2026/27».
// Emrat shqip lexohen nga vetë rreshtat e dokumentit, emrat anglisht nga kolona
// e dytë. Specializimet shtohen vetëm kur dokumenti i emërton; kur thotë vetëm
// «me 3 specializime», nuk shpikim emra.
//
// Hierarkia ndjek institucionin: universitetet publike kanë fakultete, kolegjet
// private jo. Fakultetet e universiteteve publike jashtë Prishtinës nuk i jep
// lista e AKA-së, prandaj janë marrë nga faqet e vetë universiteteve.
//
// Mos e ndrysho me dorë: rigjenerohet kur AKA-ja publikon listën e re.

import type { InstitutionSeed } from "./types";

export const ACADEMIC_YEAR = "2026/27";
export const CATALOG_SOURCE = "Agjencia e Kosovës për Akreditim, lista 2026/27";
export const CATALOG_VERIFIED_AT = "2026-09-22";

export const INSTITUTIONS: InstitutionSeed[] = '''


def plain(value: str) -> str:
    """Vizat e gjata bëhen të thjeshta: rregulli i projektit nuk bën përjashtim."""
    return value.replace("—", "-").replace("–", "-")


def slugify(value: str) -> str:
    value = value.lower().replace("ë", "e").replace("ç", "c")
    value = unicodedata.normalize("NFD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:60] or "x"


institutions = []
for item in DATA:
    campuses = [
        {"name": name, "nameEn": name, "slug": slugify(name), "city": name}
        for name in item["campuses"]
    ]

    programs = []
    for program in item["programs"]:
        entry = {
            "name": plain(program["name"]),
            "nameEn": plain(program["nameEn"]),
            "slug": program["slug"],
            "level": program["level"],
        }
        if program.get("degreeTitle"):
            entry["degreeTitle"] = program["degreeTitle"]
        if program.get("faculty"):
            entry["faculty"] = program["faculty"]
        if program.get("campus") and len(campuses) > 1:
            entry["campuses"] = [program["campus"]]
        if program.get("ects"):
            entry["ects"] = program["ects"]
        if program.get("specializations"):
            entry["specializations"] = program["specializations"]
        if program.get("accreditationUntil"):
            entry["accreditationUntil"] = program["accreditationUntil"]
        programs.append(entry)

    institutions.append(
        {
            "slug": item["slug"],
            "name": item["name"],
            "nameEn": item["nameEn"],
            "abbr": item["abbr"],
            "city": item["city"],
            "type": item["type"],
            "website": item["website"],
            "emailDomains": item["emailDomains"],
            "campuses": campuses,
            "faculties": item["faculties"],
            "programs": programs,
        }
    )

body = json.dumps(institutions, ensure_ascii=False, indent=2)
io.open(OUT, "w", encoding="utf-8").write(f"{HEADER}{body};\n")

print("shkrova", OUT)
print(
    "institucione:", len(institutions),
    "| programe:", sum(len(i["programs"]) for i in institutions),
    "| fakultete:", sum(len(i["faculties"]) for i in institutions),
)
