/**
 * Ndërrimi i temës: menjëherë, pa rrëshqitje ngjyrash.
 *
 * Më parë ngjyrat rrëshqisnin për një çerek sekonde, dhe mbi to shtoheshin
 * tranzicionet e vetë elementeve: ndërrimi dukej i ngadaltë. Tani `ThemeProvider`
 * (`disableTransitionOnChange`) i ndal të gjitha tranzicionet për atë çast.
 */
export function switchTheme(setTheme: (theme: string) => void, value: string) {
  setTheme(value);
}
