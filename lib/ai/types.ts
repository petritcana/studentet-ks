/**
 * Tipat e asistentit që i lexon edhe shfletuesi.
 *
 * Provider-i vetë është vetëm i serverit: aty jetojnë çelësi i modelit dhe
 * prompt-et. Nëse një komponent klient importon prej tij, tërë ai kod niset te
 * çdo vizitor, prandaj tipat rrinë këtu.
 */
export type AiSource = {
  materialId: string;
  title: string;
  courseName: string;
  chunk: number;
  excerpt: string;
};
