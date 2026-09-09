import Link from "next/link";
import { BadgeCheck, Download, FileText, Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  MATERIAL_TYPE_LABELS,
  VERIFICATION_LABELS,
  type MaterialType,
  type VerificationStatus,
} from "@/lib/constants";
import { cn, formatBytes, formatNumber } from "@/lib/utils";

export type MaterialCardData = {
  id: string;
  title: string;
  type: string;
  size: number;
  pages: number | null;
  rating: number;
  ratingCount: number;
  downloads: number;
  academicYear: string;
  professor: string | null;
  verificationStatus: string;
  course: { id: string; name: string };
  uploader: { name: string; username: string; avatar: string | null; isVerified: boolean };
};

export function MaterialCard({
  material,
  className,
}: {
  material: MaterialCardData;
  className?: string;
}) {
  const verified = material.verificationStatus === "verified";

  return (
    <Card interactive className={cn("h-full", className)}>
      <Link href={`/materialet/${material.id}`} className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-brand-500/12 text-brand-500">
            <FileText className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold text-text">{material.title}</p>
            <p className="mt-0.5 truncate text-xs text-text-muted">
              {material.course.name}
              {material.professor ? ` · ${material.professor}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge>{MATERIAL_TYPE_LABELS[material.type as MaterialType] ?? material.type}</Badge>
          {verified ? (
            <Badge variant="success">
              <BadgeCheck />
              {VERIFICATION_LABELS.verified}
            </Badge>
          ) : (
            <Badge variant="warning">
              {VERIFICATION_LABELS[material.verificationStatus as VerificationStatus] ??
                "Pa verifikuar"}
            </Badge>
          )}
          <Badge>{material.academicYear}</Badge>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
          <span className="flex items-center gap-3 text-xs text-text-muted">
            <span className="tabular inline-flex items-center gap-1">
              <Star
                className={cn(
                  "size-3.5",
                  material.ratingCount > 0 ? "fill-warning text-warning" : "text-text-muted",
                )}
              />
              {material.ratingCount > 0 ? material.rating.toFixed(1) : "pa vlerësim"}
            </span>
            <span className="tabular inline-flex items-center gap-1">
              <Download className="size-3.5" />
              {formatNumber(material.downloads)}
            </span>
            <span className="tabular hidden sm:inline">
              {material.pages ? `${material.pages} faqe · ` : ""}
              {formatBytes(material.size)}
            </span>
          </span>
          <Avatar
            name={material.uploader.name}
            src={material.uploader.avatar}
            size="xs"
            verified={material.uploader.isVerified}
          />
        </div>
      </Link>
    </Card>
  );
}
