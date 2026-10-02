import { cn } from "@/lib/utils";

/**
 * Shenja e asistentit: logoja e Studentët.KS me etiketën «AI» në ar poshtë djathtas.
 * `launcher` është butoni pluskues, rreth 60px me dritën blu të markës.
 */
export function AssistantMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "launcher";
}) {
  const launcher = size === "launcher";
  const dims = { sm: "size-7", md: "size-11", lg: "size-14", launcher: "size-[62px]" }[size];
  const tag = {
    sm: "text-[7px] px-0.5 -bottom-1 -right-1 rounded-[4px] border",
    md: "text-[9px] px-1 -bottom-1 -right-1 rounded-[5px] border-2",
    lg: "text-[10px] px-1 -bottom-1 -right-1 rounded-[6px] border-2",
    launcher: "text-[10px] px-1.5 py-px -bottom-1 -right-1.5 rounded-[7px] border-2",
  }[size];

  return (
    <span className={cn("relative inline-flex shrink-0", dims, className)} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-128.png"
        alt=""
        width={62}
        height={62}
        className={cn("size-full rounded-full", launcher ? "shadow-glow-ai" : "shadow-glow-brand")}
      />
      <span
        className={cn(
          "absolute border-bg bg-ai-badge font-sans font-extrabold leading-4 text-on-ai-badge",
          tag,
        )}
      >
        AI
      </span>
    </span>
  );
}
