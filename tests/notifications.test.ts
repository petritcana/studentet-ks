import { describe, expect, it } from "vitest";
import {
  actorSummary,
  DEFAULT_CHANNELS,
  groupNotifications,
  MAX_PUSH_PER_DAY,
  NOTIFICATION_CATEGORIES,
  QUIET_HOUR,
  shouldSendPush,
} from "@/lib/notifications";

function item(id: string, groupKey: string | null, actorName?: string) {
  return { id, groupKey, actorName, createdAt: `2026-05-0${id}T10:00:00Z` };
}

describe("grupimi i njoftimeve", () => {
  it("bashkon ato me të njëjtin çelës", () => {
    const grouped = groupNotifications([
      item("1", "post:a", "Arta"),
      item("2", "post:a", "Blerimi"),
      item("3", "post:a", "Driton"),
    ]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].others).toBe(2);
  });

  it("nuk bashkon ato pa celes", () => {
    const grouped = groupNotifications([item("1", null, "Arta"), item("2", null, "Blerimi")]);
    expect(grouped).toHaveLength(2);
  });

  it("nuk i përzien çelësat e ndryshëm", () => {
    const grouped = groupNotifications([
      item("1", "post:a", "Arta"),
      item("2", "post:b", "Blerimi"),
      item("3", "post:a", "Driton"),
    ]);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].others).toBe(1);
    expect(grouped[1].others).toBe(0);
  });

  it("ruan rendin e të parit të grupit", () => {
    const grouped = groupNotifications([
      item("1", "post:a", "Arta"),
      item("2", "post:b", "Blerimi"),
      item("3", "post:a", "Driton"),
    ]);
    expect(grouped[0].id).toBe("1");
    expect(grouped[1].id).toBe("2");
  });

  it("nuk përsërit të njëjtin aktor", () => {
    const grouped = groupNotifications([
      item("1", "post:a", "Arta"),
      item("2", "post:a", "Arta"),
    ]);
    expect(grouped[0].actors).toEqual(["Arta"]);
  });

  it("një listë bosh jep një listë bosh", () => {
    expect(groupNotifications([])).toEqual([]);
  });
});

describe("përmbledhja e aktorëve", () => {
  it("një person", () => {
    expect(actorSummary(["Arta"])).toEqual({ key: "one", values: { name: "Arta" } });
  });

  it("dy persona", () => {
    const summary = actorSummary(["Arta", "Blerimi"]);
    expect(summary.key).toBe("two");
  });

  it("shumë persona numërojnë të tjerët", () => {
    const summary = actorSummary(["Arta", "Blerimi", "Driton", "Erza", "Fisnik"]);
    expect(summary.key).toBe("many");
    expect(summary.values.count).toBe(3);
  });
});

describe("kufiri i push-it", () => {
  it("dy në ditë, jo më shumë", () => {
    expect(shouldSendPush({ enabled: true, sentToday: 0, hour: 10 }).send).toBe(true);
    expect(shouldSendPush({ enabled: true, sentToday: MAX_PUSH_PER_DAY, hour: 10 }).send).toBe(false);
  });

  it("i fikur do të thotë asnjë", () => {
    const decision = shouldSendPush({ enabled: false, sentToday: 0, hour: 10 });
    expect(decision.send).toBe(false);
    expect(decision.reason).toBe("disabled");
  });

  it("asnjë push pas orës së qetësisë", () => {
    const decision = shouldSendPush({ enabled: true, sentToday: 0, hour: QUIET_HOUR });
    expect(decision.send).toBe(false);
    expect(decision.reason).toBe("quiet_hours");
  });

  it("as herët në mëngjes", () => {
    expect(shouldSendPush({ enabled: true, sentToday: 0, hour: 6 }).send).toBe(false);
  });

  it("brenda ditës punon", () => {
    expect(shouldSendPush({ enabled: true, sentToday: 1, hour: 15 }).send).toBe(true);
  });
});

describe("parazgjedhjet", () => {
  it("brenda aplikacionit po, push jo", () => {
    expect(DEFAULT_CHANNELS.inApp).toBe(true);
    expect(DEFAULT_CHANNELS.push).toBe(false);
  });

  it("kategoritë janë nëntë, me garën", () => {
    expect(NOTIFICATION_CATEGORIES).toHaveLength(9);
    expect(NOTIFICATION_CATEGORIES).toContain("competition");
  });
});
