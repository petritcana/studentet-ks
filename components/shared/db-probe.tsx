import { dbMetricsEnabled, takeQueryStats } from "@/lib/db-metrics";

/**
 * Rreshti i matjes në fund të faqes.
 *
 * Nuk vizaton asgjë. Rri i fundit në pemën e faqes, prandaj kur ekzekutohet, të
 * gjitha pyetjet e asaj faqeje kanë mbaruar dhe numrat janë të plotë.
 */
export function DbProbe({ path }: { path: string }) {
  if (!dbMetricsEnabled()) return null;

  const stats = takeQueryStats();
  console.log(`[diag] ${path} pyetje=${stats.queries} db=${stats.millis}ms`);
  return null;
}
