import { cn } from "@/lib/utils";

export function PageWithRail({
  rail,
  children,
  className,
}: {
  rail: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-col gap-4",
        // Feed-i merr hapësirën, shtylla ngjitet te skaji i djathtë i përmbajtjes:
        // asnjë hapësirë bosh anash, e njëjta largësi nga skaji si shtylla e majtë.
        "xl:max-w-none xl:flex-row xl:gap-8 2xl:gap-10",
        className,
      )}
    >
      {/* Feed-i zgjerohet me ekranin; shtylla e djathtë mbetet te skaji. */}
      <div className="w-full min-w-0 xl:flex-1">{children}</div>

      {/* Poshtë lihet vend për butonin e asistentit, që karta e fundit të mos mbulohet. */}
      <aside className="flex w-full min-w-0 flex-col gap-4 xl:ml-auto xl:w-[340px] xl:shrink-0 xl:pb-24 2xl:w-[380px]">
        {rail}
      </aside>
    </div>
  );
}
