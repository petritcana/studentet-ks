export type ActionState = {
  ok: boolean;
  /** Çelës përkthimi, jo tekst i gatshëm. Përkthimi bëhet te komponenti. */
  messageKey?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | number>;
};

export const IDLE: ActionState = { ok: false };

export function fail(
  messageKey: string,
  fieldErrors?: Record<string, string>,
  values?: Record<string, string | number>,
): ActionState {
  return { ok: false, messageKey, fieldErrors, values };
}

export function succeed(messageKey?: string, values?: Record<string, string | number>): ActionState {
  return { ok: true, messageKey, values };
}
