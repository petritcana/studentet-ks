import Link from "next/link";
import { facultyStyle, type FacultyCode } from "@/lib/faculties";
import { cn } from "@/lib/utils";

/**
 * Emri i shkurtër i fakultetit me pikën e ngjyrës së tij, 6px.
 *
 * Emri vjen nga thirrësi, sepse në prodhim rrjedh nga baza (`nameSq`/`nameEn`),
 * jo nga katalogu. Këtu jetojnë vetëm ngjyra dhe forma.
 */
export function FacultyChip({
  code,
  label,
  href,
  ariaLabel,
  className,
  size = "md",
}: {
  code: FacultyCode | string;
  label: string;
  href?: string;
  ariaLabel?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const content = (
    <>
      <span
        className={cn("shrink-0 rounded-full bg-faculty", size === "sm" ? "size-1.5" : "size-1.5")}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </>
  );

  const classes = cn(
    "inline-flex items-center gap-1.5",
    size === "sm" ? "text-xs" : "text-sm",
    href && "transition-colors duration-150 hover:text-faculty-text",
    className,
  );

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={classes} style={facultyStyle(code)}>
        {content}
      </Link>
    );
  }

  return (
    <span className={classes} style={facultyStyle(code)}>
      {content}
    </span>
  );
}
