"use client";

import * as React from "react";
import Link from "next/link";
import { tokenize } from "@/lib/mentions";

/**
 * Teksti i një postimi, komenti ose storjeje, me @përmendjet si lidhje te
 * profili dhe #hashtag-ët si lidhje te tema. Pjesa tjetër mbetet tekst i
 * thjeshtë, me rreshtat e vet.
 */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {tokenize(text).map((token, index) =>
        token.kind === "mention" ? (
          <Link
            key={index}
            href={`/u/${token.username}`}
            className="font-semibold text-brand-500 hover:underline"
            data-mention={token.username}
            onClick={(event) => event.stopPropagation()}
          >
            {token.value}
          </Link>
        ) : token.kind === "hashtag" ? (
          <Link
            key={index}
            href={`/hashtag/${encodeURIComponent(token.tag)}`}
            className="font-semibold text-brand-500 hover:underline"
            data-hashtag={token.tag}
            onClick={(event) => event.stopPropagation()}
          >
            {token.value}
          </Link>
        ) : (
          <React.Fragment key={index}>{token.value}</React.Fragment>
        ),
      )}
    </>
  );
}
