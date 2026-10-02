"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { enrollInCourse } from "@/lib/actions/courses";

/**
 * Regjistrimi te kursi.
 *
 * Kursi falas hyn menjëherë. Ai me pagese kalon nga shtresa e pagesave, e njejta
 * që sherben edhe abonimet PRO, prandaj këtu nuk ka asnje logjike parash.
 */
export function EnrollButton({
  courseId,
  enrolled,
  isOwn,
  priceLabel,
  continueHref,
}: {
  courseId: string;
  enrolled: boolean;
  isOwn: boolean;
  priceLabel: string;
  continueHref: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("courses");
  const tc = useTranslations("common");
  const [pending, startTransition] = React.useTransition();

  function enroll() {
    startTransition(async () => {
      const result = await enrollInCourse(courseId);
      if (!result.ok) {
        const key = result.messageKey ?? "";
        toast.error(key.startsWith("courses.") ? t(key.replace("courses.", "")) : tc("retry"));
        return;
      }
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      toast.success(t("enrolled"));
      router.refresh();
    });
  }

  if (isOwn) return null;

  if (enrolled) {
    return continueHref ? (
      <Button asChild variant="secondary" className="ml-auto">
        <Link href={continueHref}>
          <Check />
          {t("continue")}
        </Link>
      </Button>
    ) : null;
  }

  return (
    <Button onClick={enroll} loading={pending} className="ml-auto">
      <ShoppingCart />
      {priceLabel === t("free") ? t("enroll") : t("buy", { price: priceLabel })}
    </Button>
  );
}
