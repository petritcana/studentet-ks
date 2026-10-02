"use client";

import { useReviewGuard } from "@/components/layout/review-state";
import * as React from "react";
import { StoryBar } from "./story-bar";
import { StoryEditor } from "@/components/stories/story-editor";
import { StoryViewer } from "./story-viewer";
import type { StoryGroup } from "@/lib/queries/stories";

/**
 * Shiriti i stories me shikuesin dhe kompozuesin.
 *
 * Rri ndarë nga `StoryBar`, që ai të mbetet thjesht pamje dhe të provohet vetëm,
 * ndërsa gjendja e hapjes jeton këtu.
 */
export function StoryRail({
  groups,
  me,
}: {
  groups: StoryGroup[];
  me: { id: string; name: string; avatar: string | null };
}) {
  const [openAt, setOpenAt] = React.useState<number | null>(null);
  const [composing, setComposing] = React.useState(false);
  const blocked = useReviewGuard();

  return (
    <>
      <StoryBar
        stories={groups}
        me={me}
        onOpen={(authorId) => {
          const index = groups.findIndex((group) => group.id === authorId);
          if (index >= 0) setOpenAt(index);
        }}
        onCreate={() => {
          if (!blocked()) setComposing(true);
        }}
      />

      {openAt !== null ? (
        <StoryViewer groups={groups} startIndex={openAt} onClose={() => setOpenAt(null)} meId={me.id} ownerTools />
      ) : null}

      <StoryEditor open={composing} onOpenChange={setComposing} />
    </>
  );
}
