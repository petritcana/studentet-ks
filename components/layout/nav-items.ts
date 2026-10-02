import {
  BarChart3,
  Bookmark,
  BookOpen,
  Briefcase,
  FileStack,
  GraduationCap,
  Home,
  MessageCircle,
  Store,
  Trophy,
  LogOut,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  /** Çelës te `nav.*`, kurrë tekst i gatshëm. */
  key: string;
  icon: LucideIcon;
  match: string[];
};

export const PRIMARY_NAV: NavItem[] = [
  { href: "/feed", key: "home", icon: Home, match: ["/feed", "/postimi"] },
  {
    href: "/materialet",
    key: "materials",
    icon: FileStack,
    match: ["/materialet", "/lenda"],
  },
  { href: "/karriera", key: "career", icon: Briefcase, match: ["/karriera", "/pune"] },
  {
    href: "/komuniteti",
    key: "community",
    icon: Users,
    match: ["/komuniteti", "/kampusi", "/grupet", "/eventet", "/u"],
  },
  { href: "/tregu", key: "market", icon: Store, match: ["/tregu"] },
  { href: "/gara", key: "competition", icon: Trophy, match: ["/gara"] },
];

/**
 * Menyja e avatarit.
 *
 * Moderimi dhe admini jetojnë vetëm këtu, dhe vetëm për rolin e duhur. Fshehja
 * në UI nuk është siguri: çdo rrugë mbrohet edhe në server nga `requireModerator`
 * dhe `requireAdmin`.
 */
export type AccountItem = NavItem & { role?: "moderator" | "admin"; destructive?: boolean };

export const ACCOUNT_MENU: AccountItem[] = [
  { href: "/une", key: "profile", icon: User, match: ["/une"] },
  { href: "/une/te-ruajtura", key: "saved", icon: Bookmark, match: ["/une/te-ruajtura"] },
  { href: "/une/permbajtja", key: "myContent", icon: BookOpen, match: ["/une/permbajtja"] },
  { href: "/une/analitika", key: "analytics", icon: BarChart3, match: ["/une/analitika"] },
  { href: "/kurset", key: "courses", icon: GraduationCap, match: ["/kurset"] },
  { href: "/une/pro", key: "pro", icon: Sparkles, match: ["/une/pro"] },
  { href: "/cilesimet", key: "settings", icon: Settings, match: ["/cilesimet"] },
  { href: "/moderimi", key: "moderation", icon: Shield, match: ["/moderimi"], role: "moderator" },
  { href: "/admin", key: "admin", icon: ShieldCheck, match: ["/admin"], role: "admin" },
];

export const SIGN_OUT: NavItem = {
  href: "/hyr",
  key: "signOut",
  icon: LogOut,
  match: [],
};

/** Pesë vende në celular. I mesmi është kompozuesi, jo faqe. */
export const MOBILE_NAV: NavItem[] = [
  { href: "/feed", key: "home", icon: Home, match: ["/feed", "/postimi"] },
  { href: "/komuniteti", key: "community", icon: Users, match: ["/komuniteti", "/u"] },
  { href: "/mesazhe", key: "messages", icon: MessageCircle, match: ["/mesazhe"] },
  { href: "/une", key: "profile", icon: User, match: ["/une"] },
];

export function isActive(pathname: string, item: { match: string[] }) {
  return item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Filtron menynë e llogarisë sipas rolit të përdoruesit. */
export function accountMenuFor(role: string): AccountItem[] {
  return ACCOUNT_MENU.filter((item) => {
    if (!item.role) return true;
    if (item.role === "moderator") return role === "moderator" || role === "admin";
    return role === "admin";
  });
}
