"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Camera, FileText, ImagePlus, Mic, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * «+» brenda fushës së shkrimit: Foto ose video, Bëj foto, Skedar dhe Mesazh zëri.
 *
 * Bashkëngjitjet nuk zënë më rresht më vete mbi fushë. Rrinë te një meny e vetme,
 * si te çdo bisedë që studenti e njeh, dhe fusha mbetet e pastër për tekstin.
 */
export function AttachMenu({
  onMedia,
  onCamera,
  onFile,
  onVoice,
  disabled = false,
  className,
}: {
  onMedia: () => void;
  onCamera: () => void;
  onFile: () => void;
  /** Pa këtë, zëri nuk del në meny (p.sh. te biseda e dhomës së zërit). */
  onVoice?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const t = useTranslations("messages");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={t("attach")}
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full bg-surface text-text-muted transition-[color,transform] duration-150 hover:text-text data-[state=open]:rotate-45 data-[state=open]:text-text disabled:opacity-50",
            className,
          )}
          data-attach-menu
        >
          <Plus className="size-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="min-w-52">
        <DropdownMenuItem onSelect={onMedia} data-attach="media">
          <ImagePlus />
          {t("attachMedia")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onCamera} data-attach="camera">
          <Camera />
          {t("attachCamera")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onFile} data-attach="file">
          <FileText />
          {t("attachFile")}
        </DropdownMenuItem>
        {onVoice ? (
          <DropdownMenuItem onSelect={onVoice} data-attach="voice">
            <Mic />
            {t("attachVoice")}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
