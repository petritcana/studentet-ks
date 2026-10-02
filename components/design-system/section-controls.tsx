"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import { ProBadge } from "@/components/identity/pro-badge";
import { VerifiedMark } from "@/components/identity/verified-mark";
import { Avatar } from "@/components/ui/avatar";
import { FACULTY_CODES } from "@/lib/faculties";
import { DEMO_PEOPLE, INTEREST_KEYS } from "./demo-data";
import { Demo, Meta, Row, Section } from "./primitives";

export function SectionControls() {
  const t = useTranslations("designSystem");
  const tf = useTranslations("faculty");
  const tc = useTranslations("common");
  const ti = useTranslations("identity");
  const tp = useTranslations("pro");

  const [interests, setInterests] = React.useState<string[]>(["programming", "literature"]);
  const [emailError, setEmailError] = React.useState(true);
  const [bio, setBio] = React.useState(t("forms.demo.bioPlaceholder"));

  const person = (index: number) => {
    const demo = DEMO_PEOPLE[index];
    return {
      ...demo,
      facultyLabel: tf(`${demo.facultyCode}.short`),
    };
  };

  return (
    <>
      <Section id="identiteti" title={t("sections.identity")} intro={t("identity.intro")}>
        <Demo label={t("identity.sizes")}>
          <div className="flex flex-col gap-4">
            {(["sm", "md", "lg"] as const).map((size) => (
              <div key={size} className="flex items-center gap-4">
                <Meta>{size}</Meta>
                <UserIdentityLine user={person(0)} size={size} />
              </div>
            ))}
          </div>
        </Demo>

        <Demo label={t("identity.states")}>
          <div className="flex flex-col gap-4">
            {[1, 0, 2, 3].map((index) => (
              <UserIdentityLine key={index} user={person(index)} />
            ))}
          </div>
        </Demo>

        <Demo label={t("identity.inline")}>
          <div className="flex flex-col gap-3">
            <UserIdentityLine user={person(4)} size="sm" inline showYear={false} />
            <UserIdentityLine user={person(5)} size="sm" inline showYear={false} />
          </div>
        </Demo>

        <Demo label={t("pro.badges")}>
          <Row className="gap-4">
            <span className="inline-flex items-center gap-2">
              <VerifiedMark />
              <Meta>VerifiedMark</Meta>
            </span>
            <span className="inline-flex items-center gap-2">
              <ProBadge />
              <Meta>ProBadge</Meta>
            </span>
            <span className="inline-flex items-center gap-2">
              <ProBadge size="sm" />
              <Meta>ProBadge sm</Meta>
            </span>
          </Row>
        </Demo>

        <Demo label={t("identity.avatars")} note={t("identity.avatarsNote")}>
          <Row className="gap-4">
            {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
              <div key={size} className="flex flex-col items-center gap-2">
                <Avatar name="Erza Krasniqi" size={size} />
                <Meta>{size}</Meta>
              </div>
            ))}
            <div className="flex flex-col items-center gap-2">
              <Avatar name="Endrit Rexhepi" size="lg" ring />
              <Meta>ring</Meta>
            </div>
          </Row>
        </Demo>
      </Section>

      <Section id="butonat" title={t("sections.buttons")} intro={t("buttons.intro")}>
        <Demo label={t("buttons.variants")}>
          <Row>
            <Button>{t("buttons.demo.follow")}</Button>
            <Button variant="secondary">{t("buttons.demo.saveLater")}</Button>
            <Button variant="outline">{t("buttons.demo.schedule")}</Button>
            <Button variant="ghost">{t("buttons.demo.cancel")}</Button>
            <Button variant="danger">
              <Trash2 />
              {t("buttons.demo.deleteMaterial")}
            </Button>
            <Button variant="pro">{tp("upgrade")}</Button>
          </Row>
        </Demo>

        <Demo label={t("buttons.sizes")} note="32 · 40 · 48">
          <Row>
            <Button size="sm">{t("buttons.demo.follow")}</Button>
            <Button size="md">{t("buttons.demo.follow")}</Button>
            <Button size="lg">{t("buttons.demo.follow")}</Button>
            <Button size="pill" variant="outline">
              <UserPlus />
              {t("buttons.demo.followGeneration")}
            </Button>
            <Button size="icon" variant="secondary" aria-label={t("buttons.demo.addMaterial")}>
              <Plus />
            </Button>
          </Row>
        </Demo>

        <Demo label={t("buttons.states")} note={t("buttons.statesNote")}>
          <Row>
            <Button>
              <Download />
              {t("buttons.demo.downloadScript")}
            </Button>
            <Button variant="secondary">
              {tc("continue")}
              <ArrowRight />
            </Button>
            <Button loading>{t("buttons.demo.loading")}</Button>
            <Button disabled>{t("buttons.demo.disabled")}</Button>
          </Row>
        </Demo>
      </Section>

      <Section id="format" title={t("sections.forms")} intro={t("forms.intro")}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Demo label={t("forms.textFields")}>
            <div className="flex flex-col gap-4">
              <Field
                label={t("forms.demo.nameLabel")}
                htmlFor="ds-name"
                help={t("forms.demo.nameHelp")}
              >
                <Input id="ds-name" defaultValue={t("forms.demo.nameValue")} />
              </Field>

              <Field
                label={t("forms.demo.emailLabel")}
                htmlFor="ds-email"
                hint={tc("required")}
                error={emailError ? t("forms.demo.emailError") : undefined}
                help={t("forms.demo.emailHelp")}
              >
                <Input
                  id="ds-email"
                  type="email"
                  invalid={emailError}
                  defaultValue="erza.krasniqi@gmail.com"
                  onChange={() => setEmailError(false)}
                />
              </Field>

              <Field label={t("forms.demo.searchLabel")} htmlFor="ds-search">
                <Input
                  id="ds-search"
                  icon={<Search />}
                  placeholder={t("forms.demo.searchPlaceholder")}
                />
              </Field>

              <Field
                label={t("forms.demo.bioLabel")}
                htmlFor="ds-bio"
                help={t("forms.demo.bioCounter", { count: bio.length })}
              >
                <Textarea
                  id="ds-bio"
                  autoGrow
                  maxLength={160}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder={t("forms.demo.bioPlaceholder")}
                />
              </Field>
            </div>
          </Demo>

          <Demo label={t("forms.choice")}>
            <div className="flex flex-col gap-4">
              <Field label={t("forms.demo.facultyLabel")} htmlFor="ds-faculty">
                <Select defaultValue="electrical">
                  <SelectTrigger id="ds-faculty">
                    <SelectValue placeholder={t("forms.demo.facultyPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectLabel>{t("forms.demo.universityGroup")}</SelectLabel>
                    {FACULTY_CODES.slice(0, 8).map((code) => (
                      <SelectItem key={code} value={code}>
                        {tf(`${code}.name`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t("forms.demo.levelLabel")} htmlFor="ds-level">
                <RadioGroup defaultValue="bachelor" aria-label={t("forms.demo.levelLabel")}>
                  <RadioRow
                    value="bachelor"
                    id="ds-level-bachelor"
                    label={ti("level.bachelor")}
                    description={t("forms.demo.levelBachelorDesc")}
                  />
                  <RadioRow
                    value="master"
                    id="ds-level-master"
                    label={ti("level.master")}
                    description={t("forms.demo.levelMasterDesc")}
                  />
                  <RadioRow
                    value="phd"
                    id="ds-level-phd"
                    label={ti("level.phd")}
                    description={t("forms.demo.levelPhdDesc")}
                  />
                </RadioGroup>
              </Field>

              <Field label={t("forms.demo.coursesLabel")} htmlFor="ds-courses">
                <div className="flex flex-col gap-2" id="ds-courses">
                  <CheckboxRow
                    id="ds-course-1"
                    defaultChecked
                    label={t("forms.demo.course1")}
                    description={t("forms.demo.course1Desc")}
                  />
                  <CheckboxRow
                    id="ds-course-2"
                    defaultChecked
                    label={t("forms.demo.course2")}
                    description={t("forms.demo.course2Desc")}
                  />
                  <CheckboxRow
                    id="ds-course-3"
                    label={t("forms.demo.course3")}
                    description={t("forms.demo.course3Desc")}
                  />
                </div>
              </Field>
            </div>
          </Demo>
        </div>

        <Demo label={t("forms.interests")} note={t("forms.interestsNote")}>
          <ChipGroup>
            {INTEREST_KEYS.map((key) => (
              <Chip
                key={key}
                selected={interests.includes(key)}
                onClick={() =>
                  setInterests((current) =>
                    current.includes(key)
                      ? current.filter((item) => item !== key)
                      : [...current, key],
                  )
                }
              >
                {t(`interests.${key}`)}
              </Chip>
            ))}
          </ChipGroup>
          <p className="mt-3 text-xs text-text-muted">
            {interests.length === 0
              ? t("forms.demo.selectedNone")
              : t("forms.demo.selectedCount", {
                  count: interests.length,
                  total: INTEREST_KEYS.length,
                })}
          </p>
        </Demo>

        <Demo label={t("forms.switches")} note={t("forms.switchesNote")}>
          <div className="flex flex-col gap-3">
            <SwitchRow
              id="ds-switch-seen"
              defaultChecked
              label={t("forms.demo.readReceipts")}
              description={t("forms.demo.readReceiptsDesc")}
            />
            <SwitchRow
              id="ds-switch-push"
              label={t("forms.demo.push")}
              description={t("forms.demo.pushDesc")}
            />
            <Row className="gap-4 pt-1">
              <label htmlFor="ds-switch-bare" className="text-sm text-text">
                Switch
              </label>
              <Switch id="ds-switch-bare" defaultChecked />
              <span className="ml-4 inline-flex items-center gap-2">
                <Checkbox id="ds-check-bare" defaultChecked />
                <label htmlFor="ds-check-bare" className="text-sm text-text">
                  Checkbox
                </label>
              </span>
            </Row>
          </div>
        </Demo>
      </Section>

      <Section id="tabs" title={t("sections.tabs")} intro={t("tabs.intro")}>
        <Demo label={t("tabs.pills")} note={t("tabs.pillsNote")}>
          <Tabs defaultValue="forYou">
            <TabsList>
              <TabsTrigger value="forYou">{t("tabs.feed.forYou")}</TabsTrigger>
              <TabsTrigger value="generation">{t("tabs.feed.generation")}</TabsTrigger>
              <TabsTrigger value="faculty">{t("tabs.feed.faculty")}</TabsTrigger>
              <TabsTrigger value="following">{t("tabs.feed.following")}</TabsTrigger>
            </TabsList>
            <TabsContent value="forYou">
              <p className="text-sm text-text-muted">{t("tabs.feed.forYouBody")}</p>
            </TabsContent>
            <TabsContent value="generation">
              <p className="text-sm text-text-muted">{t("tabs.feed.generationBody")}</p>
            </TabsContent>
            <TabsContent value="faculty">
              <p className="text-sm text-text-muted">{t("tabs.feed.facultyBody")}</p>
            </TabsContent>
            <TabsContent value="following">
              <p className="text-sm text-text-muted">{t("tabs.feed.followingBody")}</p>
            </TabsContent>
          </Tabs>
        </Demo>

        <Demo label={t("tabs.underline")} note={t("tabs.underlineNote")}>
          <Tabs defaultValue="materials">
            <TabsList variant="underline">
              <TabsTrigger value="materials">
                <BookOpen />
                {t("tabs.course.materials")}
              </TabsTrigger>
              <TabsTrigger value="questions">{t("tabs.course.questions")}</TabsTrigger>
              <TabsTrigger value="exams">{t("tabs.course.exams")}</TabsTrigger>
              <TabsTrigger value="people">{t("tabs.course.people")}</TabsTrigger>
            </TabsList>
            <TabsContent value="materials">
              <p className="text-sm text-text-muted">{t("tabs.course.materialsBody")}</p>
            </TabsContent>
            <TabsContent value="questions">
              <p className="text-sm text-text-muted">{t("tabs.course.questionsBody")}</p>
            </TabsContent>
            <TabsContent value="exams">
              <p className="text-sm text-text-muted">{t("tabs.course.examsBody")}</p>
            </TabsContent>
            <TabsContent value="people">
              <p className="text-sm text-text-muted">{t("tabs.course.peopleBody")}</p>
            </TabsContent>
          </Tabs>
        </Demo>
      </Section>
    </>
  );
}
