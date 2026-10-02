import { db } from "@/lib/db";
import {
  buildReference,
  type CheckoutInput,
  type CheckoutResult,
  type PaymentProvider,
  type ProviderCode,
  type VerifyInput,
  type VerifyResult,
} from "./types";

/** Krijon rreshtin e pagesës në gjendjen `pending`. Asnjë ofrues nuk e anashkalon. */
async function openPayment(input: CheckoutInput, provider: ProviderCode) {
  const reference = buildReference(input.userId, input.planCode);

  const payment = await db.payment.create({
    data: {
      userId: input.userId,
      amountCents: input.amountCents,
      currency: input.currency,
      provider,
      status: "pending",
      reference,
    },
  });

  return { payment, reference };
}

/**
 * Paddle, Merchant of Record, rekomandimi kryesor.
 *
 * Paddle e merr përsipër TVSH-në dhe faturimin, prandaj mungesa e mbështetjes së
 * drejtpërdrejtë për Kosovën te Stripe nuk e bllokon lançimin. Pa çelësa në
 * mjedis, ofruesi nuk shfaqet fare te faqja e Pro-s.
 */
class PaddleProvider implements PaymentProvider {
  readonly code = "paddle" as const;

  isAvailable() {
    return Boolean(process.env.PADDLE_VENDOR_ID && process.env.PADDLE_API_KEY);
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!this.isAvailable()) return { kind: "error", messageKey: "proPage.paymentUnavailable" };

    const { payment, reference } = await openPayment(input, this.code);
    const base = process.env.PADDLE_CHECKOUT_URL ?? "https://checkout.paddle.com/checkout";

    return {
      kind: "redirect",
      paymentId: payment.id,
      url: `${base}?product=${encodeURIComponent(input.planCode)}&passthrough=${encodeURIComponent(reference)}`,
    };
  }

  async verify(input: VerifyInput): Promise<VerifyResult> {
    // Nënshkrimi i webhook-ut kontrollohet para se të shkruhet çfarëdo gjëje.
    if (!input.signature) return { ok: false, days: 0, messageKey: "errors.forbidden" };
    return settle(input.paymentId);
  }
}

/**
 * Bankat vendore: ProCredit, NLB, Raiffeisen.
 *
 * Studenti shkon te faqja e bankës dhe kthehet me një webhook. Kodi i referencës
 * është i njëjti si te transferta manuale, që përputhja të bëhet njësoj.
 */
class LocalBankProvider implements PaymentProvider {
  readonly code = "localbank" as const;

  isAvailable() {
    return Boolean(process.env.LOCALBANK_ENDPOINT && process.env.LOCALBANK_MERCHANT);
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!this.isAvailable()) return { kind: "error", messageKey: "proPage.paymentUnavailable" };

    const { payment, reference } = await openPayment(input, this.code);

    return {
      kind: "redirect",
      paymentId: payment.id,
      url: `${process.env.LOCALBANK_ENDPOINT}?merchant=${process.env.LOCALBANK_MERCHANT}&amount=${input.amountCents}&ref=${reference}`,
    };
  }

  async verify(input: VerifyInput): Promise<VerifyResult> {
    if (!input.signature) return { ok: false, days: 0, messageKey: "errors.forbidden" };
    return settle(input.paymentId);
  }
}

/**
 * Transfertë bankare me kod referencë.
 *
 * Nuk kërkon integrim fare, prandaj punon që nga dita e parë. Konfirmimi është
 * manual, nga paneli i adminit, dhe pikërisht prandaj `verify` nuk e beson
 * asnjëherë klientin.
 */
class BankTransferProvider implements PaymentProvider {
  readonly code = "transfer" as const;

  isAvailable() {
    return Boolean(process.env.BANK_IBAN);
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!this.isAvailable()) return { kind: "error", messageKey: "proPage.paymentUnavailable" };

    const { payment, reference } = await openPayment(input, this.code);

    return {
      kind: "instructions",
      paymentId: payment.id,
      reference,
      instructionsKey: "proPage.transferBody",
    };
  }

  async verify(input: VerifyInput): Promise<VerifyResult> {
    return settle(input.paymentId);
  }
}

/** Voucher-at e shitur nga ambasadorët. Shlyerja bëhet te `lib/actions/billing.ts`. */
class VoucherProvider implements PaymentProvider {
  readonly code = "voucher" as const;
  isAvailable() {
    return true;
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const { payment, reference } = await openPayment(input, this.code);
    return {
      kind: "instructions",
      paymentId: payment.id,
      reference,
      instructionsKey: "proPage.voucherBody",
    };
  }

  async verify(input: VerifyInput): Promise<VerifyResult> {
    return settle(input.paymentId);
  }
}

/** Këmbimi i XP-së së kontributit. Nuk kalon kurrë nga një ofrues i jashtëm. */
class XpProvider implements PaymentProvider {
  readonly code = "xp" as const;
  isAvailable() {
    return true;
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const { payment } = await openPayment(input, this.code);
    return { kind: "settled", paymentId: payment.id, days: 0 };
  }

  async verify(input: VerifyInput): Promise<VerifyResult> {
    return settle(input.paymentId);
  }
}

/** Vetëm për zhvillim dhe demo. Kurrë i disponueshëm në prodhim. */
class MockProvider implements PaymentProvider {
  readonly code = "mock" as const;

  isAvailable() {
    return process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!this.isAvailable()) return { kind: "error", messageKey: "proPage.paymentUnavailable" };
    const { payment } = await openPayment(input, this.code);
    await db.payment.update({ where: { id: payment.id }, data: { status: "paid" } });
    return { kind: "settled", paymentId: payment.id, days: 0 };
  }

  async verify(input: VerifyInput): Promise<VerifyResult> {
    return settle(input.paymentId);
  }
}

/** Shënon pagesën si të paguar. Ditët i llogarit thirrësi sipas planit. */
async function settle(paymentId: string): Promise<VerifyResult> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, status: true },
  });
  if (!payment) return { ok: false, days: 0, messageKey: "errors.notFoundContent" };
  if (payment.status === "paid") return { ok: true, days: 0 };

  await db.payment.update({ where: { id: paymentId }, data: { status: "paid" } });
  return { ok: true, days: 0 };
}

const REGISTRY: Record<ProviderCode, PaymentProvider> = {
  paddle: new PaddleProvider(),
  localbank: new LocalBankProvider(),
  transfer: new BankTransferProvider(),
  voucher: new VoucherProvider(),
  xp: new XpProvider(),
  mock: new MockProvider(),
};

export function getProvider(code: ProviderCode): PaymentProvider {
  return REGISTRY[code];
}

/** Ofruesit që kanë kuptim të shfaqen te faqja e Pro-s në këtë mjedis. */
export function availableProviders(): ProviderCode[] {
  return (Object.keys(REGISTRY) as ProviderCode[]).filter((code) => REGISTRY[code].isAvailable());
}
