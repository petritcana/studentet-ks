"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { defaultAvatarFor, isDefaultAvatar, isGender, type Gender } from "@/lib/default-avatar";
import { GenderPicker } from "./gender-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { MediaPicker } from "@/components/feed/media-picker";
import { saveBio, saveGender, saveProfileImages } from "@/lib/actions/settings";
import type { MediaRef } from "@/lib/media";

const BIO_LIMIT = 250;

export function ProfileImageEditor({
  avatar,
  cover,
  name,
  bio,
  gender,
}: {
  avatar: string | null;
  cover: string | null;
  name: string;
  bio: string | null;
  gender: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  const [avatarPick, setAvatarPick] = React.useState<MediaRef[]>([]);
  const [coverPick, setCoverPick] = React.useState<MediaRef[]>([]);
  const [text, setText] = React.useState(bio ?? "");
  const [pending, startTransition] = React.useTransition();
  const [chosenGender, setChosenGender] = React.useState<Gender | null>(isGender(gender) ? gender : null);

  // Parapamja tregon zgjedhjen e re nëse ka, ndryshe atë që është ruajtur. Pa foto,
  // avatari ndjek menjëherë gjininë e zgjedhur.
  const avatarPreview = avatarPick[0]
    ? `/api/media/${avatarPick[0].id}`
    : isDefaultAvatar(avatar)
      ? defaultAvatarFor(chosenGender)
      : avatar;

  function chooseGender(next: Gender | null) {
    const previous = chosenGender;
    setChosenGender(next);
    startTransition(async () => {
      const result = await saveGender(next);
      if (!result.ok) {
        setChosenGender(previous);
        toast.error(tc("retry"));
        return;
      }
      router.refresh();
    });
  }
  const coverPreview = coverPick[0] ? `/api/media/${coverPick[0].id}` : cover;

  function save() {
    startTransition(async () => {
      const [images, written] = await Promise.all([
        saveProfileImages({
          avatarId: avatarPick[0]?.id,
          coverId: coverPick[0]?.id,
        }),
        text.trim() === (bio ?? "").trim() ? Promise.resolve({ ok: true }) : saveBio(text),
      ]);

      if (!images.ok || !written.ok) {
        toast.error(tc("retry"));
        return;
      }

      toast.success(t("saved"));
      setAvatarPick([]);
      setCoverPick([]);
      router.refresh();
    });
  }

  function remove(field: "avatar" | "cover") {
    startTransition(async () => {
      const result = await saveProfileImages(
        field === "avatar" ? { avatarId: null } : { coverId: null },
      );
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      if (field === "avatar") setAvatarPick([]);
      else setCoverPick([]);
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-text">{t("profileImages")}</h2>

      <div className="flex flex-col gap-2">
        <Label>{t("cover")}</Label>

        <div className="relative h-24 w-full overflow-hidden rounded-md border border-border sm:h-32">
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPreview} alt="" className="size-full object-cover" />
          ) : (
            <div className="size-full bg-gradient-to-br from-brand-500/25 via-surface-2 to-surface" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MediaPicker media={coverPick} onChange={setCoverPick} max={1} />
          {cover ? (
            <Button variant="ghost" size="sm" onClick={() => remove("cover")} disabled={pending}>
              <Trash2 />
              {t("removeImage")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("avatarLabel")}</Label>

        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={name} src={avatarPreview} size="xl" />

          <div className="flex flex-wrap items-center gap-2">
            <MediaPicker media={avatarPick} onChange={setAvatarPick} max={1} />
            {!isDefaultAvatar(avatar) ? (
              <Button variant="ghost" size="sm" onClick={() => remove("avatar")} disabled={pending}>
                <Trash2 />
                {t("removeImage")}
              </Button>
            ) : null}
          </div>
        </div>

        <GenderPicker value={chosenGender} onChange={chooseGender} disabled={pending} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-bio">{t("bio")}</Label>
        <Textarea
          id="settings-bio"
          value={text}
          maxLength={BIO_LIMIT}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("bioPlaceholder")}
          className="min-h-20"
        />
        <p className="tabular text-xs text-text-muted">
          {text.length} / {BIO_LIMIT}
        </p>
      </div>

      <Button onClick={save} loading={pending} className="self-start" size="sm">
        {tc("save")}
      </Button>
    </Card>
  );
}
