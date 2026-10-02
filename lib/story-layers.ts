/**
 * Shtresat e një storje.
 *
 * Te fotot shtresat piqen brenda imazhit para ngarkimit, që storja të duket
 * njësoj kudo. Te videot ato ruhen si JSON dhe vizatohen sipër gjatë shikimit,
 * sepse rikodimi i videos në shfletues do të ishte i ngadaltë dhe i pabesueshëm.
 * Teksti ruhet gjithmonë edhe si varg i lexueshëm, që storja të ketë përshkrim.
 */

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

export const TEXT_COLORS = ["#ffffff", "#0b1110", "#2dd4bf", "#f59e0b", "#ef4444", "#a855f7"] as const;
export const BRUSH_SIZES = [6, 14, 28] as const;

export const STORY_FILTERS = ["none", "warm", "cool", "mono", "punch"] as const;
export type StoryFilter = (typeof STORY_FILTERS)[number];

/** Filtrat janë vlera CSS, që preview-ja dhe pjekja të përdorin të njëjtën gjë. */
export const FILTER_CSS: Record<StoryFilter, string> = {
  none: "none",
  warm: "saturate(1.2) sepia(0.22) contrast(1.05)",
  cool: "saturate(1.1) hue-rotate(-12deg) brightness(1.03)",
  mono: "grayscale(1) contrast(1.1)",
  punch: "contrast(1.35) saturate(1.3)",
};

export type TextLayer = {
  id: string;
  kind: "text" | "sticker";
  text: string;
  /** Pozicioni si pjesë e gjerësisë dhe e lartësisë, që të mos varet nga ekrani. */
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color: string;
  highlight: boolean;
};

export type Stroke = {
  color: string;
  size: number;
  eraser: boolean;
  /** Pikat si pjesë e përmasave, njësoj si shtresat e tekstit. */
  points: { x: number; y: number }[];
};

export type StoryLayers = {
  version: 1;
  filter: StoryFilter;
  texts: TextLayer[];
  strokes: Stroke[];
  /** Vetëm për video. */
  trimStart?: number;
  trimEnd?: number;
  muted?: boolean;
};

export function emptyLayers(): StoryLayers {
  return { version: 1, filter: "none", texts: [], strokes: [] };
}

/** Teksti i të gjitha shtresave, për përshkrimin dhe për lexuesit e ekranit. */
export function layersText(layers: StoryLayers): string {
  return layers.texts
    .map((layer) => layer.text.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 200);
}

export function parseLayers(value: string | null | undefined): StoryLayers | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as StoryLayers;
    if (parsed?.version !== 1) return null;
    return { ...emptyLayers(), ...parsed };
  } catch {
    return null;
  }
}

/** Vizaton vijat e vizatimit mbi një kanavacë të gatshme. */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], width: number, height: number) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;
    ctx.globalCompositeOperation = stroke.eraser ? "destination-out" : "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = (stroke.size / STORY_WIDTH) * width;

    ctx.beginPath();
    stroke.points.forEach((point, index) => {
      const x = point.x * width;
      const y = point.y * height;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    if (stroke.points.length === 1) {
      const point = stroke.points[0];
      ctx.lineTo(point.x * width + 0.1, point.y * height + 0.1);
    }
    ctx.stroke();
  }

  ctx.restore();
}

/** Vizaton shtresat e tekstit. E njëjta formulë si te preview-ja në HTML. */
export function drawTexts(ctx: CanvasRenderingContext2D, texts: TextLayer[], width: number, height: number) {
  for (const layer of texts) {
    const fontSize = (layer.kind === "sticker" ? 96 : 56) * layer.scale * (width / STORY_WIDTH);
    ctx.save();
    ctx.translate(layer.x * width, layer.y * height);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;

    const lines = layer.text.split("\n");
    const lineHeight = fontSize * 1.2;
    const top = -((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, index) => {
      const y = top + index * lineHeight;
      if (layer.highlight) {
        const metrics = ctx.measureText(line);
        const padding = fontSize * 0.25;
        ctx.fillStyle = layer.color === "#ffffff" ? "rgba(11,17,16,0.72)" : "rgba(255,255,255,0.86)";
        ctx.fillRect(
          -metrics.width / 2 - padding,
          y - lineHeight / 2 - padding / 2,
          metrics.width + padding * 2,
          lineHeight + padding,
        );
      }
      ctx.fillStyle = layer.color;
      ctx.fillText(line, 0, y);
    });

    ctx.restore();
  }
}
