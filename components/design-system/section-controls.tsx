"use client";

import * as React from "react";
import {
  ArrowRight,
  BookOpen,
  Download,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, CheckboxRow } from "@/components/ui/checkbox";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioRow } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch, SwitchRow } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Demo, Row, Section } from "./primitives";

const INTERESTS = [
  "programim",
  "dizajn",
  "muzikë",
  "sport",
  "sipërmarrësi",
  "vullnetarizëm",
  "gjuhë",
  "fotografi",
  "gaming",
  "letërsi",
  "aktivizëm",
];

export function SectionControls() {
  const [interests, setInterests] = React.useState<string[]>(["programim", "letërsi"]);
  const [emailError, setEmailError] = React.useState(true);
  const [bio, setBio] = React.useState(
    "Ekonomiku, viti II. Ndihmoj me statistikë, kërkoj ndihmë me gjermanisht.",
  );

  return (
    <>
      <Section
        id="butonat"
        title="Butonat"
        intro="Pesë variante. Vetëm një veprim kryesor për ekran. Teksti thotë çfarë ndodh, jo 'Konfirmo'."
      >
        <Demo label="Variantet">
          <Row>
            <Button>Ndiqe edhe ti</Button>
            <Button variant="secondary">Ruaje për më vonë</Button>
            <Button variant="outline">Shiko orarin</Button>
            <Button variant="ghost">Anulo</Button>
            <Button variant="danger">
              <Trash2 />
              Fshije materialin
            </Button>
          </Row>
        </Demo>

        <Demo label="Madhësitë" note="32 · 40 · 48 px lartësi">
          <Row>
            <Button size="sm">Ndiqe</Button>
            <Button size="md">Ndiqe</Button>
            <Button size="lg">Ndiqe</Button>
            <Button size="pill" variant="outline">
              <UserPlus />
              Ndiq gjeneratën time
            </Button>
            <Button size="icon" variant="secondary" aria-label="Shto material">
              <Plus />
            </Button>
          </Row>
        </Demo>

        <Demo label="Me ikonë dhe gjendje" note="pa spinner, pika në vend të tij">
          <Row>
            <Button>
              <Download />
              Shkarko skriptën
            </Button>
            <Button variant="secondary">
              Vazhdo
              <ArrowRight />
            </Button>
            <Button loading>Duke ngarkuar</Button>
            <Button disabled>I paaftësuar</Button>
          </Row>
        </Demo>
      </Section>

      <Section
        id="format"
        title="Format"
        intro="Një vendim për ekran. Etiketa mbi fushë, ndihma nën të, gabimi zëvendëson ndihmën dhe gjithmonë ofron zgjidhje."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Demo label="Fushat e tekstit">
            <div className="flex flex-col gap-4">
              <Field
                label="Emri i plotë"
                htmlFor="ds-name"
                help="Ashtu si të thërrasin në fakultet."
              >
                <Input id="ds-name" defaultValue="Erza Bytyqi" />
              </Field>

              <Field
                label="Email studentor"
                htmlFor="ds-email"
                hint="e detyrueshme"
                error={
                  emailError
                    ? "Ky email s'duket institucional. Provo atë me @student.uni-pr.edu."
                    : undefined
                }
                help="Emaili institucional të jep badge-in I verifikuar."
              >
                <Input
                  id="ds-email"
                  type="email"
                  invalid={emailError}
                  defaultValue="erza.bytyqi@gmail.com"
                  onChange={() => setEmailError(false)}
                />
              </Field>

              <Field label="Kërko" htmlFor="ds-search">
                <Input
                  id="ds-search"
                  icon={<Search />}
                  placeholder="Lëndë, material, person ose event"
                />
              </Field>

              <Field
                label="Bio"
                htmlFor="ds-bio"
                help={`${bio.length} nga 160 shkronja`}
              >
                <Textarea
                  id="ds-bio"
                  autoGrow
                  maxLength={160}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Ekonomiku, viti II. Ndihmoj me statistikë, kërkoj ndihmë me gjermanisht."
                />
              </Field>
            </div>
          </Demo>

          <Demo label="Zgjedhja">
            <div className="flex flex-col gap-4">
              <Field label="Fakulteti" htmlFor="ds-faculty">
                <Select defaultValue="ekonomik">
                  <SelectTrigger id="ds-faculty">
                    <SelectValue placeholder="Zgjidh fakultetin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectLabel>Universiteti i Prishtinës</SelectLabel>
                    <SelectItem value="ekonomik">Fakulteti Ekonomik</SelectItem>
                    <SelectItem value="juridik">Fakulteti Juridik</SelectItem>
                    <SelectItem value="mjekesi">Fakulteti i Mjekësisë</SelectItem>
                    <SelectItem value="fshmn">FSHMN</SelectItem>
                    <SelectItem value="filologjik">Fakulteti i Filologjisë</SelectItem>
                    <SelectItem value="arte">Fakulteti i Arteve</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Niveli i studimeve" htmlFor="ds-level">
                <RadioGroup defaultValue="bachelor" aria-label="Niveli i studimeve">
                  <RadioRow
                    value="bachelor"
                    id="ds-level-bachelor"
                    label="Bachelor"
                    description="Tre ose katër vite, varësisht programit."
                  />
                  <RadioRow
                    value="master"
                    id="ds-level-master"
                    label="Master"
                    description="Studime pasuniversitare."
                  />
                  <RadioRow
                    value="doktorature"
                    id="ds-level-phd"
                    label="Doktoraturë"
                    description="Kërkim shkencor."
                  />
                </RadioGroup>
              </Field>

              <Field label="Lëndët e këtij semestri" htmlFor="ds-courses">
                <div className="flex flex-col gap-2" id="ds-courses">
                  <CheckboxRow
                    id="ds-course-mikro"
                    defaultChecked
                    label="Mikroekonomi"
                    description="Viti I · semestri 1 · 6 ECTS · Prof. Berisha"
                  />
                  <CheckboxRow
                    id="ds-course-stat"
                    defaultChecked
                    label="Statistikë"
                    description="Viti I · semestri 1 · 5 ECTS · Prof. Krasniqi"
                  />
                  <CheckboxRow
                    id="ds-course-kont"
                    label="Kontabilitet financiar"
                    description="Viti I · semestri 1 · 6 ECTS · Prof. Hoxha"
                  />
                </div>
              </Field>
            </div>
          </Demo>
        </div>

        <Demo label="Interesat" note="ushqejnë rekomandimet sociale, jo ato akademike">
          <ChipGroup>
            {INTERESTS.map((interest) => (
              <Chip
                key={interest}
                selected={interests.includes(interest)}
                onClick={() =>
                  setInterests((current) =>
                    current.includes(interest)
                      ? current.filter((item) => item !== interest)
                      : [...current, interest],
                  )
                }
              >
                {interest}
              </Chip>
            ))}
          </ChipGroup>
          <p className="mt-3 text-xs text-text-muted">
            {interests.length === 0
              ? "S'ke zgjedhur ende asnjë. Zgjidh të paktën tre."
              : `Zgjodhe ${interests.length} nga ${INTERESTS.length}.`}
          </p>
        </Demo>

        <Demo label="Çelësat" note="ndryshimi ruhet vetë, pa buton 'Ruaj'">
          <div className="flex flex-col gap-3">
            <SwitchRow
              id="ds-switch-seen"
              defaultChecked
              label="Trego kur i lexoj mesazhet"
              description="Nëse e fik, as ti nuk e sheh kur t'i lexojnë."
            />
            <SwitchRow
              id="ds-switch-push"
              label="Njoftime në telefon"
              description="Maksimum dy në ditë. Kurrë pas orës 21:00."
            />
            <Row className="gap-4 pt-1">
              <label htmlFor="ds-switch-bare" className="text-sm text-text">
                Çelës i vetëm
              </label>
              <Switch id="ds-switch-bare" defaultChecked />
              <span className="ml-4 inline-flex items-center gap-2">
                <Checkbox id="ds-check-bare" defaultChecked />
                <label htmlFor="ds-check-bare" className="text-sm text-text">
                  Kuti e vetme
                </label>
              </span>
            </Row>
          </div>
        </Demo>
      </Section>

      <Section
        id="tabs"
        title="Tabs"
        intro="Dy forma. Pilulat për ndërrim konteksti brenda një faqeje, vija për seksione brenda një kolone."
      >
        <Demo label="Pilula" note="tabs e feed-it">
          <Tabs defaultValue="per-ty">
            <TabsList>
              <TabsTrigger value="per-ty">Për ty</TabsTrigger>
              <TabsTrigger value="gjenerata">Gjenerata</TabsTrigger>
              <TabsTrigger value="ndjek">Ndjek</TabsTrigger>
            </TabsList>
            <TabsContent value="per-ty">
              <p className="text-sm text-text-muted">
                Renditje algoritmike: afërsi sociale, relevancë akademike, freski, cilësi angazhimi
                dhe shumëllojshmëri.
              </p>
            </TabsContent>
            <TabsContent value="gjenerata">
              <p className="text-sm text-text-muted">
                Fakulteti dhe viti yt, kronologjik. Këtu e sheh se çfarë po ndodh sot te ti.
              </p>
            </TabsContent>
            <TabsContent value="ndjek">
              <p className="text-sm text-text-muted">
                Vetëm ata që i ndjek, kronologjik. Pa algoritëm, pa surpriza.
              </p>
            </TabsContent>
          </Tabs>
        </Demo>

        <Demo label="Vijë" note="seksionet e një lënde">
          <Tabs defaultValue="materialet">
            <TabsList variant="underline">
              <TabsTrigger value="materialet">
                <BookOpen />
                Materialet
              </TabsTrigger>
              <TabsTrigger value="pyetjet">Pyetjet</TabsTrigger>
              <TabsTrigger value="provimet">Provimet e kaluara</TabsTrigger>
              <TabsTrigger value="njerezit">Kush e ndjek</TabsTrigger>
            </TabsList>
            <TabsContent value="materialet">
              <p className="text-sm text-text-muted">
                84 materiale për Mikroekonomi, 61 të verifikuara nga studentët.
              </p>
            </TabsContent>
            <TabsContent value="pyetjet">
              <p className="text-sm text-text-muted">
                12 pyetje pa përgjigje. Ti e ke kaluar këtë provim.
              </p>
            </TabsContent>
            <TabsContent value="provimet">
              <p className="text-sm text-text-muted">
                Afati i qershorit 2023 dhe 2024, me zgjidhje nga gjenerata para teje.
              </p>
            </TabsContent>
            <TabsContent value="njerezit">
              <p className="text-sm text-text-muted">
                218 studentë e ndjekin këtë lëndë këtë semestër.
              </p>
            </TabsContent>
          </Tabs>
        </Demo>
      </Section>
    </>
  );
}
