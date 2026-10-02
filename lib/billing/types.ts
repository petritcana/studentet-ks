/** Ndërfaqja e pagesave. */

export type ProviderCode = "paddle" | "localbank" | "transfer" | "voucher" | "xp" | "mock";

export type CheckoutInput = {
  userId: string;
  planCode: string;
  amountCents: number;
  currency: string;
  hasStudentDiscount: boolean;
  locale: string;
};

export type CheckoutResult =
  | { kind: "redirect"; url: string; paymentId: string }
  | { kind: "instructions"; paymentId: string; reference: string; instructionsKey: string }
  | { kind: "settled"; paymentId: string; days: number }
  | { kind: "error"; messageKey: string };

export type VerifyInput = {
  paymentId: string;
  externalId?: string;
  /** Nënshkrimi i webhook-ut, aty ku ofruesi e dërgon. */
  signature?: string;
  payload?: unknown;
};

export type VerifyResult = { ok: boolean; days: number; messageKey?: string };

export interface PaymentProvider {
  readonly code: ProviderCode;
  /** A është i konfiguruar në këtë mjedis. Ofruesit pa çelësa nuk shfaqen. */
  isAvailable(): boolean;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verify(input: VerifyInput): Promise<VerifyResult>;
}

/** Kodi i referencës që studenti e shkruan te përshkrimi i transfertës. */
export function buildReference(userId: string, planCode: string) {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const tail = userId.slice(-4).toUpperCase();
  return `SKS-${planCode.toUpperCase()}-${tail}${stamp}`;
}

/** Çmimi pas zbritjes studentore, gjithmonë i rrumbullakosur poshtë te centi. */
export function applyStudentDiscount(amountCents: number, discountPercent: number) {
  return Math.floor((amountCents * (100 - discountPercent)) / 100);
}
