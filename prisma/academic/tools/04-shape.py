"""Shkruan katalogun akademik si skedar TypeScript për seed-in.

Burimi është lista zyrtare e programeve të akredituara e AKA-së për 2026/27.
Nivelet, kampuset dhe specializimet nxirren nga vetë rreshtat; asgjë nuk shpiket:
kur programi thotë vetëm «me 3 specializime», specializimet nuk shtohen.
"""
import io
import json
import re
import unicodedata

from faculties import FACULTIES, PROGRAM_FACULTY

catalog = json.load(io.open("catalog.json", encoding="utf-8"))

LEVELS = {
    "BSc": "bachelor",
    "Bsc": "bachelor",
    "BA": "bachelor",
    "LLB": "bachelor",
    "BMus": "bachelor",
    "profesional": "professional_bachelor",
    "MSc": "master",
    "Msc": "master",
    "MA": "master",
    "LLM": "master",
    "MMus": "master",
    "MPh": "master",
    "PhD": "phd",
    "Dr. Dent": "integrated",
    "Dr. Med": "integrated",
    "DMV": "integrated",
}

INSTITUTIONS = {
    "up": {
        "name": 'Universiteti i Prishtinës "Hasan Prishtina"',
        "nameEn": 'University of Prishtina "Hasan Prishtina"',
        "abbr": "UP",
        "city": "Prishtinë",
        "type": "public",
        "website": "https://uni-pr.edu",
        "emailDomains": ["student.uni-pr.edu", "uni-pr.edu"],
    },
    "ubt": {
        "name": "Kolegji UBT",
        "nameEn": "UBT College",
        "abbr": "UBT",
        "city": "Prishtinë",
        "type": "private",
        "website": "https://www.ubt-uni.net",
        "emailDomains": ["ubt-uni.net"],
    },
    "aab": {
        "name": "Kolegji AAB",
        "nameEn": "AAB College",
        "abbr": "AAB",
        "city": "Prishtinë",
        "type": "private",
        "website": "https://aab-edu.net",
        "emailDomains": ["aab-edu.net"],
    },
    "rit": {
        "name": "Kolegji RIT Kosovo (A.U.K.)",
        "nameEn": "RIT Kosovo (A.U.K.)",
        "abbr": "RIT",
        "city": "Prishtinë",
        "type": "private",
        "website": "https://www.rit.edu/kosovo",
        "emailDomains": ["auk.org", "rit.edu"],
    },
    "heimerer": {
        "name": "Kolegji Heimerer",
        "nameEn": "Heimerer College",
        "abbr": "Heimerer",
        "city": "Prishtinë",
        "type": "private",
        "website": "https://kolegji-heimerer.eu",
        "emailDomains": ["kolegji-heimerer.eu"],
    },
    "rezonanca": {
        "name": "Kolegji AMECC Rezonanca",
        "nameEn": "AMECC Rezonanca College",
        "abbr": "Rezonanca",
        "city": "Prishtinë",
        "type": "private",
        "website": "https://rezonanca-rks.com",
        "emailDomains": ["rezonanca-rks.com"],
    },
    "fama": {
        "name": "Kolegji Internacional FAMA",
        "nameEn": "FAMA International College",
        "abbr": "FAMA",
        "city": "Prishtinë",
        "type": "private",
        "website": "https://fama-edu.org",
        "emailDomains": ["kolegjifama.eu", "fama-edu.org"],
    },
    "kadri-zeka": {
        "name": 'Universiteti Publik "Kadri Zeka", Gjilan',
        "nameEn": 'Public University "Kadri Zeka", Gjilan',
        "abbr": "UKZ",
        "city": "Gjilan",
        "type": "public",
        "website": "https://uni-gjilan.net",
        "emailDomains": ["uni-gjilan.net"],
    },
    "isa-boletini": {
        "name": 'Universiteti "Isa Boletini", Mitrovicë',
        "nameEn": 'University "Isa Boletini", Mitrovica',
        "abbr": "UMIB",
        "city": "Mitrovicë",
        "type": "public",
        "website": "https://umib.net",
        "emailDomains": ["umib.net"],
    },
    "ushaf": {
        "name": "Universiteti i Shkencave të Aplikuara në Ferizaj",
        "nameEn": "University of Applied Sciences in Ferizaj",
        "abbr": "UShAF",
        "city": "Ferizaj",
        "type": "public",
        "website": "https://ushaf.net",
        "emailDomains": ["ushaf.net"],
    },
    "haxhi-zeka": {
        "name": 'Universiteti "Haxhi Zeka", Pejë',
        "nameEn": 'University "Haxhi Zeka", Peja',
        "abbr": "UHZ",
        "city": "Pejë",
        "type": "public",
        "website": "https://unhz.eu",
        "emailDomains": ["unhz.eu"],
    },
    "fehmi-agani": {
        "name": 'Universiteti "Fehmi Agani", Gjakovë',
        "nameEn": 'University "Fehmi Agani", Gjakova',
        "abbr": "UFAGJ",
        "city": "Gjakovë",
        "type": "public",
        "website": "https://uni-gjk.org",
        "emailDomains": ["uni-gjk.org"],
    },
}

