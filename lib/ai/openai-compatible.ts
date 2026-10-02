import { contextBlock, materialBlock, summaryBlock, systemPrompt, webBlock } from "./prompt";
import type { AiAnswer, AiImage, AiProvider, AiRequest } from "./provider";

/**
 * Ofruesi i asistentit: Groq, përmes protokollit të OpenAI-t.
 *
 * Tre modele, secili për punën e vet:
 *   AI_MODEL          teksti (gpt-oss-120b)
 *   AI_VISION_MODEL   pyetjet me imazh (qwen3.8-27b), sepse gpt-oss nuk sheh
 *   AI_UTILITY_MODEL  titujt dhe përmbledhjet (gpt-oss-20b), që të mos hanë nga
 *                     kufiri i tokenave në minutë i modelit kryesor
 *
 * I njëjti kod punon edhe me xAI Grok ose OpenRouter: ndërrohet vetëm
 * `AI_BASE_URL`, çelësi dhe emrat e modeleve te `.env`.
 */
export class OpenAiCompatibleProvider implements AiProvider {
  readonly name: string;

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly visionModel: string;
  private readonly utilityModel: string;

  constructor() {
    this.baseUrl = (process.env.AI_BASE_URL ?? "").replace(/\/+$/, "");
    this.apiKey = process.env.AI_API_KEY ?? "";
    this.model = process.env.AI_MODEL ?? "";

    const groq = this.baseUrl.includes("groq.com");
    this.visionModel = process.env.AI_VISION_MODEL ?? (groq ? "qwen/qwen3.8-27b" : this.model);
    this.utilityModel = process.env.AI_UTILITY_MODEL ?? (groq ? "openai/gpt-oss-20b" : this.model);
    this.name = this.model || "openai-compatible";
  }

  /**
   * Ollama lokal nuk kërkon çelës, prandaj çelësi vetëm nuk mjafton si kusht.
   * Kërkohet një adresë dhe një model.
   */
  isAvailable() {
    return Boolean(this.baseUrl && this.model);
  }

  /** Emri që sheh studenti te koka e panelit. */
  label() {
    if (this.baseUrl.includes("x.ai")) return "Grok";
    if (this.baseUrl.includes("groq.com")) return "Groq";
    if (this.baseUrl.includes("openrouter")) return "OpenRouter";
    return "AI";
  }

  /** Kur kërkesa ka imazh, i duhet modeli që sheh. */
  private modelFor(request: AiRequest) {
    const hasImage =
      (request.images?.length ?? 0) > 0 || request.history.some((turn) => (turn.images?.length ?? 0) > 0);
    return hasImage ? this.visionModel : this.model;
  }

  /**
   * Parametrat e gjenerimit.
   *
   * Modelet që arsyetojnë para përgjigjes e harxhojnë arsyetimin nga i njëjti
   * kufi tokenash: pa hapësirë, përgjigjja del e prerë ose bosh. gpt-oss arsyeton
   * pak, qwen e mban arsyetimin jashtë tekstit.
   */
  private tuning(model: string) {
    if (/gpt-oss/i.test(model)) return { temperature: 0.4, max_tokens: 1800, reasoning_effort: "low" };
    if (/qwen/i.test(model) && this.baseUrl.includes("groq.com")) {
      return { temperature: 0.4, max_tokens: 1800, reasoning_format: "hidden" };
    }
    return { temperature: 0.4, max_tokens: 1600 };
  }

