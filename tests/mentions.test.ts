import { describe, expect, it } from "vitest";
import { extractHashtags, extractMentions, mentionAtCaret, tokenize } from "@/lib/mentions";

describe("përmendjet dhe hashtag-ët", () => {
  it("gjen username-at, pa pikë në fund dhe pa email", () => {
    expect(extractMentions("Faleminderit @erza.krasniqi dhe @dea.morina.")).toEqual(["erza.krasniqi", "dea.morina"]);
    expect(extractMentions("Shkruaj te petrit@gmail.com")).toEqual([]);
    expect(extractMentions("@Erza.Krasniqi @erza.krasniqi")).toEqual(["erza.krasniqi"]);
  });

  it("hashtag-ët me shkronja shqipe, pa numra të thjeshtë", () => {
    expect(extractHashtags("Nesër #provimi te #Fizikë, dhe #2024")).toEqual(["provimi", "fizikë"]);
    expect(extractHashtags("ngjyra &#123; nuk është temë")).toEqual([]);
  });

  it("e ndan tekstin në copa me rendin e vet", () => {
    const tokens = tokenize("Hej @dea.morina, shiko #shenimet!");
    expect(tokens.map((token) => token.kind)).toEqual(["text", "mention", "text", "hashtag", "text"]);
    expect(tokens[1]).toMatchObject({ value: "@dea.morina", username: "dea.morina" });
    expect(tokens[3]).toMatchObject({ value: "#shenimet", tag: "shenimet" });
    expect(tokens.map((token) => token.value).join("")).toBe("Hej @dea.morina, shiko #shenimet!");
  });

  it("gjen fjalën @ te kursori për sugjerimet", () => {
    expect(mentionAtCaret("Takohemi me @er", 15)).toEqual({ start: 12, query: "er" });
    expect(mentionAtCaret("email@er", 8)).toBeNull();
    expect(mentionAtCaret("@", 1)).toEqual({ start: 0, query: "" });
  });
});
