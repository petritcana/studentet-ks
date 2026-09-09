import Link from "next/link";
import { cn } from "@/lib/utils";

/** Shenja e markës: dy shkronja që formojnë një libër të hapur. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      aria-hidden
      focusable="false"
    >
      <rect width="32" height="32" rx="9" className="fill-brand-500" />
      <path
        d="M9 10.5c2.6-1 4.6-1 6 0v11.5c-1.4-1-3.4-1-6 0z"
        className="fill-white/95"
      />
      <path
        d="M23 10.5c-2.6-1-4.6-1-6 0v11.5c1.4-1 3.4-1 6 0z"
        className="fill-white/70"
      />
    </svg>
  );
}

export function BrandLogo({
  className,
  href = "/",
  showText = true,
}: {
  className?: string;
  href?: string;
  showText?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 rounded-sm", className)}
      aria-label="Studentët.KS, faqja kryesore"
    >
      <BrandMark />
      {showText ? (
        <span className="text-base font-semibold tracking-tight text-text">
          Studentët<span className="text-brand-500">.KS</span>
        </span>
      ) : null}
    </Link>
  );
}
