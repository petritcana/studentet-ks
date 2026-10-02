import { describe, expect, it } from "vitest";
import { defaultAvatarFor, isDefaultAvatar, isGender } from "@/lib/default-avatar";
import { shortName } from "@/lib/short-name";

describe("avatari i parazgjedhur", () => {
  it("djalë për djemtë, vajzë për vajzat, neutral kur nuk është thënë", () => {
    expect(defaultAvatarFor("male")).toBe("/avatars/djale.svg");
    expect(defaultAvatarFor("female")).toBe("/avatars/vajze.svg");
    expect(defaultAvatarFor(null)).toBe("/avatars/neutral.svg");
    expect(defaultAvatarFor("tjetër")).toBe("/avatars/neutral.svg");
  });

  it("është i njëjtë për të gjithë brenda gjinisë, pa varësi nga emri", () => {
    expect(defaultAvatarFor("female")).toBe(defaultAvatarFor("female"));
  });

  it("dallon foton e vërtetë nga avatari i parazgjedhur", () => {
    expect(isDefaultAvatar("/avatars/djale.svg")).toBe(true);
    expect(isDefaultAvatar(null)).toBe(true);
    expect(isDefaultAvatar("/api/media/abc")).toBe(false);
  });

  it("pranon vetëm vlerat e njohura të gjinisë", () => {
    expect(isGender("male")).toBe(true);
    expect(isGender("female")).toBe(true);
    expect(isGender("")).toBe(false);
    expect(isGender(null)).toBe(false);
  });
});

describe("emri i shkurtër i storjes", () => {
  it("emri i parë për studentët", () => {
    expect(shortName("Learta Krasniqi")).toBe("Learta");
  });

  it("titulli dhe mbiemri për profesorët", () => {
    expect(shortName("Prof. Dr. Teuta Berisha")).toBe("Prof. Berisha");
    expect(shortName("Ass. Blerta Gashi")).toBe("Ass. Gashi");
  });
});
