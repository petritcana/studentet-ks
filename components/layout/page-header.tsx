import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  back,
  action,
  className,
}: {
  title: string;
  description?: string;
  back?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-start gap-3">
        {back ? (
          <Link
            href={back}
            aria-label="Kthehu prapa"
            className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full text-text-muted transition-colors duration-150 hover:bg-surface hover:text-text"
          >
            <ArrowLeft className="size-5" />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl text-text">{title}</h1>
          {description ? (
            <p className="measure mt-1 text-sm text-text-muted">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
