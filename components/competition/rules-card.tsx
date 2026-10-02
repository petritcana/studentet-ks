import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { DAILY_CAPS, DAILY_POINT_CAP, POINTS, USEFUL_POST_SAVES } from "@/lib/competition/rules";

/** «Si fitohen pikët»: numrat vijnë nga rregullat e kodit, jo të shkruar me dorë. */
export async function RulesCard() {
  const t = await getTranslations("competition");
  const rules = [
    t("ruleBattle", { points: POINTS.battle_complete, cap: DAILY_CAPS.battle_complete }),
    t("ruleWin", { points: POINTS.battle_win, cap: DAILY_CAPS.battle_win }),
    t("ruleDaily", { points: POINTS.daily_quiz }),
    t("ruleEvent", { points: POINTS.event_quiz }),
    t("ruleMaterial", { points: POINTS.material_approved }),
    t("ruleAnswer", { points: POINTS.answer_accepted }),
    t("rulePost", { points: POINTS.post_useful, saves: USEFUL_POST_SAVES }),
    t("ruleCap", { cap: DAILY_POINT_CAP }),
  ];

  return (
    <Card className="flex flex-col gap-3 p-5" id="rregullat">
      <h2 className="text-sm font-semibold text-text">{t("rulesTitle")}</h2>
      <p className="text-xs text-text-muted">{t("rulesIntro")}</p>
      <ul className="flex flex-col gap-1.5 text-sm text-text">
        {rules.map((rule) => (
          <li key={rule} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
            <span>{rule}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-text-muted">{t("ruleVerified")}</p>
      <p className="text-xs text-text-muted">{t("ruleRevoked")}</p>
    </Card>
  );
}