  private async post(body: Record<string, unknown>) {
    return fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  async answer(request: AiRequest, options: { lite?: boolean } = {}): Promise<AiAnswer> {
    // `lite`: riprovë me modelin ndihmës, kur ai kryesor është i zënë. Imazhet mbeten te modeli që sheh.
    const base = this.modelFor(request);
    const model = options.lite && base === this.model ? this.utilityModel : base;
    const response = await this.post({
      model,
      messages: buildMessages(request, model === this.visionModel),
      ...this.tuning(model),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`AI ${response.status}: ${detail.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = stripThinking(data?.choices?.[0]?.message?.content ?? "");
    if (!content) throw new Error("AI: përgjigje bosh");

    return {
      content,
      // Citimi nuk i besohet modelit: burimet janë ato që rikthimi gjeti vërtet.
      sources: request.sources.slice(0, 3),
      tokensIn: data?.usage?.prompt_tokens ?? 0,
      tokensOut: data?.usage?.completion_tokens ?? 0,
    };
  }

  /** E njëjta kërkesë, por si rrjedhë. Përdoret nga `/api/asistenti`. */
  async *stream(request: AiRequest): AsyncGenerator<string> {
    const model = this.modelFor(request);
    const response = await this.post({
      model,
      messages: buildMessages(request, model === this.visionModel),
      ...this.tuning(model),
      stream: true,
    });

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      throw new Error(`AI ${response.status}: ${detail.slice(0, 200)}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const filter = thinkingFilter();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;

        try {
          const chunk = JSON.parse(payload);
          const delta: string = chunk?.choices?.[0]?.delta?.content ?? "";
          const visible = delta ? filter(delta) : "";
          if (visible) yield visible;
        } catch {
          // Një rresht i përgjysmuar vjen sërish me tjetrin. Nuk është gabim.
        }
      }
    }
  }

  /**
   * Transkriptimi i një fotoje materiali (shënime me dorë, faqe libri, dërrasë),
   * që teksti i saj të hyjë te asistenti si çdo PDF. Kthen null kur dështon.
   */
  async transcribe(image: AiImage): Promise<string | null> {
    try {
      const response = await this.post({
        model: this.visionModel,
        messages: [
          {
            role: "user",
            content: withImages(
              "Transcribe all the text in this image faithfully, in its original language. Keep headings and lists. Describe diagrams, tables and formulas briefly in words. Return only the transcription.",
              [image],
              true,
            ),
          },
        ],
        ...this.tuning(this.visionModel),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return stripThinking(data?.choices?.[0]?.message?.content ?? "") || null;
    } catch {
      return null;
    }
  }

  /**
   * Një thirrje e shkurtër me modelin ndihmës: titulli ose përmbledhja.
   * Kthen null kur dështon, sepse asnjëra nuk duhet ta prishë bisedën.
   */
  async complete(instruction: string, text: string, maxTokens = 300): Promise<string | null> {
    try {
      const response = await this.post({
        model: this.utilityModel,
        messages: [
          { role: "system", content: instruction },
          { role: "user", content: text },
        ],
        temperature: 0.2,
        max_tokens: maxTokens,
        ...(/gpt-oss/i.test(this.utilityModel) ? { reasoning_effort: "low" } : {}),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return stripThinking(data?.choices?.[0]?.message?.content ?? "") || null;
    } catch {
      return null;
    }
  }
}

/** Imazhi si pjesë e mesazhit, në formën që pranojnë OpenAI, Groq dhe Grok. */
function withImages(text: string, images: AiImage[] | undefined, vision: boolean) {
  if (!vision || !images || images.length === 0) return text;
  return [
    { type: "text", text },
    ...images.map((image) => ({
      type: "image_url",
      image_url: { url: `data:${image.mime};base64,${image.data}` },
    })),
  ];
}

export function buildMessages(request: AiRequest, vision = false) {
  const english = request.locale === "en";
  const system = [
    systemPrompt(request.mode, request.locale, request.student),
    summaryBlock(request.summary),
    request.note ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const question = [
    materialBlock(request.material ?? null),
    contextBlock(request.sources, request.locale),
    webBlock(request.web ?? [], request.locale),
    `${english ? "QUESTION" : "PYETJA"}: ${request.question}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    { role: "system", content: system },
    ...request.history.map((turn) => ({
      role: turn.role === "assistant" ? "assistant" : "user",
      content: turn.role === "assistant" ? turn.content : withImages(turn.content, turn.images, vision),
    })),
    { role: "user", content: withImages(question, request.images, vision) },
  ];
}

/** Disa modele e shkruajnë arsyetimin brenda `<think>`: studenti nuk e sheh. */
export function stripThinking(text: string) {
  return text.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trim();
}

/** I njëjti pastrim, por për rrjedhën, ku etiketa mund të ndahet mes dy copave. */
function thinkingFilter() {
  let inside = false;
  let pending = "";

  return (delta: string) => {
    pending += delta;
    let out = "";

    while (pending) {
      if (inside) {
        const end = pending.indexOf("</think>");
        if (end === -1) {
          pending = pending.slice(-8);
          return out;
        }
        pending = pending.slice(end + 8);
        inside = false;
        continue;
      }

      const start = pending.indexOf("<think>");
      if (start === -1) {
        // Një etiketë e prerë në fund pritet copën tjetër.
        const partial = pending.lastIndexOf("<");
        if (partial !== -1 && "<think>".startsWith(pending.slice(partial))) {
          out += pending.slice(0, partial);
          pending = pending.slice(partial);
        } else {
          out += pending;
          pending = "";
        }
        return out;
      }

      out += pending.slice(0, start);
      pending = pending.slice(start + 7);
      inside = true;
    }

    return out;
  };
}
