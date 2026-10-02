import { describe, expect, it } from "vitest";

/**
 * Dritarja e historikut.
 *
 * Kjo provë mbron rregullin, jo zbatimin: modeli duhet të marrë atë që u tha
 * pak më parë, jo hapjen e bisedës. Me rendin e gabuar, pyetja e dhjetë e sheh
 * ende të parën dhe biseda duket sikur nuk mban mend asgjë.
 */
function lastTurns<T>(all: T[], take: number): T[] {
  // I njëjti veprim si te `prepareAsk`: merr nga fundi, kthe në rend.
  return [...all].slice(-take);
}

describe("historiku i bisedës me asistentin", () => {
  const thread = Array.from({ length: 14 }, (_, index) => `mesazhi ${index + 1}`);

  it("merr dhjetë të fundit, jo dhjetë të parët", () => {
    const window = lastTurns(thread, 10);
    expect(window).toHaveLength(10);
    expect(window[0]).toBe("mesazhi 5");
    expect(window.at(-1)).toBe("mesazhi 14");
  });

  it("e ruan rendin kronologjik", () => {
    const window = lastTurns(thread, 4);
    expect(window).toEqual(["mesazhi 11", "mesazhi 12", "mesazhi 13", "mesazhi 14"]);
  });

  it("një bisedë e shkurtër vjen e tëra", () => {
    expect(lastTurns(["një", "dy"], 10)).toEqual(["një", "dy"]);
  });
});
