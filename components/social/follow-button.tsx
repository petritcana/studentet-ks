"use client";

import * as React from "react";
import { Check, UserCheck, UserPlus } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { followUser, unfollowUser } from "@/lib/actions/social";
import { cn } from "@/lib/utils";

export type FollowState = "none" | "following" | "mutual";

/**
 * Optimistic UI: gjendja ndryshon menjëherë dhe kthehet vetëm nëse serveri e
 * refuzon. Raporti ndjek/ndjekës nuk shfaqet askund këtu me qëllim.
 */
export function FollowButton({
  targetId,
  initialState,
  size = "sm",
  className,
  onChanged,
}: {
  targetId: string;
  initialState: FollowState;
  size?: ButtonProps["size"];
  className?: string;
  onChanged?: (state: FollowState) => void;
}) {
  const [state, setState] = React.useState<FollowState>(initialState);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => setState(initialState), [initialState]);

  const isFollowing = state !== "none";

  function toggle() {
    const previous = state;
    const next: FollowState = isFollowing ? "none" : "following";
    setState(next);
    onChanged?.(next);

    startTransition(async () => {
      const result = isFollowing ? await unfollowUser(targetId) : await followUser(targetId);
      if (!result.ok) {
        setState(previous);
        onChanged?.(previous);
        if (result.message) toast.error(result.message);
        return;
      }
      if (!isFollowing && result.message?.includes("shokë")) {
        setState("mutual");
        onChanged?.("mutual");
        toast.success("U bëtë shokë", {
          description: "Tani DM-ja është e hapur mes jush.",
        });
      }
    });
  }

  return (
    <Button
      type="button"
      size={size}
      variant={isFollowing ? "secondary" : "primary"}
      onClick={toggle}
      disabled={pending}
      className={cn("min-w-24", className)}
      aria-pressed={isFollowing}
    >
      {state === "mutual" ? (
        <>
          <UserCheck />
          Shokë
        </>
      ) : state === "following" ? (
        <>
          <Check />
          E ndjek
        </>
      ) : (
        <>
          <UserPlus />
          Ndiqe
        </>
      )}
    </Button>
  );
}
