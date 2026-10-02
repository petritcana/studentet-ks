/**
 * Kalimi mes faqeve.
 *
 * `template` rimontohet në çdo navigim, ndryshe nga `layout`, prandaj çdo faqe
 * e re hyn me një zbehje të shkurtër në vend që të shfaqet me kërcim. Shiriti,
 * shtyllat dhe asistenti mbeten të palëvizura, sepse jetojnë te layout-i.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
