import type { Metadata } from "next";
import { LegalShell, type LegalSection } from "@/components/layout/legal-shell";

export const metadata: Metadata = {
  title: "Politika e privatësisë",
  description:
    "Si i mbledhim, i përdorim dhe i mbrojmë të dhënat e tua, sipas Ligjit Nr. 06/L-082.",
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Kush jemi dhe cili ligj vlen",
    body: [
      "Studentët.KS është platformë për studentët e Kosovës. Përpunimi i të dhënave bie nën Ligjin Nr. 06/L-082 për Mbrojtjen e të Dhënave Personale, i harmonizuar me Rregulloren e Përgjithshme për Mbrojtjen e të Dhënave të Bashkimit Evropian.",
      "Kontrollues i të dhënave është ekipi i Studentët.KS. Për çdo kërkesë që ka të bëjë me të dhënat e tua, shkruaj te adresa në fund të kësaj faqeje. Përgjigjemi brenda 30 ditësh.",
    ],
  },
  {
    heading: "Çfarë mbledhim",
    body: [
      "Mbledhim vetëm atë që i duhet platformës për të funksionuar. Asgjë nuk kërkohet «për çdo rast».",
    ],
    list: [
      "Të dhëna llogarie: emri, emaili, fjalëkalimi i ruajtur si hash, emri i përdoruesit.",
      "Të dhëna akademike: universiteti, fakulteti, departamenti, viti, niveli dhe lëndët e zgjedhura.",
      "Të dhëna profili që i jep vetë: bio, qyteti, shkolla e mesme, interesat, fotoja.",
      "Përmbajtja që krijon: postime, komente, materiale, pyetje, përgjigje, mesazhe.",
      "Të dhëna përdorimi: kur hyn për herë të fundit, streak-u dhe pikët XP.",
      "Të dhëna teknike të domosdoshme për sigurinë, si adresa IP gjatë regjistrimit, e përdorur vetëm kundër abuzimit.",
    ],
  },
  {
    heading: "Baza ligjore për çdo përpunim",
    body: [
      "Çdo lloj përpunimi ka bazën e vet ligjore, jo një pëlqim të përgjithshëm në fillim.",
    ],
    list: [
      "Zbatimi i kontratës: llogaria, orari, materialet dhe funksionet bazë të platformës.",
      "Interesi legjitim: siguria, parandalimi i spamit dhe moderimi i përmbajtjes.",
      "Pëlqimi: njoftimet push dhe cookies analitike. Të dyja janë të fikura si parazgjedhje dhe kërkohen veçmas.",
      "Detyrimi ligjor: ruajtja e të dhënave kur kërkohet me ligj nga një autoritet kompetent.",
    ],
  },
  {
    heading: "Anonimiteti në Zërin e kampusit",
    body: [
      "Postimet në Zërin e kampusit shfaqen publikisht me pseudonim. Në backend ato mbeten të lidhura me një llogari të verifikuar, sepse anonimiteti pa përgjegjësi prodhon dëm.",
      "Identiteti prapa një postimi anonim nuk i zbulohet asnjë përdoruesi. Ai shihet vetëm nga moderatorët, dhe vetëm kur një postim raportohet për ngacmim, kërcënim ose shkelje ligjore.",
    ],
  },
  {
    heading: "Kujt ia ndajmë",
    body: [
      "Nuk i shesim të dhënat e tua askujt dhe nuk i japim për reklama.",
      "Emaili dhe numri i telefonit nuk kthehen kurrë në përgjigjet publike të API-t. Çdo endpoint kalon nëpër një DTO që i heq fushat private.",
    ],
    list: [
      "Ofruesit teknikë që na duhen për të funksionuar, si strehimi dhe baza e të dhënave, të lidhur me kontratë përpunimi.",
      "Autoritetet, vetëm me kërkesë ligjore të vlefshme dhe në masën minimale të kërkuar.",
    ],
  },
  {
    heading: "Sa gjatë i ruajmë",
    body: [
      "Të dhënat e llogarisë ruhen sa kohë që llogaria është aktive. Kur e fshin llogarinë, ato fshihen menjëherë dhe jo më vonë se 30 ditë.",
      "Materialet që ke ngarkuar fshihen bashkë me llogarinë. Nëse dëshiron që një material të mbetet për gjeneratat e ardhshme, mund ta transferosh te kanali i lëndës para se ta fshish llogarinë.",
    ],
  },
  {
    heading: "Të drejtat e tua",
    body: ["I ushtron drejtpërdrejt nga faqja e cilësimeve, pa pasur nevojë të na shkruash."],
    list: [
      "E drejta e qasjes dhe eksportit: shkarko gjithçka që mbajmë për ty, në formatin JSON.",
      "E drejta e korrigjimit: ndrysho çdo fushë të profilit në çdo kohë.",
      "E drejta e fshirjes: fshije llogarinë me gjithë përmbajtjen e lidhur.",
      "E drejta e kundërshtimit: fik njoftimet dhe analitikën pa e humbur qasjen.",
      "E drejta e ankesës: mund t'i drejtohesh Agjencisë për Informim dhe Privatësi.",
    ],
  },
  {
    heading: "Mosha minimale",
    body: [
      "Platforma është për persona 16 vjeç e lart. Gjatë regjistrimit kërkohet konfirmim i moshës. Nëse mësojmë se një llogari i takon dikujt nën 16 vjeç, ajo fshihet.",
    ],
  },
  {
    heading: "Siguria",
    body: [
      "Fjalëkalimet ruhen si hash me bcrypt dhe nuk lexohen dot as nga ne. Ngarkimet kufizohen në lloje dhe madhësi të caktuara. Veprimet e ndjeshme kanë kufi shpejtësie.",
      "Nëse ndodh një shkelje që rrezikon të drejtat e tua, njoftojmë autoritetin brenda 72 orësh dhe ty pa vonesë të panevojshme.",
    ],
  },
  {
    heading: "Cookies",
    body: [
      "Përdorim një cookie sesioni për të të mbajtur të kyçur. Pa të, platforma nuk funksionon, prandaj nuk kërkon pëlqim.",
      "Cookies analitike janë opsionale dhe të fikura si parazgjedhje. I ndez ose i fik nga cilësimet, në çdo kohë.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Politika e privatësisë"
      updatedAt="9 shtator 2026"
      intro="Këtu shkruhet çfarë mbledhim, pse e mbledhim dhe si e ndalon ti. Pa gjuhë juridike që s'kuptohet."
      sections={SECTIONS}
    />
  );
}
