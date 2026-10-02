"use client";

import * as React from "react";


/** Një kompozues i vetëm për tërë aplikacionin. */
export type ComposerAttachment = "none" | "photo" | "video" | "poll" | "voice";

type ComposerControl = {
  open: (attachment?: ComposerAttachment) => void;
};

const ComposerContext = React.createContext<ComposerControl | null>(null);

export function ComposerProvider({
  value,
  children,
}: {
  value: ComposerControl;
  children: React.ReactNode;
}) {
  return <ComposerContext.Provider value={value}>{children}</ComposerContext.Provider>;
}

/**
 * Kontrolli i kompozuesit.
 *
 * Kthen `null` jashtë shtresës së aplikacionit, që një faqe publike ta thërrasë
 * pa u prishur. Thirrësi e kontrollon vetë.
 */
export function useComposer(): ComposerControl | null {
  return React.useContext(ComposerContext);
}
