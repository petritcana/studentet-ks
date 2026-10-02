import { aiLimits, canViewMaterial } from "@/lib/access";
import { db } from "@/lib/db";
import { getWebSearch, webSearchAvailable } from "./web-search";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { getObject } from "@/lib/storage";
import type { AiMode } from "@/lib/types";
import { countLockedMatches, retrieve } from "./rag";
import { getAssistant } from "./models";
import { SUMMARY_PROMPT, TITLE_PROMPT, type StudentContext } from "./prompt";
import type { AiImage, AiRequest, AiSource, AiTurn } from "./provider";
import {
  draftTitle,
  historyWindow,
  HISTORY_MESSAGES,
  parseAttachments,
  type Attachment,
} from "./history";

export { parseAttachments };

/**
 * Përgatitja e një pyetjeje drejtuar asistentit, dhe ruajtja pas përgjigjes.
 *
 * Biseda ruhet e plotë në bazë. Modeli merr një dritare: mesazhet e fundit deri te
 * një kufi karakteresh, plus përmbledhjen e pjesës më të vjetër. Kështu biseda e
 * gjatë nuk e humb fillin, dhe kërkesa nuk rritet pa fund.
 */

/**
 * Imazhet e historikut nuk i dërgohen sërish modelit.
 *
 * Çdo imazh kushton mbi një mijë tokena, dhe plani falas i Groq-ut lejon rreth
 * shtatë mijë në minutë: pyetja e dytë pas një fotoje e kalonte kufirin. Përgjigjja
 * e parë e përshkruan imazhin, dhe pyetjet pasuese mbështeten te ajo.
 */
const HISTORY_IMAGE_TURNS = 0;
/** Sa tekst materiali i jepet modelit kur studenti e ka hapur. */
const MATERIAL_CHARS = 6_000;
/** Sa imazhe për pyetje. */
export const MAX_AI_IMAGES = 3;

export type AskInput = {
  conversationId?: string | null;
  question: string;
  context?: { kind: "material" | "course" | "job"; id: string };
  /** Id-të e imazheve të ngarkuara nga studenti te `/api/ngarko`. */
  images?: string[];
};

export type Prepared = {
  ok: true;
  conversationId: string;
  userMessageId: string;
  request: AiRequest;
  lockedCount: number;
  remaining: number;
};

export type Refused = { ok: false; messageKey: string; remaining?: number };

async function loadImages(attachments: Attachment[]): Promise<AiImage[]> {
  const images: AiImage[] = [];
  for (const attachment of attachments) {
    const bytes = await getObject(attachment.id, attachment.extension);
    if (bytes) images.push({ mime: attachment.mime, data: bytes.toString("base64") });
  }
  return images;
}

/** Teksti i materialit, me faqet që kërkoi studenti të parat, deri te kufiri. */
async function materialText(materialId: string, question: string) {
  const chunks = await db.materialEmbedding.findMany({
    where: { materialId },
    orderBy: { chunk: "asc" },
    select: { content: true },
  });

  const page = /(?:faq(?:ja|en|e)?|page|seite|sayfa|strana)\s*(\d{1,4})/i.exec(question)?.[1];
  const ordered = page
    ? [
        ...chunks.filter((chunk) => chunk.content.includes(`[Faqja ${page}]`)),
        ...chunks.filter((chunk) => !chunk.content.includes(`[Faqja ${page}]`)),
      ]
    : chunks;

  let text = "";
  for (const chunk of ordered) {
    if (text.length + chunk.content.length > MATERIAL_CHARS) break;
    text += `${chunk.content}\n\n`;
  }
  return text.trim();
}

