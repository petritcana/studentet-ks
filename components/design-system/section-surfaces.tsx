"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  BookOpen,
  Bookmark,
  CalendarDays,
  Check,
  FileText,
  Flag,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LockedOverlay } from "@/components/ui/locked-overlay";
import { Progress, StepProgress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Skeleton,
  SkeletonMaterial,
  SkeletonPerson,
  SkeletonPost,
} from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import { EmptyState } from "@/components/shared/empty-state";
import { facultyStyle } from "@/lib/faculties";
import { ACCESS_CIRCLES, DEMO_PEOPLE, POST_SCOPES } from "./demo-data";
import { Demo, Row, Section } from "./primitives";
import { cn } from "@/lib/utils";

export function SectionSurfaces() {
  const t = useTranslations("designSystem");
  const tf = useTranslations("faculty");
  const tc = useTranslations("common");
  const tp = useTranslations("pro");
  const ta = useTranslations("access");
  const te = useTranslations("empty");

  const person = (index: number) => {
    const demo = DEMO_PEOPLE[index];
    return { ...demo, facultyLabel: tf(`${demo.facultyCode}.short`) };
  };

  return (
    <>
      <Section id="kartat" title={t("sections.cards")} intro={t("cards.intro")}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Demo label={t("cards.material")} bare>
            <Card interactive>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <span
                    style={facultyStyle("electrical")}
                    className="grid size-11 shrink-0 place-items-center rounded-md bg-faculty/12 text-faculty-text"
                  >
                    <FileText className="size-5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <CardTitle className="truncate">{t("cards.demo.materialTitle")}</CardTitle>
                    <CardDescription>{t("cards.demo.materialMeta")}</CardDescription>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="success">
                        <Check />
                        {t("cards.demo.materialVerified")}
                      </Badge>
                      <Badge>{t("cards.demo.materialType")}</Badge>
                      <span style={facultyStyle("electrical")}>
                        <Badge variant="faculty">{tf("electrical.short")}</Badge>
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="justify-between">
                <span className="flex items-center gap-1.5 text-sm text-text-muted">
                  <Star className="size-4 fill-warning text-warning" />
                  <span className="tabular text-text">4,7</span>
                  <span className="tabular">· {t("cards.demo.materialDownloads")}</span>
                </span>
                <Button size="sm" variant="secondary">
                  {tc("open")}
                </Button>
              </CardFooter>
            </Card>
          </Demo>

          <Demo label={t("cards.post")} bare>
            <Card>
              <CardHeader className="pb-3">
                <UserIdentityLine
                  user={person(0)}
                  trailing={
                    <Button size="icon" variant="ghost" aria-label={tc("more")}>
                      <MoreHorizontal />
                    </Button>
                  }
                />
                <p className="mt-1 text-xs text-text-muted">{t("cards.demo.postMeta")}</p>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="measure text-sm text-text">{t("cards.demo.postBody")}</p>
              </CardContent>
              <CardFooter className="justify-between">
                <Row className="gap-1">
                  <Button size="sm" variant="ghost">
                    <Star />
                    <span className="tabular">48</span>
                  </Button>
                  <Button size="sm" variant="ghost">
                    <MessageCircle />
                    <span className="tabular">12</span>
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Bookmark />
                    <span className="tabular">31</span>
                  </Button>
                </Row>
                <AvatarStack people={DEMO_PEOPLE.slice(1, 5)} size="xs" />
              </CardFooter>
            </Card>
          </Demo>

          <Demo label={t("cards.course")} bare>
            <Card interactive className="overflow-hidden" style={facultyStyle("electrical")}>
              <div className="h-1.5 w-full bg-faculty" aria-hidden />
              <CardHeader>
                <CardTitle>{t("cards.demo.courseTitle")}</CardTitle>
                <CardDescription>{t("cards.demo.courseMeta")}</CardDescription>
              </CardHeader>
              <CardFooter className="justify-between">
                <span className="flex items-center gap-2 text-xs text-text-muted">
                  <Users className="size-4" />
                  <span className="tabular">{t("cards.demo.courseStudents")}</span>
                </span>
                <Badge variant="brand">
                  <Sparkles />
                  {t("cards.demo.courseMine")}
                </Badge>
              </CardFooter>
            </Card>
          </Demo>

          <Demo label={t("cards.event")} bare>
            <Card interactive>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-md border border-border bg-surface-2">
                    <span className="text-[10px] uppercase tracking-wide text-text-muted">
                      {t("cards.demo.day")}
                    </span>
                    <span className="tabular text-lg font-semibold text-text">
                      {t("cards.demo.dayNumber")}
                    </span>
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <CardTitle>{t("cards.demo.eventTitle")}</CardTitle>
                    <CardDescription>{t("cards.demo.eventMeta")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="justify-between">
                <span className="flex items-center gap-2">
                  <AvatarStack people={DEMO_PEOPLE.slice(0, 4)} size="xs" />
                  <span className="text-xs text-text-muted">{t("cards.demo.eventGoing")}</span>
                </span>
                <Button size="sm">{t("cards.demo.eventCta")}</Button>
              </CardFooter>
            </Card>
          </Demo>
        </div>
      </Section>

      <Section id="pro" title={t("sections.pro")} intro={t("pro.intro")}>
        <Demo label={t("pro.locked")} bare>
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <span
                  style={facultyStyle("science")}
                  className="grid size-11 shrink-0 place-items-center rounded-md bg-faculty/12 text-faculty-text"
                >
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate">
                    Biokimi mjekësore 2024, Prof. Shala
                  </CardTitle>
                  <CardDescription>
                    {tf("science.short")} · 112 {tc("of")} · 4,8 ★ · 640
                  </CardDescription>
                </div>
                <Badge variant="warning">
                  <Lock />
                  {ta("reason.locked")}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <LockedOverlay
                title={tp("lockedTitle", { faculty: tf("science.short") })}
                body={tp("lockedBody", { ownFaculty: tf("electrical.short") })}
                onUnlock={() => toast(tp("upgrade"))}
              >
                <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-4">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-3 rounded-full bg-text-muted/30"
                      style={{ width: `${100 - index * 7}%` }}
                    />
                  ))}
                </div>
              </LockedOverlay>
            </CardContent>
          </Card>
        </Demo>

        <Demo label={t("pro.table")} note={ta("intro")} bare>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface scrollbar-thin">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    {ta("circle")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    {ta("scope")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    {ta("free")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    {ta("pro")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ACCESS_CIRCLES.map((row) => (
                  <tr key={row.key} className="border-b border-border last:border-0">
                    <td className="tabular px-4 py-2.5 text-text-muted">{row.circle}</td>
                    <td className="px-4 py-2.5 text-text">{ta(`circles.${row.key}`)}</td>
                    <td className="px-4 py-2.5">
                      <Mark on={row.free} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Mark on />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Demo>

        <Demo label={t("pro.scopeSelector")}>
          <ScopeSelectorDemo />
        </Demo>

        <Demo label={tp("earnBanner")} bare>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="pro-gradient grid size-10 shrink-0 place-items-center rounded-full text-pro-contrast">
                <Sparkles className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">{tp("earnedDays", { days: 12 })}</p>
                <p className="text-xs text-text-muted">{tp("earnBanner")}</p>
              </div>
              <Button variant="pro" size="sm">
                {tp("exchangeCta")}
              </Button>
            </div>
            <Progress value={40} tone="pro" className="mt-3" />
            <p className="mt-2 text-xs text-text-muted">{tp("exchangeRate")}</p>
          </Card>
        </Demo>
      </Section>

      <Section id="mbivendosjet" title={t("sections.overlays")} intro={t("overlays.intro")}>
        <Demo label={t("sections.overlays")}>
          <Row>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">{t("overlays.openDialog")}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("overlays.dialogTitle")}</DialogTitle>
                  <DialogDescription>{t("overlays.dialogBody")}</DialogDescription>
                </DialogHeader>
                <DialogBody>
                  <div className="flex flex-col gap-3">
                    {[0, 2, 4].map((index) => (
                      <UserIdentityLine
                        key={index}
                        user={person(index)}
                        size="sm"
                        trailing={
                          <Button size="sm" variant="outline">
                            {t("overlays.dialogSend")}
                          </Button>
                        }
                      />
                    ))}
                  </div>
                </DialogBody>
                <DialogFooter>
                  <Button variant="ghost">{tc("close")}</Button>
                  <Button>{t("overlays.dialogSendAll")}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary">{t("overlays.openSheet")}</Button>
              </SheetTrigger>
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>{t("overlays.sheetTitle")}</SheetTitle>
                  <SheetDescription>{t("overlays.sheetBody")}</SheetDescription>
                </SheetHeader>
                <SheetBody>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(
                      ["text", "question", "material", "poll", "event", "seek", "campusVoice"] as const
                    ).map((type) => (
                      <button
                        key={type}
                        type="button"
                        className="rounded-md border border-border bg-surface p-3 text-sm text-text transition-colors duration-150 ease-brand hover:border-brand-500/50 hover:bg-brand-500/8"
                      >
                        {t(`overlays.postTypes.${type}`)}
                      </button>
                    ))}
                  </div>
                </SheetBody>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">{t("overlays.openMenu")}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>{t("overlays.menuLabel")}</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Bookmark />
                  {t("overlays.menuSave")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 />
                  {t("overlays.menuShare")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell />
                  {t("overlays.menuNotify")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive>
                  <Flag />
                  {t("overlays.menuReport")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip label={t("overlays.tooltipBody")}>
              <Button variant="outline">
                <Check />
                {t("overlays.tooltipTrigger")}
              </Button>
            </Tooltip>
          </Row>
        </Demo>
      </Section>

      <Section id="progresi" title={t("sections.feedback")} intro={t("feedback.intro")}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Demo label={t("feedback.progress")}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-text">{t("feedback.levelProgress")}</span>
                  <span className="tabular text-text-muted">{t("feedback.levelValue")}</span>
                </span>
                <Progress value={64} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-text">{t("feedback.materialProgress")}</span>
                  <span className="tabular text-text-muted">{t("feedback.materialValue")}</span>
                </span>
                <Progress value={75} tone="success" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-text">{t("feedback.profileProgress")}</span>
                  <span className="tabular text-text-muted">40%</span>
                </span>
                <Progress value={40} tone="pro" size="sm" />
              </div>
            </div>
          </Demo>

          <Demo label={t("feedback.steps")}>
            <div className="flex flex-col gap-5">
              <StepProgress current={5} total={9} />
              <Separator label={t("feedback.or")} />
              <StepProgress current={9} total={9} />
            </div>
          </Demo>
        </div>

        <Demo label={t("feedback.toasts")} note={t("feedback.toastsNote")}>
          <Row>
            <Button
              variant="secondary"
              onClick={() =>
                toast.success(t("feedback.demo.successToast"), {
                  description: t("feedback.demo.successToastBody"),
                })
              }
            >
              {t("feedback.demo.success")}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast.error(t("feedback.demo.errorToast"), {
                  description: t("feedback.demo.errorToastBody"),
                })
              }
            >
              {t("feedback.demo.error")}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast.warning(t("feedback.demo.warningToast"), {
                  description: t("feedback.demo.warningToastBody"),
                })
              }
            >
              {t("feedback.demo.warning")}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast(t("feedback.demo.actionToast"), {
                  description: t("feedback.demo.actionToastBody"),
                  action: {
                    label: t("feedback.demo.actionToastCta"),
                    onClick: () => toast.success(t("feedback.demo.actionToastDone")),
                  },
                })
              }
            >
              {t("feedback.demo.action")}
            </Button>
            <Button
              variant="pro"
              onClick={() =>
                toast.success(t("feedback.demo.proToast"), {
                  description: t("feedback.demo.proToastBody"),
                  icon: <Sparkles className="size-4" />,
                })
              }
            >
              {t("feedback.demo.pro")}
            </Button>
          </Row>
        </Demo>
      </Section>

      <Section id="skeleton" title={t("sections.skeletons")} intro={t("skeletons.intro")}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Demo label={t("skeletons.post")}>
            <SkeletonPost label={tc("loading")} />
          </Demo>
          <Demo label={t("skeletons.material")}>
            <div className="flex flex-col gap-3">
              <SkeletonMaterial label={tc("loading")} />
              <SkeletonMaterial label={tc("loading")} />
            </div>
          </Demo>
          <Demo label={t("skeletons.people")}>
            <div className="flex flex-col gap-4">
              <SkeletonPerson label={tc("loading")} />
              <SkeletonPerson label={tc("loading")} />
              <SkeletonPerson label={tc("loading")} />
            </div>
          </Demo>
          <Demo label={t("skeletons.blocks")}>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          </Demo>
        </div>
      </Section>

      <Section id="gjendjet-boshe" title={t("sections.empty")} intro={t("empty.intro")}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Demo label={t("sections.empty")} bare>
            <EmptyState
              illustration="feed"
              title={te("feed.title")}
              description={te("feed.body")}
              action={
                <Button>
                  <Users />
                  {te("feed.action")}
                </Button>
              }
            />
          </Demo>

          <Demo label={t("cards.material")} bare>
            <EmptyState
              illustration="materials"
              title={te("course.title")}
              description={te("course.body")}
              action={
                <Button>
                  <BookOpen />
                  {te("course.action")}
                </Button>
              }
            />
          </Demo>

          <Demo label={t("overlays.postTypes.text")} bare>
            <EmptyState
              illustration="messages"
              compact
              title={te("messages.title")}
              description={te("messages.body")}
              action={<Button variant="outline">{te("messages.action")}</Button>}
            />
          </Demo>

          <Demo label={tc("search")} bare>
            <EmptyState
              illustration="search"
              compact
              title={te("search.title")}
              description={te("search.body")}
              action={<Button variant="secondary">{te("search.action")}</Button>}
            />
          </Demo>

          <Demo label={t("cards.event")} bare>
            <EmptyState
              illustration="calendar"
              compact
              title={te("schedule.title")}
              description={te("schedule.body")}
              action={
                <Button variant="outline">
                  <CalendarDays />
                  {te("schedule.action")}
                </Button>
              }
            />
          </Demo>

          <Demo label={te("notifications.title")} bare>
            <EmptyState
              illustration="bell"
              compact
              title={te("notifications.title")}
              description={te("notifications.body")}
            />
          </Demo>
        </div>
      </Section>
    </>
  );
}

