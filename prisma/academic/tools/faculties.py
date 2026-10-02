# -*- coding: utf-8 -*-
"""Fakultetet e universiteteve publike dhe programi që i takon secilit.

Lista e AKA-së e mban fakultetin vetëm për Universitetin e Prishtinës. Për pesë
universitetet e tjera publike fakultetet janë marrë nga faqet e vetë
universiteteve dhe programi i secilit është lidhur me numrin e rreshtit te lista,
sepse numri nuk ndryshon edhe kur emri shkruhet ndryshe.

Kolegjet private nuk kanë fakultete këtu me qëllim: te to studenti zgjedh
drejtpërdrejt programin.
"""

# slug: (emri shqip, emri anglisht, shkurtesa, ngjyra, ikona)
FACULTIES = {
    # Universiteti Publik "Kadri Zeka", Gjilan
    "ukz-edukim": ("Fakulteti i Edukimit", "Faculty of Education", "EDU", "education", "graduation-cap"),
    "ukz-juridik": ("Fakulteti Juridik", "Faculty of Law", "JUR", "law", "scale"),
    "ukz-ekonomik": ("Fakulteti Ekonomik", "Faculty of Economics", "EKO", "economics", "trending-up"),
    "ukz-kompjuterike": ("Fakulteti i Shkencave Kompjuterike", "Faculty of Computer Science", "FSHK", "electrical", "cpu"),
    "ukz-sociale": ("Fakulteti i Shkencave Sociale", "Faculty of Social Sciences", "FSHS", "philosophy", "users"),

    # Universiteti "Isa Boletini", Mitrovicë
    "umib-gjeoshkenca": ("Fakulteti i Gjeoshkencave", "Faculty of Geosciences", "FGJ", "science", "mountain"),
    "umib-ushqimore": ("Fakulteti i Teknologjisë Ushqimore", "Faculty of Food Technology", "FTU", "agriculture", "wheat"),
    "umib-fimk": ("Fakulteti i Inxhinierisë Mekanike dhe Kompjuterike", "Faculty of Mechanical and Computer Engineering", "FIMK", "mechanical", "cog"),
    "umib-juridik": ("Fakulteti Juridik", "Faculty of Law", "JUR", "law", "scale"),
    "umib-ekonomik": ("Fakulteti Ekonomik", "Faculty of Economics", "EKO", "economics", "trending-up"),

    # Universiteti "Haxhi Zeka", Pejë
    "uhz-biznes": ("Fakulteti i Biznesit", "Faculty of Business", "FB", "economics", "trending-up"),
    "uhz-juridik": ("Fakulteti Juridik", "Faculty of Law", "JUR", "law", "scale"),
    "uhz-turizem": ("Fakulteti i Menaxhimit në Turizëm, Hotelieri dhe Mjedis", "Faculty of Management in Tourism, Hospitality and Environment", "FMTHM", "agriculture", "palmtree"),
    "uhz-agrobiznes": ("Fakulteti i Agrobiznesit", "Faculty of Agribusiness", "FAB", "agriculture", "sprout"),
    "uhz-arte": ("Fakulteti i Arteve", "Faculty of Arts", "ART", "arts", "palette"),

    # Universiteti "Fehmi Agani", Gjakovë
    "ufagj-edukim": ("Fakulteti i Edukimit", "Faculty of Education", "EDU", "education", "graduation-cap"),
    "ufagj-filologji": ("Fakulteti i Filologjisë", "Faculty of Philology", "FIL", "philology", "book-open"),
    "ufagj-mjekesi": ("Fakulteti i Mjekësisë", "Faculty of Medicine", "MJK", "medicine", "stethoscope"),
    "ufagj-sociale": ("Fakulteti i Shkencave Sociale", "Faculty of Social Sciences", "FSHS", "philosophy", "users"),
    "ufagj-aplikuara": ("Fakulteti i Shkencave të Aplikuara", "Faculty of Applied Sciences", "FSHA", "electrical", "cpu"),

    # Universiteti i Shkencave të Aplikuara në Ferizaj
    "ushaf-industrial": ("Fakulteti i Menaxhmentit Industrial", "Faculty of Industrial Management", "FMI", "economics", "factory"),
    "ushaf-arkitekture": ("Fakulteti i Arkitekturës së Interierit dhe Dizajnit të Mobiljeve", "Faculty of Interior Architecture and Furniture Design", "FAID", "architecture", "building-2"),
    "ushaf-inxhinieri": ("Fakulteti i Inxhinierisë dhe Informatikës", "Faculty of Engineering and Informatics", "FII", "electrical", "cpu"),
    "ushaf-turizem": ("Fakulteti i Turizmit dhe Ambientit", "Faculty of Tourism and Environment", "FTA", "agriculture", "palmtree"),
}

