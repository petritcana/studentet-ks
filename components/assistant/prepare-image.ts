/**
 * Imazhi para ngarkimit te asistenti.
 *
 * Një foto telefoni është 4 deri 12 megabajt, dhe modeli nuk sheh më shumë se
 * rreth 1600 piksela. Zvogëlohet këtu, në shfletues, që ngarkimi të jetë i shpejtë
 * edhe me internet të dobët dhe kërkesa te modeli të mos kalojë kufirin e tij.
 * Imazhi i vogël kalon ashtu siç është.
 */
const MAX_SIDE = 1600;
/** Groq nuk pranon imazhe nën 32 piksela për anë: të vegjlit zmadhohen. */
const MIN_SIDE = 64;
const MAX_BYTES_AS_IS = 1_500_000;

export async function prepareImage(file: File): Promise<File | null> {
  if (!file.type.startsWith("image/")) return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Shfletuesi nuk e lexon (p.sh. HEIC te Chrome): kalon vetëm nëse është i vogël.
    return file.size <= MAX_BYTES_AS_IS && /jpe?g|png|webp|gif/.test(file.type) ? file : null;
  }

  const shortest = Math.min(bitmap.width, bitmap.height);
  const scale =
    shortest < MIN_SIDE
      ? MIN_SIDE / shortest
      : Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= MAX_BYTES_AS_IS && /jpe?g|png|webp/.test(file.type)) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return null;
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) return null;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}
