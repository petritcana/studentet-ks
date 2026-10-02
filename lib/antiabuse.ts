/** Sa llogari nga i njejti IP i bejne votat te dyshimta. */
export const IP_CLUSTER_THRESHOLD = 3;
/** Sa e re duhet te jete një llogari për ta quajtur te pabesueshme. */
export const NEW_ACCOUNT_DAYS = 7;
/** Sa shpesh duhet te votojne dy persona për njëri tjetrin për te qene unaze. */
export const RECIPROCAL_THRESHOLD = 5;

export type VoteSignal = {
  voterId: string;
  targetId: string;
  voterAccountAgeDays: number;
  voterIp?: string | null;
};

export type AbuseVerdict = {
  allowed: boolean;
  /** Celes perkthimi, kurrë tekst i gatshem. */
  reason?: "self_vote" | "new_account" | "ip_cluster" | "voting_ring" | "duplicate";
};

const ALLOW: AbuseVerdict = { allowed: true };

/** Askush nuk voton për veten. Kontrolli i parë dhe me i thjeshte. */
export function isSelfVote(signal: VoteSignal) {
  return signal.voterId === signal.targetId;
}

/**
 * A duhet numeruar kjo vote.
 *
 * Një llogari e re ende voton, por vota e saj nuk paguan XP: kështu një ferme
 * llogarish te reja nuk prodhon dot asgjë, ndersa një student i vërtetë nuk
 * ndihet i bllokuar.
 */
export function shouldCountVote(
  signal: VoteSignal,
  context: {
    /** Sa llogari te tjera votuan nga i njejti IP për te njejtin objekt. */
    sameIpVoters?: number;
    /** Sa here ka votuar targeti për votuesin. */
    reciprocalVotes?: number;
    /** A ka votuar tashmë ky person për këtë objekt. */
    alreadyVoted?: boolean;
  } = {},
): AbuseVerdict {
  if (isSelfVote(signal)) return { allowed: false, reason: "self_vote" };
  if (context.alreadyVoted) return { allowed: false, reason: "duplicate" };
  if (signal.voterAccountAgeDays < NEW_ACCOUNT_DAYS) {
    return { allowed: false, reason: "new_account" };
  }
  if ((context.sameIpVoters ?? 0) >= IP_CLUSTER_THRESHOLD) {
    return { allowed: false, reason: "ip_cluster" };
  }
  if ((context.reciprocalVotes ?? 0) >= RECIPROCAL_THRESHOLD) {
    return { allowed: false, reason: "voting_ring" };
  }
  return ALLOW;
}

/**
 * Dyshimi për permbajtje te dyfishuar.
 *
 * Përdoret për postime dhe komente, ku një hash i skedarit nuk ekziston. Krahason
 * tekstin e normalizuar: hapesirat dhe shkronjat e medha nuk e bejne një postim
 * te ri.
 */
export function normaliseForDuplicate(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isDuplicateText(a: string, b: string) {
  const left = normaliseForDuplicate(a);
  const right = normaliseForDuplicate(b);
  if (left.length < 12) return left === right;
  return left === right;
}

/** XP nuk transferohet kurrë mes llogarive. Kjo e ben rregullin te dukshem. */
export function canTransferXp(): false {
  return false;
}