# (institucioni, numri i rreshtit te lista e AKA-së) -> fakulteti
PROGRAM_FACULTY = {
    # Kadri Zeka, Gjilan
    ("kadri-zeka", "1"): "ukz-sociale",
    ("kadri-zeka", "2"): "ukz-edukim",
    ("kadri-zeka", "3"): "ukz-edukim",
    ("kadri-zeka", "4"): "ukz-kompjuterike",
    ("kadri-zeka", "5"): "ukz-ekonomik",
    ("kadri-zeka", "6"): "ukz-ekonomik",
    ("kadri-zeka", "7"): "ukz-juridik",
    ("kadri-zeka", "8"): "ukz-edukim",
    ("kadri-zeka", "9"): "ukz-edukim",
    ("kadri-zeka", "10"): "ukz-edukim",
    ("kadri-zeka", "11"): "ukz-ekonomik",
    ("kadri-zeka", "12"): "ukz-kompjuterike",
    ("kadri-zeka", "13"): "ukz-kompjuterike",

    # Isa Boletini, Mitrovicë
    ("isa-boletini", "1"): "umib-ekonomik",
    ("isa-boletini", "2"): "umib-ushqimore",
    ("isa-boletini", "3"): "umib-ushqimore",
    ("isa-boletini", "4"): "umib-fimk",
    ("isa-boletini", "5"): "umib-gjeoshkenca",
    ("isa-boletini", "6"): "umib-gjeoshkenca",
    ("isa-boletini", "7"): "umib-fimk",
    ("isa-boletini", "8"): "umib-fimk",
    ("isa-boletini", "9"): "umib-gjeoshkenca",
    ("isa-boletini", "10"): "umib-juridik",
    ("isa-boletini", "11"): "umib-ushqimore",
    ("isa-boletini", "12"): "umib-gjeoshkenca",
    ("isa-boletini", "13"): "umib-gjeoshkenca",
    ("isa-boletini", "14"): "umib-gjeoshkenca",
    ("isa-boletini", "15"): "umib-gjeoshkenca",
    ("isa-boletini", "16"): "umib-ushqimore",
    ("isa-boletini", "17"): "umib-fimk",
    ("isa-boletini", "18"): "umib-fimk",

    # Haxhi Zeka, Pejë
    ("haxhi-zeka", "1"): "uhz-arte",
    ("haxhi-zeka", "2"): "uhz-arte",
    ("haxhi-zeka", "3"): "uhz-agrobiznes",
    ("haxhi-zeka", "4"): "uhz-turizem",
    ("haxhi-zeka", "5"): "uhz-agrobiznes",
    ("haxhi-zeka", "6"): "uhz-agrobiznes",
    ("haxhi-zeka", "7"): "uhz-biznes",
    ("haxhi-zeka", "8"): "uhz-biznes",
    ("haxhi-zeka", "9"): "uhz-juridik",
    ("haxhi-zeka", "10"): "uhz-juridik",
    ("haxhi-zeka", "11"): "uhz-juridik",
    ("haxhi-zeka", "12"): "uhz-arte",
    ("haxhi-zeka", "13"): "uhz-arte",
    ("haxhi-zeka", "14"): "uhz-biznes",
    ("haxhi-zeka", "15"): "uhz-agrobiznes",
    ("haxhi-zeka", "16"): "uhz-biznes",
    ("haxhi-zeka", "17"): "uhz-turizem",
    ("haxhi-zeka", "18"): "uhz-turizem",
    ("haxhi-zeka", "19"): "uhz-turizem",
    ("haxhi-zeka", "20"): "uhz-biznes",
    ("haxhi-zeka", "21"): "uhz-biznes",
    ("haxhi-zeka", "22"): "uhz-biznes",

    # Fehmi Agani, Gjakovë
    ("fehmi-agani", "1"): "ufagj-filologji",
    ("fehmi-agani", "2"): "ufagj-filologji",
    ("fehmi-agani", "3"): "ufagj-sociale",
    ("fehmi-agani", "4"): "ufagj-edukim",
    ("fehmi-agani", "5"): "ufagj-mjekesi",
    ("fehmi-agani", "6"): "ufagj-mjekesi",
    ("fehmi-agani", "7"): "ufagj-mjekesi",
    ("fehmi-agani", "8"): "ufagj-aplikuara",
    ("fehmi-agani", "9"): "ufagj-filologji",
    ("fehmi-agani", "10"): "ufagj-filologji",
    ("fehmi-agani", "11"): "ufagj-mjekesi",

    # Shkencave të Aplikuara, Ferizaj
    ("ushaf", "1"): "ushaf-arkitekture",
    ("ushaf", "2"): "ushaf-inxhinieri",
    ("ushaf", "3"): "ushaf-industrial",
    ("ushaf", "4"): "ushaf-inxhinieri",
    ("ushaf", "5"): "ushaf-arkitekture",
    ("ushaf", "6"): "ushaf-turizem",
    ("ushaf", "7"): "ushaf-turizem",
    ("ushaf", "8"): "ushaf-industrial",
    ("ushaf", "9"): "ushaf-arkitekture",
    ("ushaf", "10"): "ushaf-industrial",
}
