import { describe, expect, it } from "vitest";
import {
  availableBalance,
  canRequestPayout,
  DEFAULT_INSTRUCTOR_SHARE,
  PAYOUT_MINIMUM_CENTS,
  reverseSplit,
  splitSale,
  withinRefundWindow,
} from "@/lib/billing/ledger";

describe("ndarja 70/30", () => {
  it("në një shitje prej 10 eurosh, platforma mban 3", () => {
    const split = splitSale(1000);
    expect(split.instructorCents).toBe(700);
    expect(split.platformCents).toBe(300);
  });

  it("pjesët mbledhin gjithmonë saktësisht bruton", () => {
    for (const gross of [1, 99, 100, 299, 1000, 1999, 12345, 99999]) {
      const split = splitSale(gross);
      expect(split.instructorCents + split.platformCents + split.providerCents).toBe(gross);
    }
  });

  it("rrumbullakosja i shkon platformës, jo instruktorit", () => {
    // 999 * 0.7 = 699.3, instruktori merr 699 dhe platforma 300.
    const split = splitSale(999);
    expect(split.instructorCents).toBe(699);
    expect(split.platformCents).toBe(300);
  });

  it("përdor ndarjen e parazgjedhur nga konfigurimi", () => {
    expect(DEFAULT_INSTRUCTOR_SHARE).toBeGreaterThan(0);
    expect(DEFAULT_INSTRUCTOR_SHARE).toBeLessThanOrEqual(1);
  });

  it("pranon një ndarje të veçantë për fushata", () => {
    const split = splitSale(1000, { instructorShare: 0.9 });
    expect(split.instructorCents).toBe(900);
    expect(split.platformCents).toBe(100);
  });
});

describe("tarifa e ofruesit", () => {
  it("hiqet nga bruto para ndarjes", () => {
    const split = splitSale(1000, { providerCents: 50 });
    expect(split.providerCents).toBe(50);
    expect(split.instructorCents).toBe(Math.floor(950 * DEFAULT_INSTRUCTOR_SHARE));
    expect(split.instructorCents + split.platformCents).toBe(950);
  });

  it("nuk e çon kurrë shumën nën zero", () => {
    const split = splitSale(100, { providerCents: 500 });
    expect(split.instructorCents).toBe(0);
    expect(split.platformCents).toBe(0);
  });
});

describe("rastet kufitare", () => {
  it("një kurs falas nuk prodhon asgjë", () => {
    const split = splitSale(0);
    expect(split.grossCents).toBe(0);
    expect(split.instructorCents).toBe(0);
    expect(split.platformCents).toBe(0);
  });

  it("një shumë negative trajtohet si zero", () => {
    expect(splitSale(-500).grossCents).toBe(0);
  });

  it("centët thyesë rrumbullakosen para ndarjes", () => {
    expect(splitSale(199.6).grossCents).toBe(200);
  });
});

describe("kthimi i parave", () => {
  it("e kthen mbrapsht te njejten ndarje", () => {
    const sale = splitSale(1000);
    const refund = reverseSplit(sale);
    expect(refund.instructorCents).toBe(-sale.instructorCents);
    expect(refund.platformCents).toBe(-sale.platformCents);
  });

  it("shitja plus kthimi bëjnë zero", () => {
    const sale = splitSale(2499);
    const refund = reverseSplit(sale);
    expect(sale.instructorCents + refund.instructorCents).toBe(0);
    expect(sale.platformCents + refund.platformCents).toBe(0);
  });

  it("dritarja e kthimit është e hapur menjëherë pas blerjes", () => {
    expect(withinRefundWindow(new Date())).toBe(true);
  });

  it("dritarja mbyllet pas afatit", () => {
    const old = new Date(Date.now() - 60 * 86_400_000);
    expect(withinRefundWindow(old)).toBe(false);
  });
});

describe("bilanci dhe tërheqja", () => {
  it("mbledh shitjet dhe zbret tërheqjet", () => {
    const balance = availableBalance([
      { kind: "sale", instructorCents: 700 },
      { kind: "sale", instructorCents: 700 },
      { kind: "payout", instructorCents: 500 },
    ]);
    expect(balance).toBe(900);
  });

  it("një kthim parash e ul bilancin", () => {
    const balance = availableBalance([
      { kind: "sale", instructorCents: 700 },
      { kind: "refund", instructorCents: -700 },
    ]);
    expect(balance).toBe(0);
  });

  it("tërheqja nuk lejohet nën prag", () => {
    expect(canRequestPayout(PAYOUT_MINIMUM_CENTS - 1)).toBe(false);
    expect(canRequestPayout(PAYOUT_MINIMUM_CENTS)).toBe(true);
  });

  it("një libër bosh jep zero", () => {
    expect(availableBalance([])).toBe(0);
  });
});
