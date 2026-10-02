"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, Check, Eraser, Image as ImageIcon, Pencil, Smile, Type, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { createStory } from "@/lib/actions/stories";
import { MAX_STORY_VIDEO_SECONDS } from "@/lib/media";
import { readMediaMeta, uploadFile } from "@/lib/upload-client";
import {
  BRUSH_SIZES,
  FILTER_CSS,
  STORY_FILTERS,
  STORY_HEIGHT,
  STORY_WIDTH,
  TEXT_COLORS,
  drawStrokes,
  drawTexts,
  emptyLayers,
  layersText,
  type StoryFilter,
  type Stroke,
  type TextLayer,
} from "@/lib/story-layers";
import { cn } from "@/lib/utils";

const STICKERS = ["🔥", "📚", "☕", "💡", "🎓", "😂", "❤️", "🙌", "⏰", "✅"];

type Tool = "none" | "text" | "draw" | "sticker";

/**
 * Krijimi i një storje.
 *
 * Hapi i parë është foto ose video, asgjë tjetër: pa ekran ndërmjetës dhe pa
 * zgjedhje shtrirjeje. Pastaj hapet editori, ku teksti, vizatimi dhe emoji-t
 * piqen brenda fotos para ngarkimit.
 */
export function StoryEditor({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const t = useTranslations("stories");
  const tc = useTranslations("common");
  const te = useTranslations("errors");

  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [meta, setMeta] = React.useState<{ width: number | null; height: number | null; durationSeconds: number | null }>({
    width: null,
    height: null,
    durationSeconds: null,
  });

  const [filter, setFilter] = React.useState<StoryFilter>("none");
  const [texts, setTexts] = React.useState<TextLayer[]>([]);
  const [strokes, setStrokes] = React.useState<Stroke[]>([]);
  const [tool, setTool] = React.useState<Tool>("none");
  const [color, setColor] = React.useState<string>(TEXT_COLORS[0]);
  const [brush, setBrush] = React.useState<number>(BRUSH_SIZES[1]);
  const [eraser, setEraser] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [muted, setMuted] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);

  const stageRef = React.useRef<HTMLDivElement>(null);
  const cameraInput = React.useRef<HTMLInputElement>(null);
  const galleryInput = React.useRef<HTMLInputElement>(null);
  const dragRef = React.useRef<{ id: string; offsetX: number; offsetY: number; startX: number; startY: number; moved: boolean } | null>(null);
  const gestureRef = React.useRef<{ x: number; y: number; at: { x: number; y: number } } | null>(null);
  const [filterFlash, setFilterFlash] = React.useState<StoryFilter | null>(null);

  // Emri i filtrit del për një çast mbi foto pas rrëshqitjes, pastaj zhduket.
  React.useEffect(() => {
    if (!filterFlash) return;
    const timer = window.setTimeout(() => setFilterFlash(null), 900);
    return () => window.clearTimeout(timer);
  }, [filterFlash]);
  const strokeRef = React.useRef<Stroke | null>(null);

  const isVideo = Boolean(file?.type.startsWith("video/"));

  React.useEffect(() => {
    if (!open) reset();
  }, [open]);

  React.useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    void readMediaMeta(file).then(setMeta);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setTexts([]);
    setStrokes([]);
    setFilter("none");
    setTool("none");
    setEditingId(null);
    setProgress(null);
    setMuted(false);
  }

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;

    if (picked.type.startsWith("video/")) {
      const info = await readMediaMeta(picked);
      if (info.durationSeconds !== null && info.durationSeconds > MAX_STORY_VIDEO_SECONDS + 0.5) {
        toast.error(te("uploadTooLong", { seconds: MAX_STORY_VIDEO_SECONDS }));
        return;
      }
    }
    setFile(picked);
  }

  // ---- shtresat e tekstit -------------------------------------------------

  function addText(kind: "text" | "sticker", value: string, at: { x: number; y: number } = { x: 0.5, y: 0.5 }) {
    const layer: TextLayer = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      kind,
      text: value,
      x: at.x,
      y: at.y,
      scale: 1,
      rotation: 0,
      color,
      highlight: false,
    };
    setTexts((current) => [...current, layer]);
    if (kind === "text") setEditingId(layer.id);
  }

  function updateText(id: string, patch: Partial<TextLayer>) {
    setTexts((current) => current.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)));
  }

  function removeText(id: string) {
    setTexts((current) => current.filter((layer) => layer.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function stagePoint(event: React.PointerEvent) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0.5, y: 0.5 };
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }

  function startDrag(event: React.PointerEvent, layer: TextLayer) {
    if (tool === "draw" || editingId === layer.id) return;
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    const point = stagePoint(event);
    dragRef.current = { id: layer.id, offsetX: point.x - layer.x, offsetY: point.y - layer.y, startX: event.clientX, startY: event.clientY, moved: false };
  }

  function moveDrag(event: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4) drag.moved = true;
    if (!drag.moved) return;
    const point = stagePoint(event);
    updateText(drag.id, { x: point.x - drag.offsetX, y: point.y - drag.offsetY });
  }

  /** Prekja pa lëvizje mbi një tekst e hap për shkrim, aty ku është. */
  function endDrag() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && !drag.moved) {
      const layer = texts.find((item) => item.id === drag.id);
      if (layer?.kind === "text") setEditingId(layer.id);
    }
  }

  // ---- prekja mbi foto: tekst aty ku prek, ose filtër me rrëshqitje -------

  function stageDown(event: React.PointerEvent) {
    if (tool === "draw") {
      startStroke(event);
      return;
    }
    gestureRef.current = { x: event.clientX, y: event.clientY, at: stagePoint(event) };
  }

  function stageUp(event: React.PointerEvent) {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (!gesture || tool === "draw") return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;

    // Rrëshqitje anash: filtri tjetër ose i mëparshmi, si te telefoni.
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      shiftFilter(dx < 0 ? 1 : -1);
      return;
    }
    if (Math.hypot(dx, dy) > 8) return;

    // Një prekje e thjeshtë: mbyll tekstin që po shkruhet, ose nis një të ri aty.
    if (editingId) {
      finishEditing();
      return;
    }
    if (tool === "sticker") return;
    addText("text", "", gesture.at);
  }

  function shiftFilter(step: number) {
    const index = STORY_FILTERS.indexOf(filter);
    const next = STORY_FILTERS[(index + step + STORY_FILTERS.length) % STORY_FILTERS.length];
    setFilter(next);
    setFilterFlash(next);
  }

  /** Teksti bosh nuk mbetet si shtresë e padukshme. */
  function finishEditing() {
    setTexts((current) => current.filter((layer) => layer.kind !== "text" || layer.text.trim().length > 0));
    setEditingId(null);
  }

  // ---- vizatimi -----------------------------------------------------------

  function startStroke(event: React.PointerEvent) {
    if (tool !== "draw") return;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    strokeRef.current = { color, size: brush, eraser, points: [stagePoint(event)] };
    setStrokes((current) => [...current, strokeRef.current!]);
  }

  function extendStroke(event: React.PointerEvent) {
    if (!strokeRef.current) return;
    const point = stagePoint(event);
    strokeRef.current.points.push(point);
    setStrokes((current) => [...current.slice(0, -1), { ...strokeRef.current! }]);
  }

  function endStroke() {
    strokeRef.current = null;
  }

  function undo() {
    if (strokes.length > 0) {
      setStrokes((current) => current.slice(0, -1));
      return;
    }
    setTexts((current) => current.slice(0, -1));
  }

  // ---- publikimi ----------------------------------------------------------

  /** Pjekja e fotos: media, filtri, vijat dhe teksti bëhen një imazh i vetëm. */
  async function flattenImage(source: string): Promise<File | null> {
    const image = new Image();
    image.src = source;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    }).catch(() => null);
    if (!image.naturalWidth) return null;

    const canvas = document.createElement("canvas");
    canvas.width = STORY_WIDTH;
    canvas.height = STORY_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Fotoja e mbush tërë storjen, si te parapamja: pritet në anë, nuk zvogëlohet në mes.
    ctx.filter = FILTER_CSS[filter] === "none" ? "none" : FILTER_CSS[filter];
    const coverScale = Math.max(STORY_WIDTH / image.naturalWidth, STORY_HEIGHT / image.naturalHeight);
    drawCentered(ctx, image, coverScale);
    ctx.filter = "none";

    drawStrokes(ctx, strokes, STORY_WIDTH, STORY_HEIGHT);
    drawTexts(ctx, texts, STORY_WIDTH, STORY_HEIGHT);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.92));
    if (!blob) return null;
    return new File([blob], "story.webp", { type: "image/webp" });
  }

  function drawCentered(ctx: CanvasRenderingContext2D, image: HTMLImageElement, scale: number) {
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.drawImage(image, (STORY_WIDTH - width) / 2, (STORY_HEIGHT - height) / 2, width, height);
  }

  function publish() {
    if (!file || !previewUrl) return;

    void (async () => {
      setProgress(0);

      const layers = { ...emptyLayers(), filter, texts, strokes, muted };
      const caption = layersText(layers);

      const toUpload = isVideo ? file : await flattenImage(previewUrl);
      if (!toUpload) {
        setProgress(null);
        toast.error(tc("retry"));
        return;
      }

      const result = await uploadFile(toUpload, {
        surface: "story",
        durationSeconds: meta.durationSeconds,
        width: isVideo ? meta.width : STORY_WIDTH,
        height: isVideo ? meta.height : STORY_HEIGHT,
        onProgress: setProgress,
      });

      if (!result.ok) {
        setProgress(null);
        toast.error(errorText(result.errorKey));
        return;
      }

      const created = await createStory({
        kind: isVideo ? "video" : "image",
        mediaUrl: `/api/media/${result.media.id}`,
        caption,
        // Te fotot shtresat janë pjekur brenda; ruhen vetëm për qasshmërinë.
        layers: JSON.stringify(layers),
      });

      setProgress(null);
      if (!created.ok) {
        toast.error(
          created.messageKey === "stories.errorDailyLimit" ? t("errorDailyLimit") : tc("retry"),
        );
        return;
      }

      toast.success(t("created"));
      onOpenChange(false);
      router.refresh();
    })();
  }

  function errorText(key: string) {
    if (key.startsWith("errors.")) {
      return te(key.replace("errors.", ""), { seconds: MAX_STORY_VIDEO_SECONDS, size: 8 });
    }
    return tc("retry");
  }

  if (!open) return null;

  // ---- hapi i parë: foto ose video ---------------------------------------

  if (!file) {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-bg/90 p-4 backdrop-blur-sm">
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-border bg-surface-solid p-5 shadow-lifted">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold text-text">{t("add")}</h2>
            <Button variant="ghost" size="iconSm" aria-label={tc("close")} onClick={() => onOpenChange(false)}>
              <X />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraInput.current?.click()}
              className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface-2 p-5 text-sm font-medium text-text transition-colors hover:border-brand-500/50"
            >
              <Camera className="size-6 text-brand-500" />
              {t("takePhoto")}
            </button>
            <button
              type="button"
              onClick={() => galleryInput.current?.click()}
              className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface-2 p-5 text-sm font-medium text-text transition-colors hover:border-brand-500/50"
            >
              <ImageIcon className="size-6 text-brand-500" />
              {t("fromGallery")}
            </button>
          </div>

          <p className="text-xs text-text-muted">{t("videoLimit", { seconds: MAX_STORY_VIDEO_SECONDS })}</p>

          {/* `capture` e hap kamerën drejt në telefon; në desktop bie te zgjedhësi i zakonshëm. */}
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
          <input ref={galleryInput} type="file" accept="image/*,video/*" hidden onChange={pick} />
        </div>
      </div>
    );
  }

  // ---- editori ------------------------------------------------------------

  const editing = texts.find((layer) => layer.id === editingId) ?? null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg/95 backdrop-blur-sm">
      <header className="flex items-center justify-between gap-2 p-3">
        <Button variant="ghost" size="iconSm" aria-label={tc("close")} onClick={() => onOpenChange(false)}>
          <X />
        </Button>

        <div className="flex items-center gap-1">
          <ToolButton active={tool === "text"} label={t("toolText")} onClick={() => { setTool("text"); addText("text", ""); }}>
            <Type />
          </ToolButton>
          <ToolButton active={tool === "draw"} label={t("toolDraw")} onClick={() => setTool(tool === "draw" ? "none" : "draw")}>
            <Pencil />
          </ToolButton>
          <ToolButton active={tool === "sticker"} label={t("toolStickers")} onClick={() => setTool(tool === "sticker" ? "none" : "sticker")}>
            <Smile />
          </ToolButton>
          <ToolButton active={false} label={tc("undo")} onClick={undo}>
            <Undo2 />
          </ToolButton>
        </div>

        <Button size="sm" onClick={publish} loading={progress !== null}>
          {progress !== null ? `${progress}%` : t("publish")}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 px-3">
        <div
          ref={stageRef}
          onPointerDown={stageDown}
          onPointerMove={(event) => {
            moveDrag(event);
            extendStroke(event);
          }}
          onPointerUp={(event) => {
            endDrag();
            endStroke();
            stageUp(event);
          }}
          data-story-stage
          className={cn(
            "relative aspect-[9/16] min-h-0 w-auto max-w-full flex-1 touch-none overflow-hidden rounded-card bg-black",
            tool === "draw" ? "cursor-crosshair" : "cursor-text",
          )}
        >
          {/* Fotoja ose videoja e mbush tërë storjen, si del edhe pas publikimit. */}
          {isVideo ? (
            <video
              src={previewUrl ?? undefined}
              className="pointer-events-none size-full object-cover"
              style={{ filter: FILTER_CSS[filter] }}
              autoPlay
              loop
              muted={muted}
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl ?? ""}
              alt=""
              draggable={false}
              className="pointer-events-none size-full select-none object-cover"
              style={{ filter: FILTER_CSS[filter] }}
            />
          )}

          <StrokeCanvas strokes={strokes} />

          {texts.map((layer) =>
            layer.id === editingId ? (
              <InlineText
                key={layer.id}
                layer={layer}
                placeholder={t("textPlaceholder")}
                onChange={(text) => updateText(layer.id, { text: text.slice(0, 120) })}
                onDone={finishEditing}
              />
            ) : (
              <button
                key={layer.id}
                type="button"
                onPointerDown={(event) => startDrag(event, layer)}
                style={layerStyle(layer)}
                className={cn(
                  "absolute max-w-[80%] cursor-move whitespace-pre-wrap rounded px-2 py-0.5 text-center font-semibold leading-tight",
                  layer.kind === "sticker" ? "text-4xl" : "text-xl",
                )}
              >
                {layer.text}
              </button>
            ),
          )}

          {filterFlash ? (
            <span className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-2xl font-extrabold text-white drop-shadow-lg">
              {t(`filter_${filterFlash}`)}
            </span>
          ) : null}

          {texts.length === 0 && tool === "none" ? (
            <span className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs font-medium text-white/80 drop-shadow">
              {t("tapToWrite")}
            </span>
          ) : null}
        </div>

        {/* Filtrat: nën foto në kompjuter; në telefon rrëshqitet mbi foto, këtu mbeten pikat. */}
        <div className="flex max-w-full items-center gap-1.5 overflow-x-auto scrollbar-none pb-1" data-story-filters>
          {STORY_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              aria-label={t(`filter_${value}`)}
              onClick={() => setFilter(value)}
              className={cn(
                "shrink-0 rounded-full transition-colors duration-150",
                "size-2 sm:size-auto sm:px-3 sm:py-1.5 sm:text-xs sm:font-semibold",
                filter === value
                  ? "bg-primary text-on-primary"
                  : "bg-border-strong text-text-muted sm:bg-surface-2 sm:hover:text-text",
              )}
            >
              <span className="hidden sm:inline">{t(`filter_${value}`)}</span>
            </button>
          ))}
          {isVideo ? (
            <Button variant="secondary" size="sm" className="ml-2 hidden sm:inline-flex" onClick={() => setMuted(!muted)}>
              {muted ? t("unmute") : t("mute")}
            </Button>
          ) : null}
        </div>
        <p className="-mt-2 text-[11px] text-text-muted sm:hidden">{t("swipeFilters")}</p>
      </div>

      <footer className="flex flex-col items-center gap-2 p-3">
        {tool === "sticker" ? (
          <div className="flex flex-wrap gap-1.5">
            {STICKERS.map((sticker) => (
              <button
                key={sticker}
                type="button"
                onClick={() => addText("sticker", sticker)}
                className="grid size-10 place-items-center rounded-lg bg-surface-2 text-xl hover:bg-border/60"
              >
                {sticker}
              </button>
            ))}
          </div>
        ) : null}

        {tool === "draw" ? (
          <div className="flex flex-wrap items-center gap-2">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={brush === size && !eraser}
                aria-label={t("brushSize", { size })}
                onClick={() => {
                  setBrush(size);
                  setEraser(false);
                }}
                className={cn(
                  "grid size-9 place-items-center rounded-lg bg-surface-2",
                  brush === size && !eraser && "outline outline-2 outline-brand-500",
                )}
              >
                <span className="rounded-full bg-text" style={{ width: size / 2, height: size / 2 }} />
              </button>
            ))}
            <ToolButton active={eraser} label={t("eraser")} onClick={() => setEraser(!eraser)}>
              <Eraser />
            </ToolButton>
          </div>
        ) : null}

        {editing ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => updateText(editing.id, { highlight: !editing.highlight })}>
                {t("highlight")}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => updateText(editing.id, { scale: Math.min(2.4, editing.scale + 0.2) })}>
                A+
              </Button>
              <Button variant="secondary" size="sm" onClick={() => updateText(editing.id, { scale: Math.max(0.5, editing.scale - 0.2) })}>
                A-
              </Button>
              <Button variant="ghost" size="sm" onClick={() => removeText(editing.id)}>
                {tc("delete")}
              </Button>
              <Button variant="ghost" size="sm" onClick={finishEditing}>
                <Check />
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {TEXT_COLORS.map((value) => (
            <button
              key={value}
              type="button"
              aria-label={value}
              onClick={() => {
                setColor(value);
                if (editing) updateText(editing.id, { color: value });
              }}
              style={{ backgroundColor: value }}
              className={cn("size-7 rounded-full border border-border", color === value && "ring-2 ring-brand-500")}
            />
          ))}

          {isVideo ? (
            <Button variant="secondary" size="sm" className="ml-auto sm:hidden" onClick={() => setMuted(!muted)}>
              {muted ? t("unmute") : t("mute")}
            </Button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

function ToolButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text [&_svg]:size-4",
        active && "bg-brand-500/15 text-brand-500",
      )}
    >
      {children}
    </button>
  );
}

