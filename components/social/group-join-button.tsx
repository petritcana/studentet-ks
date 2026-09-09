"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { joinGroup, leaveGroup } from "@/lib/actions/campus";

export function GroupJoinButton({
  groupId,
  isMember,
  privacy,
}: {
  groupId: string;
  isMember: boolean;
  privacy: string;
}) {
  const router = useRouter();
  const [member, setMember] = React.useState(isMember);
  const [pending, startTransition] = React.useTransition();

  function toggle() {
    const next = !member;
    setMember(next);

    startTransition(async () => {
      const result = next ? await joinGroup(groupId) : await leaveGroup(groupId);
      if (!result.ok) {
        setMember(!next);
        toast.error(result.message ?? "S'u krye dot.");
        return;
      }
      toast.success(result.message ?? "Gati.");
      router.refresh();
    });
  }

  if (privacy === "invite" && !member) {
    return (
      <Button variant="secondary" size="sm" disabled>
        Vetëm me ftesë
      </Button>
    );
  }

  return (
    <Button
      variant={member ? "secondary" : "primary"}
      size="sm"
      onClick={toggle}
      disabled={pending}
    >
      {member ? (
        <>
          <Check />
          Anëtar
        </>
      ) : privacy === "request" ? (
        <>
          <UserPlus />
          Kërko të hysh
        </>
      ) : (
        <>
          <UserPlus />
          Hyr në grup
        </>
      )}
      {member ? <LogOut className="sr-only" /> : null}
    </Button>
  );
}
