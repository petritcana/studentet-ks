import {
  BookOpen,
  Briefcase,
  Cpu,
  FlaskConical,
  GraduationCap,
  Palette,
  Scale,
  Stethoscope,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/**
 * Regjistër i vogël ikonash. Baza ruan emrin si tekst, prandaj kalimi nga tekst
 * te komponent bëhet vetëm këtu, jo me import dinamik.
 */
const ICONS: Record<string, LucideIcon> = {
  "trending-up": TrendingUp,
  stethoscope: Stethoscope,
  scale: Scale,
  "flask-conical": FlaskConical,
  "book-open": BookOpen,
  palette: Palette,
  cpu: Cpu,
  briefcase: Briefcase,
};

export function FacultyIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = (name && ICONS[name]) || GraduationCap;
  return <Icon className={className} aria-hidden />;
}
