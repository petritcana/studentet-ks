import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Showcase } from "@/components/design-system/showcase";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("designSystem");
  return {
    title: t("title"),
    description: t("intro"),
    robots: { index: false, follow: false },
  };
}

export default function DesignSystemPage() {
  return <Showcase />;
}
