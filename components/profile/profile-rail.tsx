import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PersonCard } from "@/components/social/person-card";
import { getSuggestedPeople } from "@/lib/suggestions";
import type { getProfile } from "@/lib/queries/profile";

type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;

export async function ProfileRail({ profile, isMe }: { profile: Profile; isMe: boolean }) {
  const t = await getTranslations("profile");
  const { header } = profile;

  const suggestions = await getSuggestedPeople(header.id, 3);

  return (
    <>
      <Card className="flex flex-col gap-3 p-4">
        <h2 className="text-sm font-semibold text-text">{t("basicInfo")}</h2>

        <dl className="flex flex-col gap-2.5">
          {header.universityAbbr ? (
            <Fact label={t("university")} value={header.universityAbbr} />
          ) : null}
          {header.facultyLabel ? <Fact label={t("faculty")} value={header.facultyLabel} /> : null}
          {header.year ? (
            <Fact label={t("academicYear")} value={t("yearLabel", { year: header.year })} />
          ) : null}
        </dl>
      </Card>

      {suggestions.length > 0 ? (
        <Card className="flex flex-col gap-2 p-4">
          <h2 className="text-sm font-semibold text-text">
            {isMe ? t("peopleYouMayKnow") : t("similarPeople")}
          </h2>
          <div className="flex flex-col gap-2">
            {suggestions.map((person) => (
              <PersonCard key={person.id} person={person} compact />
            ))}
          </div>
        </Card>
      ) : null}
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="text-sm text-text">{value}</dd>
    </div>
  );
}
