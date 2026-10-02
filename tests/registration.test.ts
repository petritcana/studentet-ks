import { describe, expect, it } from "vitest";
import { ageOn, checkBirthDate, parseBirthDate } from "@/lib/age";
import { can, type Actor } from "@/lib/permissions";
import { isStudentEmail, studentDomainFor, upcomingInstitutionFor } from "@/lib/student-domains";

const NOW = new Date(Date.UTC(2026, 9, 1));

describe("data e lindjes", () => {
  it("lexon vetëm data kalendarike të vërteta", () => {
    expect(parseBirthDate("2007-02-30")).toBeNull();
    expect(parseBirthDate("2007-2-3")).toBeNull();
    expect(parseBirthDate("2006-10-01")?.toISOString()).toBe("2006-10-01T00:00:00.000Z");
  });

  it("mosha rritet vetëm në ditëlindje", () => {
    expect(ageOn(new Date(Date.UTC(2010, 9, 1)), NOW)).toBe(16);
    expect(ageOn(new Date(Date.UTC(2010, 9, 2)), NOW)).toBe(15);
  });

  it("pranon nga 16 vjeç, refuzon më të rinjtë dhe datat e pamundura", () => {
    expect(checkBirthDate("2010-10-01", NOW).ok).toBe(true);
    expect(checkBirthDate("2010-10-02", NOW)).toEqual({ ok: false, reason: "errorBirthYoung" });
    expect(checkBirthDate("2030-01-01", NOW)).toEqual({ ok: false, reason: "errorBirthInvalid" });
    expect(checkBirthDate("1900-01-01", NOW)).toEqual({ ok: false, reason: "errorBirthInvalid" });
    expect(checkBirthDate("", NOW)).toEqual({ ok: false, reason: "errorBirthInvalid" });
  });
});

describe("emailet studentore", () => {
  it("njeh domenet studentore dhe institucionin e tyre", () => {
    expect(studentDomainFor("Erza.Krasniqi@Student.Uni-Pr.edu")?.institution).toBe("up");
    expect(studentDomainFor("ek12345@ubt-uni.net")?.institution).toBe("ubt");
    expect(studentDomainFor("ek@universitetiaab.com")?.institution).toBe("aab");
    expect(studentDomainFor("ek@auk.org")?.institution).toBe("rit");
    expect(studentDomainFor("123@uni-gjk.org")?.institution).toBe("fehmi-agani");
  });

  it("nuk pranon stafin, Gmail-in dhe domenet që vetëm i ngjajnë", () => {
    expect(isStudentEmail("profesor@uni-pr.edu")).toBe(false);
    expect(isStudentEmail("erza@gmail.com")).toBe(false);
    expect(isStudentEmail("erza@notubt-uni.net")).toBe(false);
    expect(isStudentEmail("erza@student.uni-pr.edu.evil.com")).toBe(false);
  });

  it("institucionet ende jashtë katalogut kanë emër, jo «domen i panjohur»", () => {
    expect(isStudentEmail("a@universum-ks.org")).toBe(false);
    expect(upcomingInstitutionFor("a@365.riinvest.net")?.name).toBe("Kolegji Riinvest");
  });
});

describe("llogaria në shqyrtim vetëm shikon", () => {
  const base: Actor = { id: "u", role: "student", universityId: null, facultyId: null, verification: "pending", accountAgeDays: 0 };

  it("nuk poston, nuk komenton, nuk shkruan, nuk ngarkon", () => {
    const watching = { ...base, awaitingReview: true };
    for (const action of ["participate", "post", "comment", "message", "upload", "create_group"] as const) {
      expect(can(watching, action)).toEqual({ allowed: false, reason: "review" });
    }
  });

  it("pas miratimit gjithçka hapet", () => {
    const approved = { ...base, verification: "verified" as const, awaitingReview: false };
    expect(can(approved, "participate").allowed).toBe(true);
    expect(can(approved, "post").allowed).toBe(true);
  });

  it("llogaritë e vjetra, pa shqyrtim, nuk preken", () => {
    expect(can({ ...base, verification: "unverified" }, "post").allowed).toBe(true);
  });
});
