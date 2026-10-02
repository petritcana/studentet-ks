# -*- coding: utf-8 -*-
"""Lexon rreshtat e programeve nga teksti i PDF-së, jo nga koordinatat.

Koordinatat i ndajnë kolonat mirë, por emrin e gjatë e presin keq: vazhdimi i tij
bie në të njëjtën lartësi me numrin e rreshtit pasues, dhe dy programe bashkohen
në një. Teksti i rrafshuar e ka të kundërtën: kolonat përzihen, por rreshti nis
gjithmonë me numrin e vet dhe mbyllet me datën e akreditimit.

Prandaj emrat merren këtu, kurse institucioni dhe fakulteti mbeten te ndarja me
koordinata, e cila është verifikuar bllok pas blloku.
"""
import io
import json
import re

LINES = io.open("kaa-2026.txt", encoding="utf-8").read().splitlines()

# Fundi i çdo rreshti: kampusi, niveli, ECTS, kuota, afati.
CAMPUSES = (
    "Prishtinë|Prizren|Ferizaj|Pejë|Gjilan|Mitrovicë|Gjakovë|Podujevë|Vushtrri|Lipjan|"
    "Graçanicë|Kamenicë|Rahovec|Suharekë|Malishevë|Istog|Klinë|Skenderaj|Drenas|Shtime|"
    "Deçan|Dragash|Obiliq|Fushë Kosovë|Viti|Therandë|Besianë"
)

TAIL = re.compile(
    rf"\s(?P<campus>{CAMPUSES})\s"
    r"(?P<level>BSc|Bsc|BA|Ba|LLB|BMus|MSc|Msc|MA|Ma|LLM|MMus|MPh|PhD|Bachelor profesional|Bachelor Profesional|Dr\. Dent|Dr\. Med|DMV)\s"
    # Kuota ndonjëherë vjen me sqarim: «160 (40 per specializim)». Pa këtë, tre
    # rreshta bashkoheshin në një dhe dy programe humbnin.
    r"(?P<ects>\d{2,3})\s(?P<quota>\d{1,4})(?:\s*\([^)]*\))?\s(?P<until>\d{1,2}-[A-Za-z]{3}-\d{4})\s*$"
)

START = re.compile(r"^(?:(?P<prefix>.*?)\s)??(?P<nr>\d{1,2})\s+(?P<rest>\D.*)$")

NOISE = re.compile(r"^(===== FAQE|KAA \| Student)")


def clean(line: str) -> str:
    return re.sub(r"\s+", " ", line).strip()


records = []
buffer = None

for raw in LINES:
    line = clean(raw)
    if not line or NOISE.search(line):
        continue

    start = START.match(line)
    if buffer is not None:
        # Rreshti i hapur mbyllet vetëm nga data. Vazhdimi i emrit shpesh nis me
        # numër («2. Zoologji»), prandaj numri nuk e nis kurrë një rresht të ri
        # derisa i mëparshmi të jetë mbyllur.
        buffer["text"] = f"{buffer['text']} {line}"
    elif start:
        buffer = {"nr": start.group("nr"), "text": start.group("rest")}
    else:
        continue

    tail = TAIL.search(buffer["text"])
    if not tail:
        continue

    head = buffer["text"][: tail.start()].strip()
    records.append(
        {
            "nr": buffer["nr"],
            "head": head,
            "campus": tail.group("campus").strip(),
            "level": tail.group("level").strip(),
            "ects": tail.group("ects"),
            "quota": tail.group("quota"),
            "until": tail.group("until"),
        }
    )
    buffer = None

io.open("text-rows.json", "w", encoding="utf-8").write(json.dumps(records, ensure_ascii=False, indent=1))
print("rreshta:", len(records))
for record in records[:6] + records[240:246]:
    print(" ", record["nr"], "|", record["head"][:90], "|", record["level"], record["campus"])
