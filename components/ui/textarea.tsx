"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  /** Rritet vetë me përmbajtjen, deri në maxRows. */
  autoGrow?: boolean;
  maxRows?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, autoGrow, maxRows = 12, onInput, ...props },
  ref,
) {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

  const setRefs = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const resize = React.useCallback(() => {
    const node = innerRef.current;
    if (!node || !autoGrow) return;
    node.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(node).lineHeight || "24");
    const padding = parseFloat(getComputedStyle(node).paddingTop || "0") + parseFloat(getComputedStyle(node).paddingBottom || "0");
    const limit = lineHeight * maxRows + padding;
    node.style.height = `${Math.min(node.scrollHeight, limit)}px`;
    // Mbi kufi teksti rrëshqet brenda fushës, që asnjë rresht të mos humbasë.
    node.style.overflowY = node.scrollHeight > limit ? "auto" : "hidden";
  }, [autoGrow, maxRows]);

  React.useEffect(resize, [resize, props.value]);

  return (
    <textarea
      ref={setRefs}
      aria-invalid={invalid || undefined}
      onInput={(event) => {
        resize();
        onInput?.(event);
      }}
      className={cn(
        "min-h-24 w-full resize-y rounded-control border border-border bg-surface-2 px-3 py-2 text-sm text-text",
        "placeholder:text-text-muted",
        "transition-colors duration-150 ease-brand",
        "hover:border-text-muted/50",
        "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-danger aria-invalid:focus:ring-danger/25",
        autoGrow && "resize-none overflow-hidden",
        className,
      )}
      {...props}
    />
  );
});
