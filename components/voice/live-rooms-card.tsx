import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Lock, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getLiveRooms } from "@/lib/queries/voice";
import type { AccessUser } from "@/lib/access";

/**
 * Shënuesi akustik origjinal: valë audio me shirita dinamikë,
 * duke hequr pikën e zakonshme të kuqe të klonuar nga platformat e tjera.
 */
function AcousticWave() {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      <span className="h-2.5 w-0.5 animate-pulse rounded-full bg-emerald-600 dark:bg-emerald-400 [animation-delay:0ms]" />
      <span className="h-4 w-0.5 animate-pulse rounded-full bg-emerald-600 dark:bg-emerald-400 [animation-delay:150ms]" />
      <span className="h-3 w-0.5 animate-pulse rounded-full bg-emerald-600 dark:bg-emerald-400 [animation-delay:300ms]" />
      <span className="h-1.5 w-0.5 animate-pulse rounded-full bg-emerald-600 dark:bg-emerald-400 [animation-delay:200ms]" />
    </span>
  );
}

export async function LiveRoomsCard({
  user,
}: {
  user: AccessUser & { facultyId: string | null; universityId: string | null };
}) {
  const [rooms, t] = await Promise.all([getLiveRooms(user, 3), getTranslations("voice")]);

  if (rooms.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AcousticWave />
          <h2 className="text-xs font-bold uppercase tracking-wider text-text">
            {t("liveNow")}
          </h2>
        </div>
        <span className="rounded bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600 dark:text-brand-500">
          ZËRI I KAMPUSIT
        </span>
      </div>

      <ul className="flex flex-col gap-2.5 pt-1">
        {rooms.map((room) => (
          <li key={room.id} className="rounded-lg border border-border/70 bg-surface-2/40 p-2.5 transition-colors hover:border-brand-500/30 hover:bg-surface-2/80">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  {room.access === "password" ? (
                    <Lock className="size-3 shrink-0 text-text-muted" aria-hidden />
                  ) : null}
                  <span className="truncate text-xs font-bold text-text">{room.title}</span>
                </div>
                <span className="truncate text-[11px] text-text-muted">
                  Mikpritës: <span className="font-medium text-text/80">{room.hostName}</span>
                </span>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-text-muted border border-border/60">
                <Users className="size-2.5" />
                <span className="tabular">{room.listeners}</span>
              </span>
            </div>

            <div className="mt-2.5 flex items-center justify-end">
              <Button asChild size="sm" variant="outline" className="h-7 text-xs border-brand-500/30 px-3 hover:bg-brand-500 hover:text-white">
                <Link href={`/zeri/${room.id}`}>
                  <span>{t("join")}</span>
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
