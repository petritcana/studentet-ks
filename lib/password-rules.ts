/**
 * Rregullat e password-it të Studentët.KS, të njëjta te faqja dhe te serveri.
 *
 * Tetë shkronja janë kusht; nga katër llojet (gjatësia, shkronjë e madhe, numër,
 * simbol) duhen të paktën tri. Faqja i tregon live, serveri i kontrollon prapë.
 */
export function passwordRules(value: string) {
  return {
    length: value.length >= 8,
    upper: /[A-ZËÇ]/.test(value),
    number: /\d/.test(value),
    symbol: /[^A-Za-z0-9ëçËÇ\s]/.test(value),
  };
}

export function passwordScore(value: string): 0 | 1 | 2 | 3 | 4 {
  if (!value) return 0;
  const passed = Object.values(passwordRules(value)).filter(Boolean).length;
  return Math.max(1, passed) as 1 | 2 | 3 | 4;
}

/** «Vazhdo» hapet kur ka 8+ shkronja, të paktën tri rregulla dhe përputhje me përsëritjen. */
export function canContinue(password: string, confirm: string): boolean {
  const rules = passwordRules(password);
  const passed = Object.values(rules).filter(Boolean).length;
  return rules.length && passed >= 3 && password === confirm;
}
