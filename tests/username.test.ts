import { describe, expect, it } from "vitest";
import {
  foldName,
  looksLikeUsername,
  normalizeUsername,
  usernameBase,
  usernameBaseFromFullName,
  usernameVariant,
} from "@/lib/username";

describe("emri i përdoruesit", () => {
  it("bëhet emri.mbiemri", () => {
    expect(usernameBase("Petrit", "Cana")).toBe("petrit.cana");
    expect(usernameBase("Arta", "Krasniqi")).toBe("arta.krasniqi");
  });

  it("i kthen shkronjat shqipe, nuk i heq", () => {
    expect(usernameBase("Blerim", "Këlmendi")).toBe("blerim.kelmendi");
    expect(usernameBase("Çlirim", "Berisha")).toBe("clirim.berisha");
    expect(foldName("Gjakovë")).toBe("gjakove");
  });

  it("pastron apostrofa, hapësira dhe viza", () => {
    expect(usernameBase("Anne-Marie", "O'Brien")).toBe("anne.marie.obrien");
    expect(usernameBase("  Dea  ", " Morina ")).toBe("dea.morina");
  });

  it("nuk lë pikë në fillim as në fund", () => {
    expect(usernameBase("...Petrit", "Cana...")).toBe("petrit.cana");
  });

  it("bie te emaili vetëm kur emri s'jep gjë të përdorshme", () => {
    expect(usernameBase("", "", "petrit.cana@student.uni-pr.edu")).toBe("petrit.cana");
  });

  it("e ndan emrin e plotë te emri dhe mbiemri i fundit", () => {
    expect(usernameBaseFromFullName("Petrit Cana")).toBe("petrit.cana");
    expect(usernameBaseFromFullName("Arta Blerta Krasniqi")).toBe("arta.krasniqi");
  });

  it("numëron nga një kur emri është zënë", () => {
    expect(usernameVariant("petrit.cana", 0)).toBe("petrit.cana");
    expect(usernameVariant("petrit.cana", 1)).toBe("petrit.cana1");
    expect(usernameVariant("petrit.cana", 2)).toBe("petrit.cana2");
    expect(usernameVariant("petrit.cana", 3)).toBe("petrit.cana3");
  });

  it("nuk e kalon gjatësinë maksimale kur shton numrin", () => {
    const long = "a".repeat(30);
    expect(usernameVariant(long, 12)).toHaveLength(30);
  });

  it("krahason pa dallim shkronjash të mëdha", () => {
    expect(normalizeUsername("Petrit.Cana")).toBe("petrit.cana");
    expect(normalizeUsername("PETRIT.CANA")).toBe(normalizeUsername("petrit.cana"));
  });

  it("e dallon emrin e përdoruesit nga emaili te hyrja", () => {
    expect(looksLikeUsername("petrit.cana")).toBe(true);
    expect(looksLikeUsername("petrit.cana@student.uni-pr.edu")).toBe(false);
  });
});