function Mark({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "grid size-5 place-items-center rounded-full",
        on ? "bg-success/15 text-success-text" : "bg-surface-2 text-text-muted",
      )}
    >
      {on ? <Check className="size-3" /> : <Lock className="size-3" />}
    </span>
  );
}

/**
 * Zgjedhësi i shtrirjes. Opsionet e kyçura shfaqen me dry dhe tekstin «Me Pro»,
 * kurrë të fshehura. Klikimi shpjegon kontekstin, nuk bërtet.
 */
function ScopeSelectorDemo() {
  const ta = useTranslations("access");
  const tp = useTranslations("pro");
  const [scope, setScope] = React.useState<string>("faculty");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {POST_SCOPES.map((item) => {
          const active = scope === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (item.free) {
                  setScope(item.key);
                  return;
                }
                toast(tp("lockedScopeTitle"), {
                  description: tp("lockedScopeBody", { scope: ta(`scopes.${item.key}`) }),
                  action: { label: tp("upgrade"), onClick: () => undefined },
                });
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
                "transition-all duration-150 ease-brand",
                active
                  ? "border-brand-500 bg-brand-500/12 text-brand-500"
                  : item.free
                    ? "border-border bg-surface text-text-muted hover:text-text"
                    : "border-dashed border-border bg-surface text-text-muted",
              )}
            >
              {!item.free ? <Lock className="size-3 shrink-0" /> : null}
              {ta(`scopes.${item.key}`)}
              {!item.free ? (
                <span className="rounded-full bg-surface-2 px-1.5 py-px text-[10px] uppercase tracking-wide">
                  {tp("withPro")}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-text-muted">{ta("intro")}</p>
    </div>
  );
}