export async function prepareAsk(input: AskInput): Promise<Prepared | Refused> {
  const me = await requireUser();

  const limiter = rateLimit("ai", me.id);
  if (!limiter.ok) return { ok: false, messageKey: "errors.rateLimited" };

  const imageIds = [...new Set(input.images ?? [])].slice(0, MAX_AI_IMAGES);
  const question = input.question.trim();
  if (question.length > 4000) return { ok: false, messageKey: "errors.generic" };
  // Një imazh pa fjalë është pyetje e plotë: «shpjegoje këtë».
  if (question.length < 2 && imageIds.length === 0) return { ok: false, messageKey: "errors.generic" };

  // Kufiri i planit. Falas 10 në ditë, thuhet hapur para se të niset kërkesa.
  const limits = aiLimits(me.access);
  const used = await usedToday(me.id);
  if (used >= limits.messagesPerDay) {
    return { ok: false, messageKey: "assistant.limitTitle", remaining: 0 };
  }

  const locale = me.locale ?? "sq";
  const asked = question || (locale === "en" ? "Explain this image." : "Shpjegoje këtë imazh.");

  // Imazhet: vetëm ato që i ngarkoi ky student, dhe vetëm imazhe.
  const assets = imageIds.length
    ? await db.mediaAsset.findMany({
        where: { id: { in: imageIds }, kind: "image", claims: { some: { userId: me.id } } },
        select: { id: true, extension: true, mime: true },
      })
    : [];
  const attachments: Attachment[] = assets.map((asset) => ({
    id: asset.id,
    extension: asset.extension,
    mime: asset.mime,
  }));
  if (imageIds.length > 0 && attachments.length === 0) return { ok: false, messageKey: "errors.generic" };

  const existing = input.conversationId
    ? await db.aiConversation.findFirst({
        where: { id: input.conversationId, userId: me.id },
        select: { id: true, summary: true, summaryCount: true, contextKind: true, contextId: true },
      })
    : null;

  const context = input.context ?? (
    existing?.contextKind === "material" && existing.contextId
      ? { kind: "material" as const, id: existing.contextId }
      : undefined
  );

  const thread =
    existing ??
    (await db.aiConversation.create({
      data: {
        userId: me.id,
        title: draftTitle(asked),
        contextKind: context?.kind ?? null,
        contextId: context?.id ?? null,
      },
      select: { id: true, summary: true, summaryCount: true, contextKind: true, contextId: true },
    }));

  // Materiali i hapur mbahet mend nga biseda, që pyetja pasuese ta ketë parasysh.
  if (existing && input.context?.kind === "material" && existing.contextId !== input.context.id) {
    await db.aiConversation.update({
      where: { id: thread.id },
      data: { contextKind: "material", contextId: input.context.id },
    });
  }

  const [all, profile] = await Promise.all([
    db.aiMessage.findMany({
      where: { conversationId: thread.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_MESSAGES + 20,
      select: { role: true, content: true, attachments: true },
    }),
    db.user.findUnique({
      where: { id: me.id },
      select: {
        year: true,
        level: true,
        university: { select: { name: true, nameEn: true } },
        faculty: { select: { name: true, nameEn: true } },
        studyProgram: { select: { name: true, nameEn: true } },
      },
    }),
  ]);
  const ordered = all.reverse();
  const total = await db.aiMessage.count({ where: { conversationId: thread.id } });
  const { kept } = historyWindow(ordered);

  const history: AiTurn[] = [];
  for (const [index, message] of kept.entries()) {
    const recent = index >= kept.length - HISTORY_IMAGE_TURNS;
    const images =
      message.role === "user" && recent ? await loadImages(parseAttachments(message.attachments)) : [];
    history.push({
      role: message.role,
      content:
        parseAttachments(message.attachments).length > 0
          ? `${message.content || ""} [imazh i bashkëngjitur, i përshkruar te përgjigjja që vijon]`.trim()
          : message.content,
      ...(images.length ? { images } : {}),
    });
  }

  /*
    Përmbledhja vlen vetëm kur ka vërtet mesazhe jashtë dritares. Kur mungon, ose
    ka mbetur shumë prapa, shkruhet tani, para përgjigjes: ndryshe modeli nuk do ta
    dinte atë që studenti i tha në fillim të bisedës.
  */
  const outside = total - kept.length;
  const summary =
    outside > 0
      ? thread.summary && outside - thread.summaryCount < 10
        ? thread.summary
        : await refreshSummary(thread.id, thread.summary, thread.summaryCount)
      : null;

  const english = locale === "en";
  const student: StudentContext = {
    university: english ? profile?.university?.nameEn : profile?.university?.name,
    faculty: english ? profile?.faculty?.nameEn : profile?.faculty?.name,
    program: english ? profile?.studyProgram?.nameEn : profile?.studyProgram?.name,
    level: profile?.level,
    year: profile?.year,
  };

  // Materiali që studenti ka hapur: i plotë kur e lejon rrethi, i mbyllur kur jo.
  let material: AiRequest["material"] = null;
  if (context?.kind === "material") {
    const row = await db.material.findUnique({
      where: { id: context.id },
      select: {
        id: true,
        title: true,
        description: true,
        courseId: true,
        isHidden: true,
        uploaderId: true,
        course: {
          select: {
            name: true,
            nameEn: true,
            department: { select: { facultyId: true, faculty: { select: { universityId: true } } } },
          },
        },
      },
    });
    if (row) {
      const course = english ? row.course.nameEn : row.course.name;
      if (canViewMaterial(me.access, row).allowed) {
        const text = await materialText(row.id, asked);
        material = {
          title: row.title,
          course,
          text: [row.description, text].filter(Boolean).join("\n\n") || "(no text extracted from this file)",
        };
      } else {
        material = {
          title: row.title,
          course,
          text: "NOTE: this material is locked for this student. Do not describe its content; tell them it opens with Pro.",
        };
      }
    }
  }

  /*
    Pyetja që kërkohet te materialet.

    «Po për javën e fundit?» nuk ka asnjë fjalë të lëndës: e kërkuar vetëm, sjell
    materiale të rastësishme nga fakultete të tjera. Kur pyetja është e shkurtër
    dhe biseda ka një pyetje më parë, kërkimi i bashkon të dyja.
  */
  const previous = [...kept].reverse().find((message) => message.role === "user")?.content;
  const searchText = previous && asked.length < 80 ? `${previous} ${asked}` : asked;

  // Konteksti vjen vetëm nga rrethi i qasjes. Ajo që është jashtë numërohet, por
  // nuk i jepet kurrë modelit.
  const [found, lockedCount] = await Promise.all([
    retrieve(me.access, searchText, locale, material ? 2 : 4, input.context),
    countLockedMatches(me.access, searchText),
  ]);
  const sources: AiSource[] = found.filter((source) => source.materialId !== context?.id);

  /*
    Burimet nga interneti.

    Vetëm me Pro, dhe vetëm kur ofruesi është i konfiguruar. Kur nuk është, nuk
    ndodh asgjë dhe asgjë nuk pretendohet.
  */
  const web = limits.web && webSearchAvailable() ? await getWebSearch().search(asked, 3) : [];

  const saved = await db.aiMessage.create({
    data: {
      conversationId: thread.id,
      role: "user",
      content: question,
      attachments: JSON.stringify(attachments),
    },
    select: { id: true },
  });

  return {
    ok: true,
    conversationId: thread.id,
    userMessageId: saved.id,
    request: {
      mode: "chat" as AiMode,
      question: asked,
      sources,
      locale,
      history,
      web,
      images: await loadImages(attachments),
      student,
      material,
      summary,
    },
    lockedCount: material ? 0 : lockedCount,
    remaining: Math.max(0, limits.messagesPerDay - used - 1),
  };
}

/** Ruajtja e përgjigjes. Burimet janë ato të rikthimit, kurrë ato që thotë modeli. */
export async function finishAsk(
  conversationId: string,
  mode: AiMode,
  answer: { content: string; sources: AiSource[]; tokensIn: number; tokensOut: number },
) {
  await db.aiMessage.create({
    data: {
      conversationId,
      role: "assistant",
      content: answer.content,
      sourceIds: JSON.stringify(answer.sources.map((source) => source.materialId)),
      tokensIn: answer.tokensIn,
      tokensOut: answer.tokensOut,
    },
  });

  await db.aiConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date(), mode },
  });
}

