"use client";

import { useReviewGuard } from "@/components/layout/review-state";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Clock, UserCheck, UserPlus, UserMinus } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { followUser, unfollowUser } from "@/lib/actions/social";
import { cn } from "@/lib/utils";

/**
 * Butoni i vetëm i ndjekjes.
 *
 * Dikur kishte pesë kopje të tij: te profili, te kartat, te rafti i njerëzve, te
 * rreshti i identitetit dhe te sugjerimet. Secila e trajtonte ndryshe kërkesën
 * në pritje, dhe njëra as nuk e kishte çndjekjen. Tani është një.
 *
 * Gjendja ndryshon menjëherë dhe kthehet vetëm nëse serveri e refuzon. Kur je
 * duke e ndjekur dikë, kalimi i miut mbi butonin e thotë hapur «Çndiqe»: pa këtë,
 * njerëzit nuk e gjejnë dot se ku çndiqet.
 */
export type FollowState = "none" | "requested" | "following" | "mutual";

/** Nga një boolean i thjeshtë te gjendja e plotë, që thirrësit e vjetër të mos ndryshojnë. */
export function followStateFrom(following: boolean, requested = false): FollowState {
  if (requested) return "requested";
  return following ? "following" : "none";
}

export function FollowButton({
  targetId,
  initialState,
  size = "sm",
  iconOnly = false,
  privateProfile = false,
  quiet = false,
  className,
  onChange,
}: {
  targetId: string;
  initialState: FollowState;
  size?: ButtonProps["size"];
  /** Vetëm ikona, për vende të ngushta si koka e një postimi. */
  iconOnly?: boolean;
  /** Te një profil privat, ndjekja quhet kërkesë që në etiketë. */
  privateProfile?: boolean;
  /**
   * Në lista me shumë njerëz, butoni i plotë përsëritet dhe e mbulon kartën me
   * ngjyrë. Aty ndjekja del si kornizë, dhe mbushet vetëm te profili.
   */
  quiet?: boolean;
  className?: string;
  /** Njofton prindin, që numrat të ndryshojnë pa pritur serverin. */
  onChange?: (next: FollowState) => void;
}) {
  const router = useRouter();
  const t = useTranslations("social");
  const [state, setState] = React.useState<FollowState>(initialState);
  const [hovering, setHovering] = React.useState(false);
  // Pas klikimit, hover-i injorohet derisa miu të dalë: përndryshe butoni që sapo
  // u bë «Kërkesa u dërgua» do të thoshte menjëherë «Çndiqe».
  const settledRef = React.useRef(true);
  const [pending, startTransition] = React.useTransition();
  const blocked = useReviewGuard();

  React.useEffect(() => setState(initialState), [initialState]);

  const isActive = state !== "none";

  function apply(next: FollowState) {
    setState(next);
    onChange?.(next);
  }

  function toggle(event: React.MouseEvent) {
    // Butoni rri shpesh brenda një lidhjeje: klikimi nuk duhet të hapë profilin.
    event.preventDefault();
    event.stopPropagation();
    // Nuk çaktivizohet gjatë pritjes: shfletuesi do ta nxirrte dhe rifuste miun,
    // dhe hover-i do të kthehej. Klikimi i dytë thjesht injorohet.
    if (pending) return;
    // Ndjekja e re pret miratimin e ID-së; heqja e ndjekjes jo.
    if (!isActive && blocked()) return;

    const previous = state;
    settledRef.current = false;
    setHovering(false);
    // Ndjekja nis si kërkesë, prandaj gjendja e menjëhershme nuk është «e ndjek»:
    // serveri thotë nëse u pranua drejt apo mbeti në pritje.
    apply(isActive ? "none" : "requested");

    startTransition(async () => {
      const result = isActive ? await unfollowUser(targetId) : await followUser(targetId);

      if (!result.ok) {
        apply(previous);
        if (result.messageKey) toast.error(t(result.messageKey.replace("social.", "")));
        return;
      }

      if (result.messageKey === "social.requested") {
        apply("requested");
        toast.success(t("requested"));
        return;
      }

      if (result.messageKey === "social.nowFriends") {
        apply("mutual");
        toast.success(t("nowFriends"), { description: t("nowFriendsBody") });
      } else if (!isActive) {
        apply("following");
      }

      router.refresh();
    });
  }

  const label = (() => {
    if (isActive && hovering) return t("unfollow");
    if (state === "requested") return t("requestPending");
    if (state === "mutual") return t("friends");
    if (state === "following") return t("following");
    return privateProfile ? t("requestFollow") : t("follow");
  })();

  const Icon = (() => {
    if (isActive && hovering) return UserMinus;
    if (state === "requested") return Clock;
    if (state === "mutual") return UserCheck;
    if (state === "following") return Check;
    return UserPlus;
  })();

  return (
    <Button
      type="button"
      size={size}
      variant={isActive ? "secondary" : quiet ? "outline" : "primary"}
      onClick={toggle}
      onMouseEnter={() => {
        if (settledRef.current) setHovering(true);
      }}
      onMouseLeave={() => {
        settledRef.current = true;
        setHovering(false);
      }}
      onFocus={() => {
        if (settledRef.current) setHovering(true);
      }}
      onBlur={() => setHovering(false)}
      aria-busy={pending || undefined}
      aria-pressed={isActive}
      aria-label={label}
      className={cn(!iconOnly && "min-w-24", className)}
    >
      <Icon />
      {iconOnly ? null : label}
    </Button>
  );
}
