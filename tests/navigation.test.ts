import { describe, expect, it } from "vitest";
import {
  ACCOUNT_MENU,
  accountMenuFor,
  isActive,
  MOBILE_NAV,
  PRIMARY_NAV,
} from "@/components/layout/nav-items";

describe("shtylla e majtë", () => {
  it("ka saktësisht gjashtë zëra, me Garën në fund", () => {
    expect(PRIMARY_NAV).toHaveLength(6);
  });

  it("ka këta zëra, në këtë rend", () => {
    expect(PRIMARY_NAV.map((item) => item.href)).toEqual([
      "/feed",
      "/materialet",
      "/karriera",
      "/komuniteti",
      "/tregu",
      "/gara",
    ]);
  });

  it("nuk ka më Eksploro dhe Pyetje", () => {
    const hrefs = PRIMARY_NAV.map((item) => item.href);
    expect(hrefs).not.toContain("/eksploro");
    expect(hrefs).not.toContain("/pyetje");
  });

  it("nuk përmban as adminin as moderimin", () => {
    const hrefs = PRIMARY_NAV.map((item) => item.href);
    expect(hrefs).not.toContain("/admin");
    expect(hrefs).not.toContain("/moderimi");
  });

  it("nuk përmban mesazhet dhe njoftimet", () => {
    const hrefs = PRIMARY_NAV.map((item) => item.href);
    expect(hrefs).not.toContain("/mesazhe");
    expect(hrefs).not.toContain("/njoftimet");
  });

  it("nuk përmban orarin", () => {
    expect(PRIMARY_NAV.map((item) => item.href)).not.toContain("/orari");
  });

  it("nuk përmban asistentin", () => {
    expect(PRIMARY_NAV.map((item) => item.href)).not.toContain("/asistenti");
  });
});

describe("menyja e llogarisë sipas rolit", () => {
  it("studenti nuk sheh as moderim as admin", () => {
    const hrefs = accountMenuFor("student").map((item) => item.href);
    expect(hrefs).not.toContain("/moderimi");
    expect(hrefs).not.toContain("/admin");
  });

  it("moderatori sheh moderimin, jo adminin", () => {
    const hrefs = accountMenuFor("moderator").map((item) => item.href);
    expect(hrefs).toContain("/moderimi");
    expect(hrefs).not.toContain("/admin");
  });

  it("admini i sheh të dyja", () => {
    const hrefs = accountMenuFor("admin").map((item) => item.href);
    expect(hrefs).toContain("/moderimi");
    expect(hrefs).toContain("/admin");
  });

  it("kompania trajtohet si student për menynë", () => {
    const hrefs = accountMenuFor("company").map((item) => item.href);
    expect(hrefs).not.toContain("/admin");
  });

  it("çdo zë i menysë ka ikonë dhe çelës përkthimi", () => {
    for (const item of ACCOUNT_MENU) {
      expect(item.icon).toBeTruthy();
      expect(item.key.length).toBeGreaterThan(0);
    }
  });
});

describe("navigimi në celular", () => {
  it("ka katër lidhje, i pesti është kompozuesi", () => {
    expect(MOBILE_NAV).toHaveLength(4);
  });

  it("i ka mesazhet, të cilat në desktop rrinë te shiriti i sipërm", () => {
    expect(MOBILE_NAV.map((item) => item.href)).toContain("/mesazhe");
  });
});

describe("shënimi i faqes aktive", () => {
  it("përputh rrugën e saktë", () => {
    expect(isActive("/feed", { match: ["/feed"] })).toBe(true);
  });

  it("përputh nënrrugët", () => {
    expect(isActive("/materialet/abc", { match: ["/materialet"] })).toBe(true);
  });

  it("nuk përputh një rrugë që vetëm nis njësoj", () => {
    expect(isActive("/materialetX", { match: ["/materialet"] })).toBe(false);
  });

  it("materialet nuk e ndezin Komunitetin", () => {
    const community = PRIMARY_NAV.find((item) => item.href === "/komuniteti")!;
    expect(isActive("/materialet", community)).toBe(false);
  });

  it("profili i dikujt e ndez Komunitetin", () => {
    const community = PRIMARY_NAV.find((item) => item.href === "/komuniteti")!;
    expect(isActive("/u/erza", community)).toBe(true);
  });
});
