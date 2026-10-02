import { describe, expect, it } from "vitest";
import { applyStudentDiscount, buildReference } from "@/lib/billing/types";

describe("zbritja studentore", () => {
  it("heq saktësisht 20 për qind", () => {
    expect(applyStudentDiscount(299, 20)).toBe(239);
    expect(applyStudentDiscount(999, 20)).toBe(799);
    expect(applyStudentDiscount(1799, 20)).toBe(1439);
  });

  it("nuk e ndryshon çmimin kur zbritja është zero", () => {
    expect(applyStudentDiscount(299, 0)).toBe(299);
  });

  it("nuk del kurrë negative", () => {
    expect(applyStudentDiscount(100, 100)).toBe(0);
  });
});

describe("kodi i referencës", () => {
  it("nis me prefiksin e platformës dhe përmban planin", () => {
    const reference = buildReference("clzabc123def", "monthly");
    expect(reference.startsWith("SKS-MONTHLY-")).toBe(true);
  });

  it("prodhon kode të ndryshme për të njëjtin përdorues", async () => {
    const first = buildReference("clzabc123def", "yearly");
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = buildReference("clzabc123def", "yearly");
    expect(first).not.toBe(second);
  });
});
