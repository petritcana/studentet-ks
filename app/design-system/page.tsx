import type { Metadata } from "next";
import { Showcase } from "@/components/design-system/showcase";

export const metadata: Metadata = {
  title: "Sistemi i dizajnit",
  description:
    "Të gjithë komponentët e Studentët.KS në një faqe, në temën e ndritshme dhe të errët.",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return <Showcase />;
}
