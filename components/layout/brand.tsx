import Link from "next/link";
import { cn } from "@/lib/utils";

// Zemra me S brenda dhe kapelja e diplomimit sipër. Vizatohet me currentColor,
// që të funksionojë mbi çdo sfond.
export function BrandGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false" fill="none">
      <path
        d="M24 45C15 38.2 10 32.8 10 27C10 22.9 13 20 16.8 20C19.8 20 22.3 21.6 24 24.1C25.7 21.6 28.2 20 31.2 20C35 20 38 22.9 38 27C38 32.8 33 38.2 24 45Z"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <path
        d="M28.6 27H21.9C20.6 27 19.6 28 19.6 29.3C19.6 30.6 20.6 31.6 21.9 31.6H26.1C27.4 31.6 28.4 32.6 28.4 33.9C28.4 35.2 27.4 36.2 26.1 36.2H19.4"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 4.5L41.5 11.2L24 17.9L6.5 11.2L24 4.5Z" fill="currentColor" />
      <path d="M14.2 14.3V18.6C17 20.6 20.3 21.5 24 21.5C27.7 21.5 31 20.6 33.8 18.6V14.3L24 18.1L14.2 14.3Z" fill="currentColor" />
      <path d="M38.2 12.5V20.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M36.9 20.2H39.5L39 23.4H37.4L36.9 20.2Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Logoja: rrethi blu me kapelën mbi S-në në formë zemre, nga `public/brand/`.
 * Një skedar i vetëm për shiritin, asistentin dhe ikonat e PWA-së (`npm run icons`).
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo-128.png"
      alt=""
      width={44}
      height={44}
      aria-hidden
      className={cn("size-9 shrink-0 rounded-full shadow-glow-brand", className)}
    />
  );
}

export function BrandLogo({
  label,
  ariaLabel,
  className,
  href = "/",
  showText = true,
}: {
  label: string;
  ariaLabel: string;
  className?: string;
  href?: string;
  showText?: boolean;
}) {
  const [head, tail] = label.split(".");

  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5 rounded-md transition-opacity hover:opacity-95", className)}
      aria-label={ariaLabel}
    >
      <BrandMark className="transition-transform duration-150 group-hover:scale-[1.02] lg:size-11" />
      {showText ? (
        <span className="flex items-baseline font-display text-base font-extrabold uppercase tracking-[0.01em] text-text lg:text-[19px]">
          <span>{head}</span>
          {tail ? <span className="text-brand-word">.{tail}</span> : null}
        </span>
      ) : null}
    </Link>
  );
}
