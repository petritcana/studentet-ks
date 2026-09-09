import Link from "next/link";
import { Flame, Snowflake, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { facultyTheme } from "@/lib/faculties";
import type { LeaderboardResult } from "@/lib/queries/leaderboard";
import type { LevelInfo } from "@/lib/xp";
import { cn, formatNumber } from "@/lib/utils";

export function XpBar({ level }: { level: LevelInfo }) {
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text">{level.name}</p>
          <p className="mt-0.5 text-xs text-text-muted">{level.description}</p>
        </div>
        <span className="tabular shrink-0 text-sm text-text-muted">
          {formatNumber(level.current)} XP
        </span>
      </div>
      <Progress value={level.percent} className="mt-3" />
      <p className="mt-2 text-xs text-text-muted">
        {level.next
          ? `Edhe ${formatNumber(level.toNext)} XP deri te ${level.next}.`
          : "Je në nivelin më të lartë. Tani ndihmo dikë tjetër të arrijë këtu."}
      </p>
    </Card>
  );
}

/**
 * Streak-u kurrë nuk ndëshkon publikisht. Ngrirjet janë të dukshme para se të
 * duhen, jo pasi humbet.
 */
export function StreakWidget({
  streak,
  freezes,
  activeToday,
}: {
  streak: number;
  freezes: number;
  activeToday: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <Flame className={cn("size-4", streak > 0 ? "text-accent-500" : "text-text-muted")} />
        <h2 className="text-sm font-semibold text-text">Ditë rresht</h2>
      </div>

      <p className="tabular mt-2 text-3xl font-semibold text-text">{streak}</p>

      <p className="mt-1 text-sm text-text-muted">
        {activeToday
          ? "E ruajte edhe sot. Mjafton një veprim kuptimplotë, jo gjysmë ore punë."
          : "Nuk ke bërë ende asgjë sot. Një përgjigje ose një material e ruan ditën."}
      </p>

      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        <Snowflake className="size-4 text-brand-500" />
        <span className="text-sm text-text">
          <span className="tabular font-medium">{freezes}</span> ngrirje falas këtë muaj
        </span>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Nëse humb një ditë, ngrirja e mbulon vetë. Askush tjetër nuk e sheh.
      </p>
    </Card>
  );
}

export function Leaderboard({ data }: { data: LeaderboardResult | null }) {
  if (!data || data.rows.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-text">Renditja javore</h2>
        </div>
        <p className="mt-2 text-sm text-text-muted">
          Kjo javë sapo ka nisur. Ngarko një material ose përgjigju një pyetjeje dhe hyn i pari.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-text">Renditja javore</h2>
        </div>
        <Badge>{data.label}</Badge>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Resetohet çdo të hënë. Vetëm brenda grupit tënd, kurrë globalisht.
      </p>

      <ol className="mt-3 flex flex-col gap-2">
        {data.rows.map((row) => (
          <li
            key={row.userId}
            className={cn(
              "flex items-center gap-3 rounded-md px-2 py-1.5",
              row.isMe && "bg-brand-500/8",
            )}
          >
            <span className="tabular w-6 shrink-0 text-sm text-text-muted">{row.rank}</span>
            <Link href={`/u/${row.username}`} className="flex min-w-0 flex-1 items-center gap-2">
              <Avatar name={row.name} src={row.avatar} size="xs" verified={row.isVerified} />
              <span className="truncate text-sm text-text">{row.name}</span>
            </Link>
            <span className="tabular shrink-0 text-sm font-medium text-text">
              {formatNumber(row.points)}
            </span>
          </li>
        ))}
      </ol>

      {data.me && data.me.rank > 10 ? (
        <div className="mt-3 flex items-center gap-3 rounded-md border border-brand-500/30 bg-brand-500/8 px-2 py-1.5">
          <span className="tabular w-6 shrink-0 text-sm text-brand-500">{data.me.rank}</span>
          <span className="min-w-0 flex-1 truncate text-sm text-text">Ti</span>
          <span className="tabular shrink-0 text-sm font-medium text-text">
            {formatNumber(data.me.points)}
          </span>
        </div>
      ) : null}
    </Card>
  );
}

export function FacultyRace({
  rows,
}: {
  rows: { id: string; name: string; color: string; materials: number; answers: number; points: number }[];
}) {
  const max = Math.max(1, ...rows.map((row) => row.points));

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-text">
        Cili fakultet ka ndarë më shumë dije këtë muaj
      </h2>
      <p className="mt-1 text-xs text-text-muted">
        Gara mes fakulteteve, jo mes njerëzve. Resetohet në fillim të çdo muaji.
      </p>

      <ol className="mt-3 flex flex-col gap-3">
        {rows.map((row, index) => {
          const theme = facultyTheme(row.color);
          return (
            <li key={row.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span className="tabular w-5 text-sm text-text-muted">{index + 1}</span>
                  <span className={cn("text-sm font-medium", theme.text)}>
                    {theme.shortLabel}
                  </span>
                </span>
                <span className="tabular text-xs text-text-muted">
                  {row.materials} materiale · {row.answers} përgjigje
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={cn("h-full rounded-full transition-all duration-400", theme.dot)}
                  style={{ width: `${Math.max(4, (row.points / max) * 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
