"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Lock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { joinGroup, leaveGroup } from "@/lib/actions/groups";
import { facultyStyle } from "@/lib/faculties";

export type GroupDto = {
  id: string;
  name: string;
  type: string;
  privacy: string;
  description: string | null;
  facultyCode: string | null;
  memberCount: number;
  membership: "member" | "pending" | null;
};

export function GroupCard({ group }: { group: GroupDto }) {
  const router = useRouter();
  const t = useTranslations("campus");
  const tc = useTranslations("common");
  const [membership, setMembership] = React.useState(group.membership);
  const [pending, startTransition] = React.useTransition();

  function toggle() {
    startTransition(async () => {
      if (membership) {
        setMembership(null);
        await leaveGroup(group.id);
        router.refresh();
        return;
      }

      const result = await joinGroup(group.id);
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      const requested = result.messageKey === "campus.joinRequest";
      setMembership(requested ? "pending" : "member");
      toast.success(requested ? t("joinRequest") : t("joined"));
      router.refresh();
    });
  }

  const typeKey =
    group.type === "course" ? "groupCourse" : group.type === "generation" ? "groupGeneration" : "groupCustom";

  return (
    <Card className="flex flex-col gap-3 p-4" style={facultyStyle(group.facultyCode)}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-faculty/12 text-faculty-text">
          <Users className="size-5" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Link
            href={`/grupet/${group.id}`}
            className="truncate text-sm font-semibold text-text transition-colors hover:text-brand-500"
          >
            {group.name}
          </Link>
          <p className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <Badge variant="faculty">{t(typeKey)}</Badge>
            <span className="tabular">{t("members", { count: group.memberCount })}</span>
            {group.privacy !== "public" ? (
              <span className="inline-flex items-center gap-1">
                <Lock className="size-3" />
                {t("inviteOnly")}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {group.description ? (
        <p className="measure line-clamp-2 text-sm text-text-muted">{group.description}</p>
      ) : null}

      <Button
        size="sm"
        variant={membership ? "secondary" : "primary"}
        onClick={toggle}
        loading={pending}
        className="self-start"
      >
        {membership === "member" ? (
          <>
            <Check />
            {t("joined")}
          </>
        ) : membership === "pending" ? (
          t("joinRequest")
        ) : (
          t("join")
        )}
      </Button>
    </Card>
  );
}
