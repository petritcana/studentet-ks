"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { acceptFollowRequest, declineFollowRequest } from "@/lib/actions/social";
import { FollowBackButton } from "./follow-back-button";

export type FollowRequestPerson = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  /** E ndjek tashmë: pas pranimit nuk ka pse të dalë «Ndiqe edhe ti». */
  alreadyFollowing?: boolean;
};

/**
 * Kërkesat për ndjekje te një profil privat.
 *
 * Rri në krye të njoftimeve, sepse është vendim që pret dikë tjetër. Refuzimi
 * nuk i dërgon asgjë kërkuesit.
 */
export function FollowRequests({ requests }: { requests: FollowRequestPerson[] }) {
  const router = useRouter();
  const t = useTranslations("social");
  const tc = useTranslations("common");
  const [handled, setHandled] = React.useState<string[]>([]);
  // Të pranuarit mbeten në listë me «Ndiqe edhe ti», që ndjekja mbrapsht të mos kërkojë profilin.
  const [accepted, setAccepted] = React.useState<string[]>([]);
  const [pending, startTransition] = React.useTransition();

  const shown = requests.filter((person) => !handled.includes(person.id));
  if (shown.length === 0) return null;

  function decide(personId: string, accept: boolean) {
    startTransition(async () => {
      const result = accept ? await acceptFollowRequest(personId) : await declineFollowRequest(personId);
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      const person = requests.find((item) => item.id === personId);
      if (accept && person && !person.alreadyFollowing) setAccepted((current) => [...current, personId]);
      else setHandled((current) => [...current, personId]);
      if (accept) toast.success(t("requestAccepted"));
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-sm font-semibold text-text">{t("requests")}</h2>

      <ul className="flex flex-col gap-2">
        {shown.map((person) => (
          <li key={person.id} className="flex items-center gap-3">
            <Avatar name={person.name} src={person.avatar} size="sm" />
            <Link href={`/u/${person.username}`} className="flex min-w-0 flex-1 flex-col hover:underline">
              <span className="truncate text-sm font-medium text-text">{person.name}</span>
              <span className="truncate text-xs text-text-muted">@{person.username}</span>
            </Link>
            {accepted.includes(person.id) ? (
              <FollowBackButton userId={person.id} name={person.name} />
            ) : (
              <span className="flex shrink-0 items-center gap-1.5">
                <Button size="sm" loading={pending} onClick={() => decide(person.id, true)} data-request-accept>
                  {t("accept")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => decide(person.id, false)}>
                  {t("decline")}
                </Button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
