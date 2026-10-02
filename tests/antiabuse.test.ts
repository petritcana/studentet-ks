import { describe, expect, it } from "vitest";
import {
  canTransferXp,
  IP_CLUSTER_THRESHOLD,
  isDuplicateText,
  isSelfVote,
  NEW_ACCOUNT_DAYS,
  normaliseForDuplicate,
  RECIPROCAL_THRESHOLD,
  shouldCountVote,
  type VoteSignal,
} from "@/lib/antiabuse";

function signal(overrides: Partial<VoteSignal> = {}): VoteSignal {
  return {
    voterId: "voter",
    targetId: "target",
    voterAccountAgeDays: 30,
    voterIp: "1.2.3.4",
    ...overrides,
  };
}

describe("vetëvotimi", () => {
  it("njihet", () => {
    expect(isSelfVote(signal({ voterId: "same", targetId: "same" }))).toBe(true);
  });

  it("bllokohet", () => {
    const verdict = shouldCountVote(signal({ voterId: "same", targetId: "same" }));
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe("self_vote");
  });
});

describe("llogaritë e reja", () => {
  it("një llogari nën shtatë ditë nuk paguan XP", () => {
    const verdict = shouldCountVote(signal({ voterAccountAgeDays: NEW_ACCOUNT_DAYS - 1 }));
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe("new_account");
  });

  it("pikërisht në prag numërohet", () => {
    expect(shouldCountVote(signal({ voterAccountAgeDays: NEW_ACCOUNT_DAYS })).allowed).toBe(true);
  });
});

describe("grumbullimi nga i njëjti IP", () => {
  it("bllokohet mbi pragun", () => {
    const verdict = shouldCountVote(signal(), { sameIpVoters: IP_CLUSTER_THRESHOLD });
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe("ip_cluster");
  });

  it("nën prag lejohet", () => {
    expect(shouldCountVote(signal(), { sameIpVoters: IP_CLUSTER_THRESHOLD - 1 }).allowed).toBe(true);
  });
});

describe("unazat e votimit", () => {
  it("bllokohen kur dy persona votojnë për njëri-tjetrin vazhdimisht", () => {
    const verdict = shouldCountVote(signal(), { reciprocalVotes: RECIPROCAL_THRESHOLD });
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe("voting_ring");
  });

  it("disa vota të ndërsjella janë normale", () => {
    expect(shouldCountVote(signal(), { reciprocalVotes: 2 }).allowed).toBe(true);
  });
});

describe("votat e dyfishta", () => {
  it("nuk numërohen dy herë", () => {
    const verdict = shouldCountVote(signal(), { alreadyVoted: true });
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe("duplicate");
  });
});

describe("përmbajtja e dyfishuar", () => {
  it("shkronjat e mëdha dhe hapësirat nuk e bëjnë të ri", () => {
    expect(isDuplicateText("Ligjerata 1", "  ligjerata   1 ")).toBe(true);
  });

  it("shenjat diakritike nuk e bëjnë të ri", () => {
    expect(isDuplicateText("Përmbledhje", "Permbledhje")).toBe(true);
  });

  it("një tekst vërtet i ndryshëm nuk është dublikatë", () => {
    expect(isDuplicateText("Ligjerata e pare", "Provimi i dyte")).toBe(false);
  });

  it("normalizimi heq pikësimin", () => {
    expect(normaliseForDuplicate("Hej, si je?!")).toBe("hej si je");
  });
});

describe("transferimi i XP-së", () => {
  it("nuk lejohet kurrë", () => {
    expect(canTransferXp()).toBe(false);
  });
});

describe("rasti normal", () => {
  it("një student i vërtetë voton pa pengesë", () => {
    expect(shouldCountVote(signal()).allowed).toBe(true);
  });
});
