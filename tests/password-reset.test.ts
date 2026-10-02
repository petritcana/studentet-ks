import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));

const { makeResetPass, readResetPass, RESET_PASS_MINUTES } = await import("@/lib/password-reset");

describe("leja pas Google-it për password-in e ri", () => {
  it("vlen vetëm për llogarinë për të cilën u lëshua", () => {
    const pass = makeResetPass("user-a");
    expect(readResetPass(pass, "user-a")).toBe(true);
    expect(readResetPass(pass, "user-b")).toBe(false);
  });

  it("skadon pas dhjetë minutave", () => {
    const now = Date.now();
    const pass = makeResetPass("user-a", now);
    expect(readResetPass(pass, "user-a", now + (RESET_PASS_MINUTES - 1) * 60_000)).toBe(true);
    expect(readResetPass(pass, "user-a", now + (RESET_PASS_MINUTES + 1) * 60_000)).toBe(false);
  });

  it("nuk falsifikohet: id, afati ose nënshkrimi i ndryshuar nuk kalojnë", () => {
    const pass = makeResetPass("user-a");
    const [, expiry, signature] = pass.split(".");
    expect(readResetPass(`user-b.${expiry}.${signature}`, "user-b")).toBe(false);
    expect(readResetPass(`user-a.${Number(expiry) + 999_999}.${signature}`, "user-a")).toBe(false);
    expect(readResetPass(`user-a.${expiry}.${"0".repeat(64)}`, "user-a")).toBe(false);
    expect(readResetPass(undefined, "user-a")).toBe(false);
    expect(readResetPass("rremë", "user-a")).toBe(false);
  });
});