UP_FACULTIES: dict[str, tuple] = {
    "filozofik": ("Fakulteti Filozofik", "Faculty of Philosophy", "FIZ", "philosophy", "brain"),
    "fshmn": ("Fakulteti i Shkencave Matematike-Natyrore", "Faculty of Mathematics and Natural Sciences", "FSHMN", "science", "flask-conical"),
    "filologji": ("Fakulteti i Filologjisë", "Faculty of Philology", "FIL", "philology", "book-open"),
    "juridik": ("Fakulteti Juridik", "Faculty of Law", "JUR", "law", "scale"),
    "ekonomik": ("Fakulteti Ekonomik", "Faculty of Economics", "EKO", "economics", "trending-up"),
    "ndertimore": ("Fakulteti i Inxhinierisë Ndërtimore", "Faculty of Civil Engineering", "FIN", "architecture", "building-2"),
    "fiek": ("Fakulteti i Inxhinierisë Elektrike dhe Kompjuterike", "Faculty of Electrical and Computer Engineering", "FIEK", "electrical", "cpu"),
    "mekanike": ("Fakulteti i Inxhinierisë Mekanike", "Faculty of Mechanical Engineering", "FIM", "mechanical", "cog"),
    "mjekesi": ("Fakulteti i Mjekësisë", "Faculty of Medicine", "MJK", "medicine", "stethoscope"),
    "arte": ("Fakulteti i Arteve", "Faculty of Arts", "ART", "arts", "palette"),
    "bujqesi": ("Fakulteti i Bujqësisë dhe Veterinarisë", "Faculty of Agriculture and Veterinary", "FBV", "agriculture", "sprout"),
    "edukim-fizik": ("Fakulteti i Edukimit Fizik dhe i Sportit", "Faculty of Physical Education and Sport", "SPORT", "sport", "dumbbell"),
    "edukim": ("Fakulteti i Edukimit", "Faculty of Education", "EDU", "education", "graduation-cap"),
    "arkitekture": ("Fakulteti i Arkitekturës", "Faculty of Architecture", "ARK", "architecture", "building-2"),
}


ALL_FACULTIES = {**UP_FACULTIES, **FACULTIES}


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFD", value).encode("ascii", "ignore").decode("ascii")
    value = value.lower().replace("ë", "e").replace("ç", "c")
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:60] or "program"


