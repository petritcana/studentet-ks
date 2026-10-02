# Si rigjenerohet katalogu akademik

`prisma/academic/catalog.ts` nuk shkruhet me dorë. Ai del nga lista zyrtare e
programeve të akredituara e Agjencisë së Kosovës për Akreditim, dhe kjo dosje i
mban hapat që e nxjerrin.

Nevojiten `python` me `pypdf`, dhe dokumenti i AKA-së i shkarkuar si
`kaa-2026.pdf` bashkë me tekstin e tij `kaa-2026.txt`.

## Hapat

```
python 01-columns.py     # lexim me koordinata: kolonat, blloqet, emrat anglisht
python 02-text-rows.py   # lexim i tekstit: emrat e plotë shqip, niveli, ECTS, kampusi
python 03-merge.py       # bashkon të dyja dhe u jep blloqeve institucionin
python 04-shape.py       # nivelet, slug-et, fakultetet, drejtimet
python 05-write-ts.py    # shkruan prisma/academic/catalog.ts
npm run seed:academic    # mbjell, pa dyfishuar, dhe arkivon ato që dolën nga lista
```

## Pse dy lexime

Leximi me koordinata i ndan kolonat saktë, por emrin e gjatë e pret keq: vazhdimi
i tij bie në të njëjtën lartësi me numrin e rreshtit pasues, dhe dy programe
ngjiten në një. Teksti i rrafshuar e ka të kundërtën: kolonat përzihen, por
rreshti nis gjithmonë me numrin e vet dhe mbyllet me datën e akreditimit.

Prandaj emri shqip vjen nga teksti, emri anglisht nga kolona, dhe institucioni
nga rendi i blloqeve, i cili është i njëjtë te të dy leximet.

## Kur ndryshon dokumenti

`03-merge.py` ka `ANCHORS`: programi i parë i çdo blloku. Nëse dokumenti i ri i
ndërron blloqet, skripti ndalet me gabim në vend që të mbjellë programe te
institucioni i gabuar. Atëherë blloqet lexohen sërish një nga një dhe hartat
`BLOCKS` dhe `ANCHORS` përditësohen.

## Fakultetet

Lista e AKA-së e mban fakultetin vetëm për Universitetin e Prishtinës. Për pesë
universitetet e tjera publike fakultetet rrinë te `faculties.py`, të marra nga
faqet e vetë universiteteve, dhe lidhen me programin sipas numrit të rreshtit te
lista. Numri nuk ndryshon edhe kur emri shkruhet ndryshe.

Kolegjet private nuk kanë fakultete këtu me qëllim: te to studenti e zgjedh
programin drejtpërdrejt.
