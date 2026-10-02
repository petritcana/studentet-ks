import { afterAnswer, discardQuestion, finishAsk, prepareAsk } from "@/lib/ai/ask";
import { getAssistant } from "@/lib/ai/models";
import { isCannedRefusal, neutralRefusal, REFUSAL_RETRY_NOTE } from "@/lib/ai/prompt";

/** Asistenti si rrjedhë. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function line(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function isContext(value: unknown): value is { kind: "material" | "course" | "job"; id: string } {
  if (!value || typeof value !== "object") return false;
  const item = value as { kind?: unknown; id?: unknown };
  return (
    (item.kind === "material" || item.kind === "course" || item.kind === "job") &&
    typeof item.id === "string"
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.question !== "string") {
    return Response.json({ ok: false, messageKey: "errors.generic" }, { status: 400 });
  }

  const prepared = await prepareAsk({
    conversationId: typeof body.conversationId === "string" ? body.conversationId : null,
    question: body.question,
    context: isContext(body.context) ? body.context : undefined,
    images: Array.isArray(body.images) ? body.images.filter((id: unknown) => typeof id === "string") : [],
  });

  if (!prepared.ok) {
    return Response.json(
      { ok: false, messageKey: prepared.messageKey, remaining: prepared.remaining },
      { status: prepared.messageKey === "assistant.limitTitle" ? 429 : 400 },
    );
  }

  const { provider, live } = getAssistant();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(line(payload)));

      send({
        type: "meta",
        conversationId: prepared.conversationId,
        userMessageId: prepared.userMessageId,
        lockedCount: prepared.lockedCount,
        remaining: prepared.remaining,
      });

      let content = "";

      try {
        if (live) {
          /*
            Plani falas i Groq-ut ka kufi tokenash në minutë. Kur e kalon, Groq thotë
            sa sekonda të pritet: nëse janë pak, rruga pret dhe riprovon një herë,
            ndërsa studenti sheh ende shenjën «po mendon».
          */
          for (let attempt = 0; attempt < 2 && !content.trim(); attempt += 1) {
            try {
              for await (const delta of live.stream(prepared.request)) {
                content += delta;
                send({ type: "delta", text: delta });
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              console.warn("[ai] rrjedha dështoi:", message.slice(0, 200));
              const wait = Number(/try again in ([\d.]+)s/i.exec(message)?.[1] ?? NaN);
              if (content.trim() || !message.includes("429") || !(wait <= 12)) break;
              await new Promise((resolve) => setTimeout(resolve, Math.ceil(wait * 1000) + 250));
            }
          }

          // Kur rrjedha s'dha asgjë (kufi i tejkaluar, rrjet), provohet një herë pa
          // rrjedhë me modelin më të lehtë, që ka kufirin e vet të tokenave.
          if (!content.trim()) {
            const answer = await live.answer(prepared.request, { lite: true });
            content = answer.content;
            send({ type: "delta", text: content });
          }
        } else {
          const answer = await provider.answer(prepared.request);
          content = answer.content;
          send({ type: "delta", text: content });
        }

        if (live && isCannedRefusal(content)) {
          const retried = await live
            .answer({ ...prepared.request, note: REFUSAL_RETRY_NOTE })
            .then((answer) => answer.content)
            .catch(() => "");
          content =
            retried && !isCannedRefusal(retried)
              ? retried
              : neutralRefusal(prepared.request.question, prepared.request.locale);
          send({ type: "replace", text: content });
        }

        /*
          Burimet që dalin nën përgjigje janë vetëm ato që modeli i citoi me [n].
          Materiali që iu dha por që nuk e përdori nuk shfaqet.
        */
        const cited = new Set([...content.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1])));
        const sources = prepared.request.sources.filter((_, index) => cited.has(index + 1)).slice(0, 3);

        await finishAsk(prepared.conversationId, prepared.request.mode, {
          content,
          sources,
          tokensIn: prepared.request.question.length,
          tokensOut: content.length,
        });

        send({ type: "done", sources });

        // Titulli dhe përmbledhja, pasi studenti e ka marrë përgjigjen.
        await afterAnswer(prepared.conversationId).catch(() => undefined);
        send({ type: "saved" });
      } catch (error) {
        console.warn("[ai] asnjë përgjigje:", error instanceof Error ? error.message : error);
        // Pyetja që dështoi nuk mbetet në bisedë dhe nuk numërohet: studenti e riprovon.
        if (!content.trim()) await discardQuestion(prepared.userMessageId, prepared.conversationId).catch(() => undefined);
        send({ type: "error", messageKey: "assistantDock.unavailable" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
