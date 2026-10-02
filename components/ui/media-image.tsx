import NextImage from "next/image";

/**
 * Një foto e ngarkuar nga studenti.
 *
 * `next/image` e kërkon vetë skedarin nga serveri, pa cookie-n e sesionit. Rruga
 * jonë `/api/media/[id]` kërkon sesion, prandaj optimizuesi merr 401 dhe kthen
 * 400: storja dilte e zezë edhe pse fotoja ishte aty. Prandaj skedarët tanë
 * shfaqen me `<img>`, dhe optimizimi mbetet vetëm për burimet e jashtme, që
 * optimizuesi i merr dot.
 */
export function MediaImage({
  src,
  alt,
  fill,
  sizes,
  width,
  height,
  className,
  priority,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  // Avatarët e parazgjedhur janë SVG statikë: optimizuesi nuk i përpunon SVG-të.
  const isUpload = src.startsWith("/api/media/") || src.startsWith("/avatars/") || src.startsWith("data:");

  if (isUpload) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        loading={priority ? "eager" : "lazy"}
        className={fill ? `absolute inset-0 size-full ${className ?? ""}` : className}
      />
    );
  }

  if (fill) {
    return <NextImage src={src} alt={alt} fill sizes={sizes} className={className} priority={priority} />;
  }

  return (
    <NextImage
      src={src}
      alt={alt}
      width={width ?? 0}
      height={height ?? 0}
      sizes={sizes}
      className={className}
      priority={priority}
    />
  );
}
