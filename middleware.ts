import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Roja e rrugëve të mbrojtura, para se të nisë renderimi.
 *
 * Faqet e adminit, të moderimit dhe të fitimeve e kontrollojnë rolin edhe vetë,
 * por ato kontrolle ndodhin gjatë renderimit. Me rrjedhë të ndezur, përgjigjja
 * ka nisur tashmë, prandaj ridrejtimi kthehet si udhëzim brenda faqes dhe
 * statusi mbetet 200. Përmbajtja nuk rrjedh, por një kontroll qasjeje duhet të
 * thotë hapur «jo», prandaj vendimi merret këtu, para çdo bajti.
 */
const RULES: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["admin", "super_admin"] },
  { prefix: "/moderimi", roles: ["admin", "super_admin", "moderator"] },
  { prefix: "/kurset/fitimet", roles: ["professor", "assistant", "admin", "super_admin"] },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Faqja publike e transparencës rri nën /moderimi dhe mbetet e hapur.
  if (pathname.startsWith("/moderimi/publik")) return NextResponse.next();

  const rule = RULES.find(
    (item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`),
  );
  if (!rule) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  });

  if (!token?.sub) {
    const login = new URL("/hyr", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const role = typeof token.role === "string" ? token.role : "student";
  if (!rule.roles.includes(role)) return NextResponse.redirect(new URL("/feed", request.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/moderimi/:path*", "/kurset/fitimet/:path*"],
};
