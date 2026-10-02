import { NextResponse } from "next/server";
import {
  DEGREE_LEVELS,
  getCampuses,
  getFaculties,
  getInstitution,
  getLevels,
  searchInstitutions,
  searchPrograms,
  type DegreeLevel,
} from "@/lib/queries/academic";
import { getCurrentUser } from "@/lib/session";

/**
 * Katalogu akademik, hap pas hapi.
 *
 * Një kërkesë kthen vetëm hapin që po plotësohet: institucionet, degët e një
 * institucioni, fakultetet e tij, ose programet e një fakulteti. Kështu asnjë
 * listë e madhe nuk niset e tëra te telefoni i studentit.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function level(value: string | null): DegreeLevel | undefined {
  return DEGREE_LEVELS.includes(value as DegreeLevel) ? (value as DegreeLevel) : undefined;
}

export async function GET(request: Request) {
  // Katalogu nuk është sekret, por as i hapur: e lexon kush po plotëson profilin.
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const step = url.searchParams.get("hapi") ?? "institucionet";
  const query = url.searchParams.get("q") ?? "";
  const universityId = url.searchParams.get("institucioni") ?? "";
  const campusId = url.searchParams.get("kampusi") ?? "";
  const facultyId = url.searchParams.get("fakulteti") ?? "";
  const degreeLevel = level(url.searchParams.get("niveli"));

  if (step === "institucionet") {
    return NextResponse.json({ items: await searchInstitutions(query) });
  }

  if (!universityId) return NextResponse.json({ error: "errors.generic" }, { status: 400 });

  if (step === "institucioni") {
    const institution = await getInstitution(universityId);
    if (!institution) return NextResponse.json({ error: "errors.notFoundContent" }, { status: 404 });
    return NextResponse.json({ item: institution });
  }

  if (step === "kampuset") {
    return NextResponse.json({ items: await getCampuses(universityId) });
  }

  if (step === "nivelet") {
    return NextResponse.json({ items: await getLevels(universityId) });
  }

  if (step === "fakultetet") {
    return NextResponse.json({ items: await getFaculties(universityId, degreeLevel) });
  }

  /*
    Një rresht për çdo program dhe për çdo nivel.

    Dikur emrat grupoheshin: «Mekatronikë» dilte një herë, me Bachelor dhe Master
    poshtë si hap i dytë. Studenti e zgjidhte emrin, niveli mbetej bosh dhe
    butoni ankohej se s'ka program. Tani «Mekatronikë, BSc» dhe «Mekatronikë,
    MSc» janë dy zgjedhje të ndara, dhe s'ka hap të dytë që të harrohet.
  */
  if (step === "programet") {
    return NextResponse.json({
      items: await searchPrograms({
        universityId,
        campusId: campusId || undefined,
        facultyId: facultyId || undefined,
        level: degreeLevel,
        query,
      }),
    });
  }

  return NextResponse.json({ error: "errors.generic" }, { status: 400 });
}
