"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, Lock, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type PaywallContext =
  | { kind: "material"; faculty: string; ownFaculty: string }
  | { kind: "scope"; scope: string }
  | { kind: "assistant" }
  | { kind: "generic" };

/**
 * Fleta e Pro-s, e hapur nga çdo vend i kyçur.
 *
 * Toni nuk është kurrë agresiv. Konteksti është gjithmonë konkret, dhe rruga
 * falas përmes kontributit del përpara çmimeve, jo pas tyre.
 */
export function PaywallSheet({
  open,
  onOpenChange,
  context,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: PaywallContext;
}) {
  const t = useTranslations("pro");
  const tp = useTranslations("proPage");

  const title =
    context.kind === "material"
      ? t("lockedTitle", { faculty: context.faculty })
      : context.kind === "scope"
        ? t("lockedScopeTitle")
        : tp("title");

  const body =
    context.kind === "material"
      ? t("lockedBody", { ownFaculty: context.ownFaculty })
      : context.kind === "scope"
        ? t("lockedScopeBody", { scope: context.scope })
        : tp("subtitle");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:mx-auto sm:max-w-lg sm:rounded-t-xl">
        <SheetHeader>
          <span className="pro-gradient grid size-10 place-items-center rounded-full text-pro-contrast">
            <Lock className="size-5" />
          </span>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{body}</SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-4">
          <div className="rounded-md border border-border bg-surface-2 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-text">
              <Upload className="size-4 text-brand-500" />
              {t("earnBanner")}
            </p>
            <p className="mt-1 text-xs text-text-muted">{tp("earnedBody")}</p>
          </div>

          <ul className="flex flex-col gap-2">
            {["incl1", "incl2", "incl3", "incl4"].map((key) => (
              <li key={key} className="flex items-start gap-2 text-sm text-text">
                <Check className="mt-0.5 size-4 shrink-0 text-success-text" />
                {tp(key)}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Button asChild variant="pro" size="lg">
              <Link href="/une/pro">
                <Sparkles />
                {t("upgrade")}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/materialet/ngarko">{t("earnBanner")}</Link>
            </Button>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

/** Hook i vogël që e mban gjendjen dhe kontekstin e fletës në një vend. */
export function usePaywall() {
  const [open, setOpen] = React.useState(false);
  const [context, setContext] = React.useState<PaywallContext>({ kind: "generic" });

  return {
    open,
    setOpen,
    context,
    show(next: PaywallContext) {
      setContext(next);
      setOpen(true);
    },
  };
}
