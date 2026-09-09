"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { BadgeCheck } from "lucide-react";
import { cn, initialsOf, stableHash } from "@/lib/utils";

/**
 * Gradientë të ngrohtë, të zgjedhur që teksti i bardhë sipër tyre të kalojë
 * kontrastin AA. I njëjti emër jep gjithmonë të njëjtin gradient.
 */
const AVATAR_GRADIENTS = [
  ["#4F46E5", "#7C3AED"],
  ["#DB2777", "#9333EA"],
  ["#0891B2", "#2563EB"],
  ["#059669", "#0D9488"],
  ["#D97706", "#DC2626"],
  ["#7C3AED", "#2563EB"],
  ["#C026D3", "#DB2777"],
  ["#0F766E", "#059669"],
] as const;

export function gradientFor(seed: string) {
  const [from, to] = AVATAR_GRADIENTS[stableHash(seed) % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
}

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-24 text-3xl",
} as const;

export type AvatarSize = keyof typeof SIZES;

export function Avatar({
  name,
  src,
  size = "md",
  verified = false,
  className,
  ring = false,
}: {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  verified?: boolean;
  className?: string;
  ring?: boolean;
}) {
  const initials = initialsOf(name);

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <AvatarPrimitive.Root
        className={cn(
          "inline-flex select-none items-center justify-center overflow-hidden rounded-full",
          ring && "ring-2 ring-brand-500/40 ring-offset-2 ring-offset-bg",
          SIZES[size],
        )}
      >
        {src ? (
          <AvatarPrimitive.Image
            src={src}
            alt={name}
            className="size-full object-cover"
          />
        ) : null}
        <AvatarPrimitive.Fallback
          delayMs={src ? 200 : 0}
          className="flex size-full items-center justify-center font-semibold text-white"
          style={{ backgroundImage: gradientFor(name) }}
        >
          {initials}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>

      {verified ? (
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full bg-bg p-px"
          title="Studente ose student i verifikuar"
        >
          <BadgeCheck
            className={cn(
              "text-brand-500",
              size === "xs" || size === "sm" ? "size-3" : "size-4",
            )}
            aria-label="I verifikuar"
          />
        </span>
      ) : null}
    </span>
  );
}

/** Grumbull avatarësh mbivendosur, me numër për ata që tepërojnë. */
export function AvatarStack({
  people,
  max = 4,
  size = "sm",
  className,
}: {
  people: { name: string; avatar?: string | null }[];
  max?: number;
  size?: AvatarSize;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;

  return (
    <span className={cn("flex items-center", className)}>
      {shown.map((person) => (
        <span key={person.name} className="-ml-2 first:ml-0 rounded-full ring-2 ring-bg">
          <Avatar name={person.name} src={person.avatar} size={size} />
        </span>
      ))}
      {rest > 0 ? (
        <span
          className={cn(
            "-ml-2 inline-flex items-center justify-center rounded-full bg-surface-2 font-medium text-text-muted ring-2 ring-bg",
            SIZES[size],
          )}
        >
          +{rest}
        </span>
      ) : null}
    </span>
  );
}