def strip_suffix(name: str) -> str:
    """Heq shkurtesën e nivelit: «Ekonomiks, BSc» dhe «Teknologji, BSc (me ...)».

    Shkurtesa nuk i shton kuptim emrit te lista, sepse niveli ruhet veçmas, dhe
    te zgjedhësi studenti e sheh nivelin si hap më vete.
    """
    levels = r"BSc|Bsc|BA|LLB|BMus|MSc|Msc|MA|LLM|MMus|MPh|PhD|Dr\. Dent|Dr\. Med|DMV|Bachelor [Pp]rofesional|Bachelor [Pp]rofessional"
    cleaned = re.sub(rf",?\s*(?:{levels})\s*$", "", name.strip())
    cleaned = re.sub(rf",?\s*(?:{levels})\s*(?=\()", " ", cleaned)
    cleaned = re.sub(r"\s*,\s*\(", " (", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip(" ,")


LEVEL_ABBR = re.compile(
    r",?\s*(BSc|Bsc|BA|LLB|BMus|MSc|Msc|MA|LLM|MMus|MPh|PhD|Dr\. Dent|Dr\. Med|DMV|Bachelor Profesional|Bachelor profesional|Bachelor Professional)\s*(?=\(|$)"
)

# Shkrimi te dokumenti luhatet: «Bsc» dhe «BSc» janë e njëjta gjë.
ABBR_FIX = {
    "Bsc": "BSc",
    "Msc": "MSc",
    "Bachelor Profesional": "Bachelor profesional",
    "Bachelor Professional": "Bachelor profesional",
}


def degree_title(name: str) -> str | None:
    """Titulli si e shkruan lista: BSc, BA, LLB, MSc, LLM, PhD, Dr. Dent.

    Studenti e njeh programin nga kjo shkurtesë, jo nga fjala «bachelor». Te
    zgjedhësi ajo shfaqet nën emrin e programit, prandaj ruhet veçmas.
    """
    match = LEVEL_ABBR.search(name.strip())
    if not match:
        return None
    raw = match.group(1)
    return ABBR_FIX.get(raw, raw)


def specializations(name: str):
    """Nxjerr drejtimet vetëm kur janë shkruar me emër te vetë programi."""
    match = re.search(r"specializim(?:e|et|ime)?:?\s*(.+)$", name, re.IGNORECASE)
    if not match:
        return []

    tail = match.group(1)
    parts = re.findall(r"\d\.\s*([^,\)0-9]+)", tail)
    found = [part.strip(" .)") for part in parts if len(part.strip()) > 2]
    return [{"name": item, "nameEn": item, "slug": slugify(item)} for item in found]


out_institutions = []

for key, rows in catalog.items():
    meta = INSTITUTIONS[key]
    campuses = sorted({row["campus"].strip() for row in rows if row["campus"].strip()})
    faculties = sorted({row["faculty"] for row in rows if row.get("faculty")})

    for row in rows:
        if not row.get("faculty"):
            row["faculty"] = PROGRAM_FACULTY.get((key, row["nr"]))
    faculties = sorted({row["faculty"] for row in rows if row.get("faculty")})

    programs = []
    seen_slugs = set()

    for row in rows:
        # Shkurtesa te vetë emri është burimi më i besueshëm: kolona e nivelit
        # ndonjëherë e mban shkurtesën e rreshtit fqinj.
        suffix = re.search(
            r"(BSc|Bsc|BA|LLB|BMus|MSc|Msc|MA|LLM|MMus|MPh|PhD|Dr\. Dent|Dr\. Med|DMV)\s*(\(.*\))?\s*$",
            row["name"],
        )
        level = LEVELS.get(suffix.group(1)) if suffix else None
        if not level:
            level = LEVELS.get(row["level"].strip())
        if not level and "profesional" in row["name"].lower():
            level = "professional_bachelor"
        if not level:
            level = "bachelor"

        base_name = strip_suffix(row["name"])
        slug = slugify(base_name)
        # I njëjti program në degë të ndryshme është zë më vete.
        key_slug = f"{slug}:{level}:{row['campus'].strip()}"
        if key_slug in seen_slugs:
            continue
        seen_slugs.add(key_slug)

        program = {
            "name": base_name,
            "nameEn": strip_suffix(row["nameEn"]) or base_name,
            "slug": slug,
            "level": level,
            # Kur emri nuk e mban shkurtesën, ajo merret nga kolona e nivelit.
            "degreeTitle": degree_title(row["name"]) or ABBR_FIX.get(row["level"].strip(), row["level"].strip() or None),
            "ects": int(row["ects"]) if row["ects"].isdigit() else None,
            "campus": row["campus"].strip() or None,
            "faculty": row.get("faculty"),
            "accreditationUntil": row["until"],
            "specializations": specializations(row["name"]),
        }
        programs.append(program)

    out_institutions.append(
        {
            "slug": key,
            **meta,
            "campuses": campuses,
            "faculties": [
                {
                    "slug": faculty,
                    "name": ALL_FACULTIES[faculty][0],
                    "nameEn": ALL_FACULTIES[faculty][1],
                    "abbr": ALL_FACULTIES[faculty][2],
                    "color": ALL_FACULTIES[faculty][3],
                    "icon": ALL_FACULTIES[faculty][4],
                }
                for faculty in faculties
            ],
            "programs": programs,
        }
    )

io.open("catalog-final.json", "w", encoding="utf-8").write(json.dumps(out_institutions, ensure_ascii=False, indent=1))

total = sum(len(item["programs"]) for item in out_institutions)
with_spec = sum(1 for item in out_institutions for program in item["programs"] if program["specializations"])
print("institucione:", len(out_institutions), "| programe:", total, "| me specializime të emërtuara:", with_spec)
for item in out_institutions:
    print(f"  {len(item['programs']):3d}  {item['slug']:14s} kampuse={len(item['campuses'])} fakultete={len(item['faculties'])}")
