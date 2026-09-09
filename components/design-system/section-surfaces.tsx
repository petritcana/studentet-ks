"use client";

import * as React from "react";
import {
  BadgeCheck,
  Bell,
  Bookmark,
  CalendarDays,
  FileText,
  Flag,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { EmptyState } from "@/components/shared/empty-state";
import { FACULTY_THEMES } from "@/lib/faculties";
import { cn } from "@/lib/utils";
import { Demo, Row, Section } from "./primitives";

const PEOPLE = [
  { name: "Erza Bytyqi", meta: "Mjekësi, viti III · Prishtinë", verified: true },
  { name: "Arian Gashi", meta: "Ekonomik, viti I · Gjilan", verified: false },
  { name: "Blerim Krasniqi", meta: "FSHMN, master · Prishtinë", verified: true },
  { name: "Dea Morina", meta: "Arte, viti II · Pejë", verified: false },
  { name: "Rina Hoxha", meta: "Juridik, viti II · Ferizaj", verified: true },
  { name: "Endrit Berisha", meta: "FSHMN, viti III · Mitrovicë", verified: false },
];

export function SectionSurfaces() {
  return (
    <>
      <Section
        id="kartat"
        title="Kartat"
        intro="Sipërfaqja bazë e platformës. Kufi 1px, rreze 16px, hije e butë. Ngrihet vetëm nëse është e klikueshme."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Demo label="Kartë materiali" bare>
            <Card interactive>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-md bg-faculty-economics/12 text-faculty-economics">
                    <FileText className="size-5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <CardTitle className="truncate">
                      Skripta Mikroekonomi 2024, Prof. Berisha
                    </CardTitle>
                    <CardDescription>
                      Mikroekonomi · viti I · 84 faqe · 2,4 MB
                    </CardDescription>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="success">
                        <BadgeCheck />I verifikuar
                      </Badge>
                      <Badge>Skriptë</Badge>
                      <Badge variant="brand">Ekonomik</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="justify-between">
                <span className="flex items-center gap-1.5 text-sm text-text-muted">
                  <Star className="size-4 fill-warning text-warning" />
                  <span className="tabular text-text">4,7</span>
                  <span className="tabular">· 312 shkarkime</span>
                </span>
                <Button size="sm" variant="secondary">
                  Hape
                </Button>
              </CardFooter>
            </Card>
          </Demo>

          <Demo label="Kartë postimi" bare>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <Avatar name="Erza Bytyqi" verified />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-semibold text-text">Erza Bytyqi</span>
                      <span className="text-xs text-text-muted">Mjekësi, viti III</span>
                    </span>
                    <span className="text-xs text-text-muted">
                      3 lëndë të përbashkëta · para 2 orësh
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" aria-label="Më shumë veprime">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Postimi</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Bookmark />
                        Ruaje
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share2 />
                        Ndaje me një shok
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive>
                        <Flag />
                        Raporto
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="measure text-sm text-text">
                  I ngarkova shënimet e Anatomisë nga ligjëratat e këtij semestri, bashkë me skemat
                  që i bëra për provimin. Nëse gjeni gabime, shkruani në komente e i rregulloj.
                </p>
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
                <AvatarStack people={PEOPLE.slice(1, 5)} size="xs" />
              </CardFooter>
            </Card>
          </Demo>

          <Demo label="Kartë lënde" bare>
            <Card interactive className="overflow-hidden">
              <div className={cn("h-1.5 w-full", FACULTY_THEMES.medicine.dot)} aria-hidden />
              <CardHeader>
                <CardTitle>Anatomi e njeriut I</CardTitle>
                <CardDescription>
                  Mjekësi · viti I · semestri 1 · 9 ECTS · Prof. Zeqiri
                </CardDescription>
              </CardHeader>
              <CardFooter className="justify-between">
                <span className="flex items-center gap-2 text-xs text-text-muted">
                  <Users className="size-4" />
                  <span className="tabular">218 studentë</span>
                </span>
                <Badge variant="brand">
                  <Sparkles />
                  Lëndë e jotja
                </Badge>
              </CardFooter>
            </Card>
          </Demo>

          <Demo label="Kartë eventi" bare>
            <Card interactive>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-md border border-border bg-surface-2">
                    <span className="text-[10px] uppercase tracking-wide text-text-muted">nën</span>
                    <span className="tabular text-lg font-semibold text-text">14</span>
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <CardTitle>Studio bashkë: Statistikë para afatit</CardTitle>
                    <CardDescription>
                      16:00 · Biblioteka e Fakultetit Ekonomik, salla 2
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="justify-between">
                <span className="flex items-center gap-2">
                  <AvatarStack people={PEOPLE.slice(0, 4)} size="xs" />
                  <span className="text-xs text-text-muted">
                    6 nga gjenerata jote po shkojnë
                  </span>
                </span>
                <Button size="sm">Po vij</Button>
              </CardFooter>
            </Card>
          </Demo>
        </div>
      </Section>

      <Section
        id="avataret"
        title="Avatarët"
        intro="Pa foto, gradienti gjenerohet nga emri dhe mbetet i njëjti përgjithmonë. Asnjë siluetë gri."
      >
        <Demo label="Madhësitë">
          <Row className="gap-4">
            {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
              <div key={size} className="flex flex-col items-center gap-2">
                <Avatar name="Erza Bytyqi" size={size} />
                <span className="tabular text-xs text-text-muted">{size}</span>
              </div>
            ))}
          </Row>
        </Demo>

        <Demo label="Gradientë të qëndrueshëm" note="i njëjti emër, i njëjti gradient">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PEOPLE.map((person) => (
              <div key={person.name} className="flex items-center gap-3">
                <Avatar name={person.name} verified={person.verified} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-text">{person.name}</span>
                  <span className="truncate text-xs text-text-muted">{person.meta}</span>
                </span>
              </div>
            ))}
          </div>
        </Demo>

        <Demo label="Grumbull dhe unazë">
          <Row className="gap-6">
            <AvatarStack people={PEOPLE} max={4} />
            <AvatarStack people={PEOPLE.slice(0, 3)} size="md" max={3} />
            <Avatar name="Blerim Krasniqi" size="lg" ring verified />
          </Row>
        </Demo>
      </Section>

      <Section
        id="badge"
        title="Badge dhe etiketa"
        intro="Badge tregon gjendje ose arritje. Nuk klikohet. Nëse klikohet, është Chip."
      >
        <Demo label="Variantet">
          <Row>
            <Badge>Skriptë</Badge>
            <Badge variant="brand">Ekonomik</Badge>
            <Badge variant="accent">I ri</Badge>
            <Badge variant="success">
              <BadgeCheck />I verifikuar
            </Badge>
            <Badge variant="warning">Pa verifikuar ende</Badge>
            <Badge variant="danger">I fshehur për rishikim</Badge>
            <Badge variant="solid">Lider i lëndës</Badge>
          </Row>
        </Demo>

        <Demo label="Badge-t e platformës" note="statusi vjen nga kompetenca, jo nga fama">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Lider i lëndës: Statistikë", desc: "Kontributi më i vlerësuar këtë semestër" },
              { name: "Shpëtimtar", desc: "10 përgjigje të pranuara" },
              { name: "Arkivist", desc: "25 materiale të miratuara" },
              { name: "Themelues", desc: "Nga 500 përdoruesit e parë" },
              { name: "Ambasador", desc: "10 ftesa të suksesshme" },
              { name: "Pionier i fakultetit", desc: "I pari nga fakulteti yt" },
            ].map((badge) => (
              <div
                key={badge.name}
                className="flex items-start gap-3 rounded-md border border-border bg-surface p-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500/12 text-brand-500">
                  <BadgeCheck className="size-4" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-text">{badge.name}</span>
                  <span className="text-xs text-text-muted">{badge.desc}</span>
                </span>
              </div>
            ))}
          </div>
        </Demo>
      </Section>

      <Section
        id="mbivendosjet"
        title="Mbivendosjet"
        intro="Dialogu për vendime, fleta për veprime në telefon, menyja për veprime dytësore, tooltip vetëm për sqarim të shkurtër."
      >
        <Demo label="Dialog, fletë, meny, tooltip">
          <Row>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Hap dialogun</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ndaje këtë material</DialogTitle>
                  <DialogDescription>
                    Shkon te biseda, jo në feed. Vetëm ata që i zgjedh e shohin.
                  </DialogDescription>
                </DialogHeader>
                <DialogBody>
                  <div className="flex flex-col gap-3">
                    {PEOPLE.slice(0, 3).map((person) => (
                      <div key={person.name} className="flex items-center gap-3">
                        <Avatar name={person.name} size="sm" verified={person.verified} />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm text-text">{person.name}</span>
                          <span className="truncate text-xs text-text-muted">{person.meta}</span>
                        </span>
                        <Button size="sm" variant="outline">
                          Dërgo
                        </Button>
                      </div>
                    ))}
                  </div>
                </DialogBody>
                <DialogFooter>
                  <Button variant="ghost">Mbylle</Button>
                  <Button>Dërgo te të gjithë</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary">Hap fletën</Button>
              </SheetTrigger>
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>Çfarë po poston?</SheetTitle>
                  <SheetDescription>
                    Zgjidh llojin dhe forma përshtatet vetë.
                  </SheetDescription>
                </SheetHeader>
                <SheetBody>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      "Postim",
                      "Pyetje",
                      "Material",
                      "Sondazh",
                      "Event",
                      "Zëri i kampusit",
                    ].map((type) => (
                      <button
                        key={type}
                        type="button"
                        className="rounded-md border border-border bg-surface p-3 text-sm text-text transition-colors duration-150 ease-brand hover:border-brand-500/50 hover:bg-brand-500/8"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </SheetBody>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">Hap menynë</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Materiali</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Bookmark />
                  Ruaje në dosjen time
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 />
                  Ndaje
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell />
                  Njofto kur ka version të ri
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive>
                  <Flag />
                  Raporto
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip label="Ky material e ka kaluar kontrollin e tre studentëve.">
              <Button variant="outline">
                <BadgeCheck />
                Pse është i verifikuar?
              </Button>
            </Tooltip>
          </Row>
        </Demo>
      </Section>

      <Section
        id="progresi"
        title="Progresi"
        intro="Progresi tregon rrugë, jo pritje. Për pritje përdoret skeleton."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Demo label="Shirit progresi">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between text-sm">
                  <span className="text-text">Nga Kolegi te Bartës shënimesh</span>
                  <span className="tabular text-text-muted">640 / 1.000 XP</span>
                </span>
                <Progress value={64} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between text-sm">
                  <span className="text-text">Materialet e verifikuara në Statistikë</span>
                  <span className="tabular text-text-muted">18 / 24</span>
                </span>
                <Progress value={75} tone="success" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between text-sm">
                  <span className="text-text">Profili yt</span>
                  <span className="tabular text-text-muted">40%</span>
                </span>
                <Progress value={40} tone="accent" size="sm" />
              </div>
            </div>
          </Demo>

          <Demo label="Hapat e regjistrimit">
            <div className="flex flex-col gap-5">
              <StepProgress current={5} total={9} />
              <Separator label="ose" />
              <StepProgress current={9} total={9} />
            </div>
          </Demo>
        </div>
      </Section>

      <Section
        id="skeleton"
        title="Skeleton"
        intro="Kurrë spinner. Forma e skeletonit është forma e përmbajtjes që po vjen, kështu që faqja nuk kërcen kur mbërrin."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Demo label="Postim">
            <SkeletonPost />
          </Demo>
          <Demo label="Material">
            <div className="flex flex-col gap-3">
              <SkeletonMaterial />
              <SkeletonMaterial />
            </div>
          </Demo>
          <Demo label="Njerëz">
            <div className="flex flex-col gap-4">
              <SkeletonPerson />
              <SkeletonPerson />
              <SkeletonPerson />
            </div>
          </Demo>
          <Demo label="Blloqe bazë">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          </Demo>
        </div>
      </Section>

      <Section
        id="gjendjet-boshe"
        title="Gjendjet boshe"
        intro="Asnjë ekran bosh pa udhëzim. Një ilustrim i vogël, një fjali njerëzore, një veprim."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Demo label="Feed bosh" bare>
            <EmptyState
              illustration="feed"
              title="Këtu është ende qetë"
              description="Ndiq disa nga gjenerata jote dhe do të gjallërohet."
              action={
                <Button>
                  <Users />
                  Ndiq gjeneratën time
                </Button>
              }
              secondaryAction={<Button variant="ghost">Më vonë</Button>}
            />
          </Demo>

          <Demo label="Lëndë pa materiale" bare>
            <EmptyState
              illustration="materials"
              title="Askush s'ka ngarkuar ende materiale për këtë lëndë"
              description="Bëhu i pari dhe merr badge-in Pionier."
              action={<Button>Ngarko material</Button>}
            />
          </Demo>

          <Demo label="Bisedë e re" bare>
            <EmptyState
              illustration="messages"
              title="Fillo bisedën"
              description="Ju jeni bashkë në 3 lëndë."
              action={<Button variant="outline">Shkruaj përshëndetje</Button>}
            />
          </Demo>

          <Demo label="Kërkim pa rezultat" bare>
            <EmptyState
              illustration="search"
              compact
              title="S'gjetëm asgjë për 'ekonometri e avancuar'"
              description="Provo emrin e lëndës ashtu si shkruhet në silabus, ose kërko profesorin."
              action={<Button variant="secondary">Pastro kërkimin</Button>}
            />
          </Demo>

          <Demo label="Orar bosh" bare>
            <EmptyState
              illustration="calendar"
              compact
              title="Sot s'ke ligjërata"
              description="Afati më i afërt është Statistika, më 14 nëntor."
              action={<Button variant="outline">Shto afat provimi</Button>}
            />
          </Demo>

          <Demo label="Pa sugjerime" bare>
            <EmptyState
              illustration="people"
              compact
              title="I ndoqe të gjithë nga gjenerata jote"
              description="Zgjero rrethin: ndiq ata që erdhën nga shkolla jote e mesme."
              action={<Button variant="outline">Shiko shkollën time</Button>}
            />
          </Demo>
        </div>
      </Section>

      <Section
        id="njoftimet"
        title="Njoftimet"
        intro="Thuaj çfarë ndodhi, jo 'operacioni u krye'. Gabimi gjithmonë ofron hapin tjetër."
      >
        <Demo label="Provoji">
          <Row>
            <Button
              variant="secondary"
              onClick={() =>
                toast.success("E ruajtëm materialin", {
                  description: "E gjen te Unë · Ruajtjet.",
                })
              }
            >
              Sukses
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast.error("S'u ngarkua dot", {
                  description: "Provo një skedar nën 25MB.",
                })
              }
            >
              Gabim
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast.warning("Ky material s'e ka kaluar ende kontrollin", {
                  description: "Tre studentë duhet ta vlerësojnë para se të shfaqet te të gjithë.",
                })
              }
            >
              Kujdes
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast("Arta po të ndjek", {
                  description: "Ekonomik, viti II. Jeni bashkë në 3 lëndë.",
                  action: {
                    label: "Ndiqe edhe ti",
                    onClick: () => toast.success("U bëtë shokë. Tani DM-ja është e hapur."),
                  },
                })
              }
            >
              Me veprim
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast("Nesër ke Statistikë në 10:00", {
                  description: "Salla 4, Fakulteti Ekonomik.",
                  icon: <CalendarDays className="size-4" />,
                })
              }
            >
              Njoftim
            </Button>
          </Row>
        </Demo>
      </Section>
    </>
  );
}