/** Pyetja që dështoi nuk numërohet dhe nuk mbetet në bisedë: studenti e riprovon. */
export async function discardQuestion(userMessageId: string, conversationId: string) {
  await db.aiMessage.deleteMany({ where: { id: userMessageId } });
  // Biseda e hapur vetëm për këtë pyetje nuk mbetet bosh te historiku.
  const left = await db.aiMessage.count({ where: { conversationId } });
  if (left === 0) await db.aiConversation.deleteMany({ where: { id: conversationId } });
}

/**
 * Pas përgjigjes: titulli dhe përmbledhja.
 *
 * Titulli shkruhet nga modeli pas shkëmbimit të parë («Alfabeti shqip», jo
 * «Më trego alfabetin e shqipes»). Përmbledhja rifreskohet kur pjesa jashtë
 * dritares rritet me dhjetë mesazhe. Të dyja përdorin modelin ndihmës dhe
 * asnjëra nuk e prish bisedën kur dështon.
 */
export async function afterAnswer(conversationId: string) {
  const live = getAssistant().live;
  if (!live) return;

  const conversation = await db.aiConversation.findUnique({
    where: { id: conversationId },
    select: { titled: true, summary: true, summaryCount: true },
  });
  if (!conversation) return;

  if (!conversation.titled) {
    const first = await db.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 2,
      select: { role: true, content: true },
    });
    const text = first.map((message) => `${message.role}: ${message.content.slice(0, 600)}`).join("\n");
    // Modeli ndihmës arsyeton para se të shkruajë: me pak tokena kthente tekst bosh.
    const title = (await live.complete(TITLE_PROMPT, text, 400))?.replace(/^["'«»]+|["'«».]+$/g, "").trim();
    if (title && title.length <= 60) {
      await db.aiConversation.update({ where: { id: conversationId }, data: { title, titled: true } });
    }
  }

  await refreshSummary(conversationId, conversation.summary, conversation.summaryCount);
}

/**
 * Përmbledhja e pjesës që del jashtë dritares.
 *
 * Rifreskohet kur pjesa jashtë rritet me dhjetë mesazhe, ose kur nuk ekziston
 * fare. Kthen përmbledhjen e vlefshme, që `prepareAsk` ta përdorë menjëherë.
 */
async function refreshSummary(conversationId: string, current: string | null, covered: number) {
  const live = getAssistant().live;

  const messages = await db.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });
  const { dropped } = historyWindow(messages);
  if (dropped === 0) return null;
  if (!live || (current && dropped - covered < 10)) return current;

  const older = messages
    .slice(0, dropped)
    .map((message) => `${message.role}: ${message.content.slice(0, 600)}`)
    .join("\n");
  const input = current ? `Previous summary:\n${current}\n\nMessages:\n${older}` : older;
  const summary = await live.complete(SUMMARY_PROMPT, input.slice(-16_000), 1500);
  if (!summary) return current;

  await db.aiConversation.update({
    where: { id: conversationId },
    data: { summary, summaryCount: dropped },
  });
  return summary;
}

/** Sa pyetje ka bërë sot. Kufiri vjen nga `aiLimits`, jo nga një numër i ngulitur. */
async function usedToday(userId: string) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  return db.aiMessage.count({
    where: { role: "user", createdAt: { gte: since }, conversation: { userId } },
  });
}
