import { describe, expect, it } from "vitest";
import { formatMoney, formatNumber, timeAgo } from "@/lib/format";

/** Kujtese pse ekziston ky skedar. */
describe("formatNumber", () => {
  it("ndan mijëshet me pikë në shqip", () => {
    expect(formatNumber(1120, "sq")).toBe("1.120");
    expect(formatNumber(1234567, "sq")).toBe("1.234.567");
  });

  it("ndan mijëshet me presje në anglisht", () => {
    expect(formatNumber(1120, "en")).toBe("1,120");
    expect(formatNumber(1234567, "en")).toBe("1,234,567");
  });

  it("nuk prek numrat nën një mijë", () => {
    expect(formatNumber(0, "sq")).toBe("0");
    expect(formatNumber(999, "sq")).toBe("999");
  });

  it("e ruan shenjën negative", () => {
    expect(formatNumber(-420, "sq")).toBe("-420");
    expect(formatNumber(-12345, "en")).toBe("-12,345");
  });

  it("përdor presje për dhjetoret në shqip dhe pikë në anglisht", () => {
    expect(formatNumber(3.5, "sq")).toBe("3,5");
    expect(formatNumber(3.5, "en")).toBe("3.5");
  });

  it("jep të njëjtin rezultat sa herë të thirret", () => {
    expect(formatNumber(1234567, "sq")).toBe(formatNumber(1234567, "sq"));
  });
});

describe("formatMoney", () => {
  it("e vendos euron pas shumës në shqip", () => {
    expect(formatMoney(299, "EUR", "sq")).toBe("2,99 €");
    expect(formatMoney(179900, "EUR", "sq")).toBe("1.799,00 €");
  });

  it("e vendos shenjën para shumës në anglisht", () => {
    expect(formatMoney(299, "EUR", "en")).toBe("€2.99");
    expect(formatMoney(179900, "EUR", "en")).toBe("€1,799.00");
  });

  it("i shton gjithmonë dy dhjetore", () => {
    expect(formatMoney(1000, "EUR", "sq")).toBe("10,00 €");
  });
});

describe("timeAgo", () => {
  it("thotë tani për momentin", () => {
    expect(timeAgo(new Date(), "sq")).toBe("tani");
    expect(timeAgo(new Date(), "en")).toBe("now");
  });

  it("numëron minutat dhe orët", () => {
    expect(timeAgo(new Date(Date.now() - 12 * 60_000), "sq")).toBe("12 min");
    expect(timeAgo(new Date(Date.now() - 3 * 3_600_000), "sq")).toBe("3 orë");
    expect(timeAgo(new Date(Date.now() - 3 * 3_600_000), "en")).toBe("3 h");
  });

  it("kalon te data e shkurtër pas një jave", () => {
    const old = new Date("2026-03-14T10:00:00Z");
    expect(timeAgo(old, "sq")).toMatch(/\d+ mar/);
  });
});

describe("data dhe ora në orën e Kosovës", () => {
  it("nuk varen nga zona kohore e makinës", async () => {
    const { formatTime, formatDate } = await import("@/lib/format");
    // 16:30 UTC në shtator është 18:30 në Prishtinë, kudo që të punojë serveri.
    expect(formatTime("2026-09-23T16:30:00Z")).toBe("18:30");
    expect(formatDate("2026-09-23T22:30:00Z", "en")).toBe("24 September 2026");
  });
});
