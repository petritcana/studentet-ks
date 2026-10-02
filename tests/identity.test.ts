import { describe, expect, it } from "vitest";
import { isDisposableEmail, looksLikeStudentId, validateFullName } from "@/lib/identity";

describe("emri i plotë", () => {
  it("pranon emra shqiptarë me theks", () => {
    for (const name of ["Erza Krasniqi", "Blerim Çela", "Rrezarta Gërvalla", "Dritë Hoxhaj"]) {
      expect(validateFullName(name).ok, name).toBe(true);
    }
  });

  it("pranon emra me vizë, apostrof dhe mbiemër të dyfishtë", () => {
    for (const name of ["Ana-Maria Berisha", "Ardit O’Brien", "Leart Gashi Krasniqi"]) {
      expect(validateFullName(name).ok, name).toBe(true);
    }
  });

  it("e ndan emrin nga mbiemri", () => {
    const verdict = validateFullName("  Erza   Krasniqi  ");
    expect(verdict.ok && verdict.firstName).toBe("Erza");
    expect(verdict.ok && verdict.lastName).toBe("Krasniqi");
  });

  it("kërkon mbiemrin", () => {
    const verdict = validateFullName("Erza");
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toBe("errorNameFull");
  });

  it("nuk pranon numra, lidhje dhe shenja", () => {
    expect(validateFullName("Erza 123").ok).toBe(false);
    expect(validateFullName("Erza www.faqe.com").ok).toBe(false);
    expect(validateFullName("Erza @krasniqi").ok).toBe(false);
    expect(validateFullName("asd !!!").ok).toBe(false);
  });

  it("nuk pranon shkurtesa me një shkronjë", () => {
    expect(validateFullName("A. Krasniqi").ok).toBe(false);
  });
});

describe("emaili", () => {
  it("i njeh adresat njëpërdorimshe", () => {
    for (const email of ["a@mailinator.com", "b@yopmail.com", "c@sub.tempmail.com"]) {
      expect(isDisposableEmail(email), email).toBe(true);
    }
  });

  it("i lë të kalojnë adresat e zakonshme", () => {
    for (const email of ["erza@gmail.com", "erza.krasniqi@student.uni-pr.edu", "a@outlook.com"]) {
      expect(isDisposableEmail(email), email).toBe(false);
    }
  });

  it("e njeh adresën me numër indeksi", () => {
    expect(looksLikeStudentId("pc12345@student.uni-pr.edu")).toBe(true);
    expect(looksLikeStudentId("20231234@umib.net")).toBe(true);
    expect(looksLikeStudentId("erza.krasniqi@student.uni-pr.edu")).toBe(false);
  });
});
