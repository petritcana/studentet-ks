import type { Metadata } from "next";
import { LegalShell, type LegalSection } from "@/components/layout/legal-shell";

export const metadata: Metadata = {
  title: "Kushtet e përdorimit",
  description: "Rregullat e sjelljes, të drejtat mbi përmbajtjen dhe kufijtë e platformës.",
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Kush mund të hyjë",
    body: [
      "Platforma është për studentë dhe të diplomuar të institucioneve të arsimit të lartë në Kosovë, 16 vjeç e lart.",
      "Emaili institucional të jep badge-in «I verifikuar» dhe hap veçori si Zëri i kampusit. Nuk është i detyrueshëm për të hyrë, por disa gjëra mbeten të mbyllura pa të.",
    ],
  },
  {
    heading: "Si sillemi këtu",
    body: [
      "Rregulli i vetëm nga i cili rrjedhin të gjithë të tjerët: ndihmo, mos poshtëro.",
    ],
    list: [
      "Pa ngacmim dhe pa sulme personale, as me emër, as me aluzion.",
      "Pa gjuhë urrejtjeje mbi baza etnike, fetare, gjinore, orientimi ose aftësie.",
      "Pa përmbajtje seksuale dhe pa kërcënime.",
      "Pa të dhëna personale të të tjerëve: numra, adresa, dokumente, fotografi private.",
      "Pa spam, pa reklama të fshehura, pa llogari të shumëfishta për të ndikuar votimet.",
    ],
  },
  {
    heading: "Zëri i kampusit",
    body: [
      "Ky seksion lejon postime anonime publikisht, por llogaria prapa tyre mbetet e verifikuar.",
      "Kërkohet llogari më e vjetër se shtatë ditë dhe email institucional i verifikuar.",
    ],
    list: [
      "Ndalim absolut i përmendjes së emrave të studentëve ose të stafit.",
      "Nuk lejohen fotografi të njerëzve.",
      "Lejohen: humor kampusi, ankesa për infrastrukturë, pyetje akademike që të vjen turp t'i bësh, këshilla dhe «spotted» pa emra e pa foto.",
      "Tri raportime e fshehin postimin automatikisht derisa ta shohë një moderator.",
    ],
  },
  {
    heading: "Materialet dhe të drejtat e autorit",
    body: [
      "Materialin që ngarkon e mban ti. Duke e ngarkuar, na jep të drejtën ta shfaqim dhe ta shpërndajmë brenda platformës te studentët e tjerë.",
      "Materialet e ngarkuara nga studentët nuk vendosen kurrë pas një muri pagese.",
    ],
    list: [
      "Ndalohet ngarkimi i librave të plotë me të drejta autoriale.",
      "Materialet e profesorëve publikohen vetëm me lejen e tyre, ose si shënime të studentit të shkruara vetë.",
      "Çdo kërkesë për heqje shqyrtohet dhe zbatohet brenda 48 orësh.",
      "Materiali i ri hyn si i paverifikuar derisa ta vlerësojnë pozitivisht tre studentë ose ta miratojë një moderator lënde.",
      "Materialet nën dy yje me mbi pesë vlerësime fshihen automatikisht.",
    ],
  },
  {
    heading: "Përmbajtja jote mbetet e jotja",
    body: [
      "Postimet, komentet dhe përgjigjet e tua janë të tuat. Ne nuk i shesim dhe nuk i përdorim për të trajnuar modele.",
      "Ndihmësi automatik i platformës nuk e zëvendëson përmbajtjen e studentit në feed. Ai bën përmbledhje, kërkim dhe organizim, dhe çdo dalje e tij shënohet si e gjeneruar automatikisht.",
    ],
  },
  {
    heading: "Moderimi dhe masat",
    body: [
      "Raportimi bëhet me një klikim. Koha e premtuar e reagimit është 24 orë.",
      "Masat janë progresive: fshehje e përmbajtjes, heqje, kufizim i llogarisë dhe në rastet e rënda mbyllje e saj. Vendimet e agreguara publikohen çdo javë.",
      "Bllokimi dhe heshtja e përdoruesve janë gjithmonë në dorën tënde, pa pasur nevojë të raportosh.",
    ],
  },
  {
    heading: "Renditjet dhe pikët",
    body: [
      "Pikët XP dhe badge-t janë njohje brenda platformës. Nuk kanë vlerë monetare dhe nuk shkëmbehen.",
      "Renditjet janë javore, resetohen dhe ekzistojnë vetëm brenda grupeve të vogla. Nuk ka renditje globale dhe nuk shfaqet kurrë fundi i listës.",
    ],
  },
  {
    heading: "Ndryshimet",
    body: [
      "Nëse ndryshojmë diçka që prek të drejtat e tua, njoftojmë brenda platformës të paktën 14 ditë përpara.",
      "Nëse nuk pajtohesh, mund ta eksportosh gjithçka dhe ta fshish llogarinë në çdo moment.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalShell
      title="Kushtet e përdorimit"
      updatedAt="9 shtator 2026"
      intro="Rregullat janë të shkurtra me qëllim. Nëse diçka duket e paqartë, shkruaj dhe e sqarojmë."
      sections={SECTIONS}
    />
  );
}
