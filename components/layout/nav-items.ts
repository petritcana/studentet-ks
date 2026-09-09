import {
  BookOpen,
  Home,
  Plus,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  /** Çelës në katalogun e përkthimeve (nav.*). */
  key: string;
  icon: LucideIcon;
  /** Rrugët që e mbajnë këtë tab aktiv. */
  match: string[];
};

export const PRIMARY_NAV: NavItem[] = [
  { href: "/feed", key: "home", icon: Home, match: ["/feed"] },
  {
    href: "/materialet",
    key: "materials",
    icon: BookOpen,
    match: ["/materialet", "/pyetje", "/lenda"],
  },
  {
    href: "/kampusi",
    key: "campus",
    icon: Users,
    match: ["/kampusi", "/grupet", "/eventet"],
  },
  { href: "/une", key: "me", icon: User, match: ["/une", "/u/"] },
];

export const COMPOSER_ITEM = { href: "/posto", key: "compose", icon: Plus };

export function isActive(pathname: string, item: NavItem) {
  return item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