/** Vijat vizatohen në një kanavacë mbi median, me të njëjtën formulë si te pjekja. */
function StrokeCanvas({ strokes }: { strokes: Stroke[] }) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStrokes(ctx, strokes, canvas.width, canvas.height);
  }, [strokes]);

  return (
    <canvas
      ref={ref}
      width={STORY_WIDTH / 2}
      height={STORY_HEIGHT / 2}
      className="pointer-events-none absolute inset-0 size-full"
    />
  );
}

/** Pozicioni dhe pamja e një shtrese teksti mbi foto. */
function layerStyle(layer: TextLayer): React.CSSProperties {
  return {
    left: `${layer.x * 100}%`,
    top: `${layer.y * 100}%`,
    transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})`,
    color: layer.color,
    background: layer.highlight ? (layer.color === "#ffffff" ? "rgba(11,17,16,0.72)" : "rgba(255,255,255,0.86)") : "transparent",
  };
}

/**
 * Shkrimi drejt mbi foto, aty ku u prek.
 *
 * Nuk ka kuti teksti më vete: kursori del te vendi i tekstit dhe shkronjat dalin
 * aty, me ngjyrën dhe madhësinë që do të ketë storja. Esc ose prekja jashtë e mbyll.
 */
function InlineText({
  layer,
  placeholder,
  onChange,
  onDone,
}: {
  layer: TextLayer;
  placeholder: string;
  onChange: (text: string) => void;
  onDone: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  // Teksti vendoset një herë; pastaj e mban vetë elementi, që kursori të mos kërcejë.
  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.innerText = layer.text;
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    // Vetëm kur hapet: teksti pastaj rrjedh nga elementi te gjendja, jo anasjelltas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer.id]);

  return (
    <div
      ref={ref}
      role="textbox"
      aria-multiline="true"
      aria-label={placeholder}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      data-story-text-editor
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onInput={(event) => onChange(event.currentTarget.innerText)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onDone();
        }
      }}
      style={layerStyle(layer)}
      className={cn(
        "absolute min-w-[3ch] max-w-[80%] cursor-text whitespace-pre-wrap break-words rounded px-2 py-0.5 text-center text-xl font-semibold leading-tight outline-none",
        "caret-current ring-2 ring-white/70",
        "empty:before:pointer-events-none empty:before:text-white/60 empty:before:content-[attr(data-placeholder)]",
      )}
    />
  );
}
