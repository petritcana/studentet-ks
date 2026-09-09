"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/shared/empty-state";
import { markConversationRead, sendMessage } from "@/lib/actions/campus";
import { timeAgoShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ThreadMessage = {
  id: string;
  text: string;
  createdAt: string;
  authorId: string;
};

export function MessageThread({
  conversationId,
  messages,
  viewerId,
  other,
  emptyHint,
}: {
  conversationId: string;
  messages: ThreadMessage[];
  viewerId: string;
  other: { name: string; avatar: string | null };
  emptyHint: string;
}) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
    void markConversationRead(conversationId);
  }, [conversationId, messages.length]);

  function submit() {
    const value = text.trim();
    if (!value) return;

    startTransition(async () => {
      const result = await sendMessage(conversationId, value);
      if (!result.ok) {
        toast.error(result.message ?? "S'u dërgua dot.");
        return;
      }
      setText("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-h-[60dvh] flex-col gap-3 overflow-y-auto scrollbar-thin pr-1">
        {messages.length === 0 ? (
          <EmptyState
            illustration="messages"
            compact
            title="Fillo bisedën"
            description={emptyHint}
          />
        ) : (
          messages.map((message) => {
            const mine = message.authorId === viewerId;
            return (
              <div
                key={message.id}
                className={cn("flex items-end gap-2", mine && "flex-row-reverse")}
              >
                {!mine ? <Avatar name={other.name} src={other.avatar} size="xs" /> : null}
                <div
                  className={cn(
                    "flex max-w-[75%] flex-col gap-1 rounded-lg px-3 py-2",
                    mine
                      ? "bg-brand-500 text-brand-contrast"
                      : "border border-border bg-surface text-text",
                  )}
                >
                  <p className="whitespace-pre-line text-sm">{message.text}</p>
                  <span
                    className={cn(
                      "tabular self-end text-[10px]",
                      mine ? "text-brand-contrast/70" : "text-text-muted",
                    )}
                  >
                    {timeAgoShort(message.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-border pt-4">
        <Textarea
          autoGrow
          maxRows={5}
          value={text}
          maxLength={2000}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Shkruaj mesazhin. Enter e dërgon."
          aria-label="Mesazhi"
          className="min-h-10"
        />
        <Button onClick={submit} loading={pending} disabled={!text.trim()} size="icon">
          <Send />
          <span className="sr-only">Dërgo</span>
        </Button>
      </div>
    </div>
  );
}
