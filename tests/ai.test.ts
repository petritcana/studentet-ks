import { describe, expect, it } from "vitest";
import {
  chunkText,
  cosineSimilarity,
  embed,
  EMBEDDING_DIMENSIONS,
  lexicalOverlap,
  normalize,
  parseVector,
  serializeVector,
} from "@/lib/ai/embeddings";
import { MockAiProvider } from "@/lib/ai/provider";

describe("ndarja në copëza", () => {
  it("e lë tekstin e shkurtër të paprekur", () => {
    expect(chunkText("Algoritmet dhe strukturat e te dhenave.")).toHaveLength(1);
  });

  it("e ndan tekstin e gjatë dhe nuk humb përmbajtje", () => {
    const sentence = "Derivati i funksionit tregon shpejtësinë e ndryshimit. ";
    const chunks = chunkText(sentence.repeat(60), 300, 40);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 300)).toBe(true);
  });

  it("kthen listë bosh për tekst bosh", () => {
    expect(chunkText("   ")).toHaveLength(0);
  });
});

describe("embeddings", () => {
  it("kanë gjithmonë të njëjtën përmasë", () => {
    expect(embed("Statistika")).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(embed("")).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  it("janë deterministike", () => {
    expect(embed("Bazat e programimit")).toEqual(embed("Bazat e programimit"));
  });

  it("dalin të normalizuar", () => {
    const vector = embed("Anatomia e njeriut");
    const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    expect(length).toBeCloseTo(1, 5);
  });

  it("i injorojnë shenjat diakritike, që shqipja të mos ndahet më dysh", () => {
    expect(embed("Matematike")).toEqual(embed("Matematikë"));
  });
});

describe("ngjashmëria kozinus", () => {
  it("është 1 për të njëjtin tekst", () => {
    const vector = embed("Kontabiliteti financiar");
    expect(cosineSimilarity(vector, vector)).toBeCloseTo(1, 5);
  });

  it("është më e lartë për tekste të ngjashme sesa për të palidhura", () => {
    const query = embed("derivati i funksionit");
    const close = cosineSimilarity(query, embed("derivati i funksionit eksponencial"));
    const far = cosineSimilarity(query, embed("historia e arkitektures osmane"));
    expect(close).toBeGreaterThan(far);
  });

  it("kthen zero kur përmasat nuk përputhen", () => {
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });
});

describe("serializimi i vektorit", () => {
  it("mbijeton kalimin në tekst dhe kthimin", () => {
    const original = embed("Fizika e pergjithshme");
    const restored = parseVector(serializeVector(original));
    expect(restored).toHaveLength(original.length);
    expect(cosineSimilarity(original, normalize(restored))).toBeCloseTo(1, 3);
  });

  it("kthen listë bosh për tekst të prishur", () => {
    expect(parseVector("jo-json")).toHaveLength(0);
  });
});

describe("ofruesi demonstrues", () => {
  const provider = new MockAiProvider();

  it("e thotë hapur kur nuk gjen asnjë burim", async () => {
    const answer = await provider.answer({
      mode: "chat",
      question: "Çfarë është integrali?",
      sources: [],
      locale: "sq",
      history: [],
    });
    expect(answer.sources).toHaveLength(0);
    expect(answer.content.length).toBeGreaterThan(0);
  });

  it("përgjigjet me tekstin e materialit, jo vetëm me titullin", async () => {
    const answer = await provider.answer({
      mode: "explain",
      question: "Çfarë është derivati?",
      sources: [
        {
          materialId: "m1",
          title: "Analiza matematike I",
          courseName: "Analiza",
          chunk: 0,
          excerpt: "Derivati mat shpejtësinë e ndryshimit.",
        },
      ],
      locale: "sq",
      history: [],
    });

    expect(answer.sources).toHaveLength(1);
    expect(answer.sources[0].materialId).toBe("m1");
    expect(answer.content).toContain("Derivati mat shpejtësinë e ndryshimit.");
  });

  it("e zgjedh fjalinë që i përgjigjet pyetjes, jo të parën që gjen", async () => {
    const answer = await provider.answer({
      mode: "chat",
      question: "Çfarë është inflacioni?",
      sources: [
        {
          materialId: "m2",
          title: "Makroekonomi",
          courseName: "Makro",
          chunk: 0,
          excerpt:
            "Papunësia matet si përqindje e fuqisë punëtore aktive. " +
            "Inflacioni është rritja e përgjithshme e nivelit të çmimeve me kalimin e kohës.",
        },
      ],
      locale: "sq",
      history: [],
    });

    expect(answer.content).toContain("Inflacioni është rritja e përgjithshme");
  });

  it("përgjigjet në anglisht kur gjuha është anglishtja", async () => {
    const answer = await provider.answer({
      mode: "chat",
      question: "What is a derivative?",
      sources: [],
      locale: "en",
      history: [],
    });
    expect(answer.content).toContain("couldn't find");
  });
});

describe("mbivendosja leksikore", () => {
  it("nuk gjen lidhje mes dy temave të ndryshme", () => {
    expect(lexicalOverlap("Çfarë është derivati?", "Inflamacioni akut ka pesë shenja klasike.")).toBe(0);
  });

  it("e njeh të njëjtën fjalë në trajta të ndryshme", () => {
    // Pyetja thotë "mëlçisë", teksti "mëlçia". Pa rrënjëzim nuk përputhen.
    expect(
      lexicalOverlap("funksionet e mëlçisë", "Mëlçia e prodhon biliaren dhe e ruan glukozën."),
    ).toBeGreaterThan(0);
  });

  it("nuk numëron fjalët lidhëse", () => {
    expect(lexicalOverlap("çfarë është për nga dhe", "Krejt tjetër temë pa asnjë lidhje.")).toBe(0);
  });
});

describe("ofruesi demonstrues, përgjigjja", () => {
  const provider = new MockAiProvider();

  const anatomy = {
    materialId: "m-anatomi",
    title: "Anatomi e njeriut",
    courseName: "Anatomi",
    chunk: 0,
    excerpt:
      "Trupi i njeriut organizohet në qeliza, inde, organe dhe sisteme. " +
      "Zemra ka katër dhoma që e marrin dhe e nxjerrin gjakun. " +
      "Mëlçia e prodhon biliaren, e ruan glukozën si glikogjen dhe i zbërthen ilaçet.",
  };

  it("e zgjedh fjalinë për temën e pyetur, jo të parën e copëzës", async () => {
    const answer = await provider.answer({
      mode: "chat",
      question: "Cilat janë funksionet e mëlçisë?",
      sources: [anatomy],
      locale: "sq",
      history: [],
    });

    expect(answer.content).toContain("Mëlçia e prodhon biliaren");
    expect(answer.content).not.toContain("Zemra ka katër dhoma");
  });

  it("nuk e përsërit të njëjtën fjali kur dy materiale e mbajnë", async () => {
    const answer = await provider.answer({
      mode: "chat",
      question: "Cilat janë funksionet e mëlçisë?",
      sources: [anatomy, { ...anatomy, materialId: "m-2", title: "Kapituj bazë" }],
      locale: "sq",
      history: [],
    });

    const occurrences = answer.content.split("Mëlçia e prodhon biliaren").length - 1;
    expect(occurrences).toBe(1);
  });

  it("nuk merr fjali nga burime që nuk i citon", async () => {
    const extra = Array.from({ length: 5 }, (_, index) => ({
      materialId: `m-${index}`,
      title: `Material ${index}`,
      courseName: "Anatomi",
      chunk: 0,
      excerpt: "Trupi i njeriut organizohet në qeliza, inde, organe dhe sisteme.",
    }));
    const hidden = {
      materialId: "m-fshehur",
      title: "Material i pacituar",
      courseName: "Patologji",
      chunk: 0,
      excerpt: "Nekroza është vdekje qelizore e pakontrolluar me shpërthim të përmbajtjes.",
    };

    const answer = await provider.answer({
      mode: "chat",
      question: "Çfarë është nekroza?",
      sources: [...extra, hidden],
      locale: "sq",
      history: [],
    });

    expect(answer.sources).toHaveLength(3);
    expect(answer.sources.some((source) => source.materialId === "m-fshehur")).toBe(false);
    expect(answer.content).not.toContain("Nekroza është vdekje qelizore");
  });
});

describe("fjalë të ngjashme, jo të njëjta", () => {
  it("inflacioni nuk është inflamacion", () => {
    expect(lexicalOverlap("Ç'është inflacioni?", "Inflamacioni akut ka pesë shenja klasike.")).toBe(0);
  });
});
