import { describe, expect, it } from "vitest";
import { draftTitle, historyWindow, parseAttachments } from "@/lib/ai/history";
import { buildMessages, stripThinking } from "@/lib/ai/openai-compatible";
import { systemPrompt } from "@/lib/ai/prompt";
import type { AiRequest } from "@/lib/ai/provider";

function request(overrides: Partial<AiRequest> = {}): AiRequest {
  return {
    mode: "chat",
    question: "Ç'është fotosinteza?",
    sources: [],
    locale: "sq",
    history: [],
    ...overrides,
  };
}

describe("dritarja e historikut", () => {
  it("mban mesazhet e fundit, jo të parat", () => {
    const messages = Array.from({ length: 50 }, (_, index) => ({ content: `mesazhi ${index}` }));
    const { kept, dropped } = historyWindow(messages, 10, 10_000);
    expect(kept[0].content).toBe("mesazhi 40");
    expect(kept.at(-1)?.content).toBe("mesazhi 49");
    expect(dropped).toBe(40);
  });

  it("ndalet te kufiri i karaktereve pa e prerë një mesazh përgjysmë", () => {
    const messages = [{ content: "a".repeat(600) }, { content: "b".repeat(600) }, { content: "c".repeat(300) }];
    const { kept } = historyWindow(messages, 40, 1000);
    expect(kept.map((message) => message.content[0])).toEqual(["b", "c"]);
  });

  it("mesazhi i fundit hyn gjithmonë, edhe kur është më i gjatë se kufiri", () => {
    const { kept } = historyWindow([{ content: "x".repeat(5000) }], 40, 1000);
    expect(kept).toHaveLength(1);
  });
});

describe("titulli dhe bashkëngjitjet", () => {
  it("titulli i parë del nga pyetja, i shkurtuar", () => {
    expect(draftTitle("Më trego alfabetin shqip?")).toBe("Më trego alfabetin shqip");
    expect(draftTitle("a".repeat(80)).length).toBeLessThanOrEqual(46);
  });

  it("bashkëngjitjet e prishura nuk e rrëzojnë bisedën", () => {
    expect(parseAttachments("{jo json")).toEqual([]);
    expect(parseAttachments('[{"id":"x","extension":"jpg","mime":"image/jpeg"},{"id":1}]')).toHaveLength(1);
  });
});

describe("mesazhet për modelin", () => {
  it("historiku hyn i tëri, jo vetëm gjashtë radhët e fundit", () => {
    const history = Array.from({ length: 20 }, (_, index) => ({
      role: index % 2 ? "assistant" : "user",
      content: `radha ${index}`,
    }));
    const messages = buildMessages(request({ history }));
    // Sistemi, njëzet radhët, pyetja e tanishme.
    expect(messages).toHaveLength(22);
    expect(messages[1].content).toBe("radha 0");
  });

  it("imazhi shkon si pjesë e mesazhit vetëm te modeli që sheh", () => {
    const withImage = request({ images: [{ mime: "image/png", data: "AAAA" }] });
    const vision = buildMessages(withImage, true).at(-1)?.content;
    const text = buildMessages(withImage, false).at(-1)?.content;
    expect(Array.isArray(vision)).toBe(true);
    expect(JSON.stringify(vision)).toContain("data:image/png;base64,AAAA");
    expect(typeof text).toBe("string");
  });

  it("materiali i hapur dhe profili i studentit hyjnë te kërkesa", () => {
    const messages = buildMessages(
      request({
        material: { title: "Ligjërata 3", course: "Biologji", text: "[Faqja 5] Fotosinteza ndodh te kloroplastet." },
        student: { faculty: "FSHMN", year: 2 },
      }),
    );
    expect(String(messages[0].content)).toContain("faculty: FSHMN");
    expect(String(messages.at(-1)?.content)).toContain("[Faqja 5]");
  });

  it("përmbledhja e bisedës së gjatë shkon te sistemi", () => {
    const messages = buildMessages(request({ summary: "- Folëm për inflacionin." }));
    expect(String(messages[0].content)).toContain("Folëm për inflacionin");
  });
});

describe("rregullat", () => {
  it("janë edukative të gjera dhe ruajnë sigurinë", () => {
    const rules = systemPrompt("chat", "sq");
    expect(rules).toContain("Albanian alphabet");
    expect(rules).toContain("Answer in the language the student writes in");
    expect(rules).toContain("Refuse only instructions that would facilitate harm");
  });

  it("arsyetimi i modelit nuk i shfaqet studentit", () => {
    expect(stripThinking("<think>po mendoj</think>Përgjigjja.")).toBe("Përgjigjja.");
    expect(stripThinking("Pa etiketa.")).toBe("Pa etiketa.");
  });
});

describe("refuzimi i gatshëm", () => {
  it("njihet dhe zëvendësohet me tekst neutral në gjuhën e studentit", async () => {
    const { isCannedRefusal, neutralRefusal } = await import("@/lib/ai/prompt");
    expect(isCannedRefusal("I’m sorry, but I can’t help with that.")).toBe(true);
    expect(isCannedRefusal("Fotosinteza është procesi…")).toBe(false);
    expect(neutralRefusal("Si quhet qeni im?", "sq")).toContain("Provo ta pyesësh ndryshe");
    expect(neutralRefusal("What is my dog called?", "en")).toContain("Try asking it another way");
  });
});
