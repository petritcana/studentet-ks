/**
 * Zvogëlimi i fotos në shfletues, para ngarkimit.
 *
 * Fotot e telefonit sot kanë 5 deri 20 megabajt dhe 4000 piksela e lart. Për
 * feed-in, mesazhet dhe profilin mjaftojnë 2560 piksela: fotoja ngarkohet në
 * sekonda, kursehet interneti i studentit dhe hapësira në server. Zvogëlohet
 * vetëm kur ia vlen (skedari i madh ose pikselat shumë), dhe kurrë kur rezultati
 * do të ishte më i rëndë se origjinali.
 *
 * GIF-i mbetet ashtu siç është, që të mos humbasë lëvizjen. Një format që
 * shfletuesi nuk e hap dot (p.sh. HEIC jashtë Safari-t) ngarkohet i paprekur.
 */

export const MAX_IMAGE_EDGE = 2560;
/** Nën këtë madhësi dhe brenda pikselave, fotoja nuk preket fare. */
const LIGHT_ENOUGH_BYTES = 1.5 * 1024 * 1024;
const QUALITY = 0.86;
/** Llojet që serveri i pranon siç janë (`IMAGE_TYPES` te `lib/media.ts`). Të tjerat kthehen gjithmonë. */
const SERVER_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void } | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Disa shfletues nuk e kanë opsionin e orientimit: provohet me <img>.
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () =>
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        close: () => URL.revokeObjectURL(url),
      });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  const decoded = await decode(file);
  if (!decoded) return file;

  try {
    const longest = Math.max(decoded.width, decoded.height);
    // AVIF, BMP e të tjera që shfletuesi i hap, por serveri jo, kthehen gjithmonë.
    // HEIC-u kthehet sa herë shfletuesi e hap (Safari), që ta shohin të gjithë.
    const mustConvert = !SERVER_TYPES.includes(file.type) || file.type === "image/heic" || file.type === "image/heif";
    if (!mustConvert && longest <= MAX_IMAGE_EDGE && file.size <= LIGHT_ENOUGH_BYTES) return file;

    const scale = Math.min(1, MAX_IMAGE_EDGE / longest);
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(decoded.source, 0, 0, width, height);

    // PNG dhe WebP mund të kenë tejdukshmëri: shkojnë në WebP. Të tjerat në JPEG.
    const keepsAlpha = file.type === "image/png" || file.type === "image/webp";
    let blob = await toBlob(canvas, keepsAlpha ? "image/webp" : "image/jpeg");
    // Safari i vjetër nuk shkruan WebP dhe kthen PNG: atëherë mbetet JPEG-u.
    if (keepsAlpha && blob && blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg");
    // Mbi kufirin e pikselave zvogëlohet gjithmonë; brenda tij vetëm kur del më e lehtë.
    const tooLarge = longest > MAX_IMAGE_EDGE;
    if (!blob || (!mustConvert && !tooLarge && blob.size >= file.size)) return file;

    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    const name = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${name}.${extension}`, { type: blob.type, lastModified: file.lastModified });
  } finally {
    decoded.close();
  }
}
