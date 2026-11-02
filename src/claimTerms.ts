/**
 * Term lists for the green claims checker, per language.
 *
 * Built from the examples Directive (EU) 2024/825 itself gives in its official
 * English, Dutch, German and French versions (recitals 9, 10, 11, 12 and 15),
 * plus the everyday shop phrasing those examples stand for ("similar
 * statements", recital 9). Each pattern says which rule it points to and how
 * sure the match is:
 *
 * - `likely`: the phrase is one the directive names, or a direct variant of it.
 * - `check`: the phrase is an environmental claim only in some readings
 *   ("duurzaam" also means long-lasting) or is allowed with the right proof
 *   ("energy efficient" with energy class A, recital 10).
 *
 * False positives the lists avoid on purpose: "organic", "bio", "biologisch",
 * "biologique" and "Bio-Baumwolle" (organic terms reserved by Regulation (EU)
 * 2018/848, Article 30 and Annex IV), German organic farming phrases with
 * "ökologisch" and control codes such as "DE-ÖKO-001", "green" as a colour,
 * and "OEKO-TEX" and "Öko-Test" as names. "eco", "Öko" and "ökologisch" stay
 * flagged (the directive names "ökologisch" itself) with the organicTerm hint.
 *
 * Patterns are regex sources without word boundaries; the scanner adds Unicode
 * boundaries and the `iu` flags. Keep them free of capture groups.
 */

export const GREEN_CLAIM_LANGUAGES = ["en", "nl", "de", "fr"] as const;
export type GreenClaimLanguage = (typeof GREEN_CLAIM_LANGUAGES)[number];

/**
 * Which provision a phrase points to. Annex I points are those of Directive
 * 2005/29/EC as amended by the Annex to Directive (EU) 2024/825.
 */
export const GREEN_CLAIM_RULES = [
  "futureClaim", // Article 6(2)(d): future environmental performance
  "offsetting", // Annex I point 4c: neutral/reduced/positive GHG impact based on offsetting
  "label", // Annex I point 2a: sustainability label without certification scheme
  "legalRequirement", // Annex I point 10a: legal requirement presented as a distinctive feature
  "wholeProduct", // Annex I point 4b: claim about the entire product when it concerns one aspect
  "generic", // Annex I point 4a: generic environmental claim
] as const;
export type GreenClaimRule = (typeof GREEN_CLAIM_RULES)[number];

export type GreenClaimSeverity = "likely" | "check";

/** Extra, phrase-specific explanation keys (copy lives in the tool namespace). */
export type GreenClaimHint =
  | "sustainable"
  | "durableAmbiguous"
  | "energy"
  | "biodegradable"
  | "compostable"
  | "recyclable"
  | "modeName"
  | "greenColour"
  | "organicTerm";

export interface GreenClaimPattern {
  id: string;
  rule: GreenClaimRule;
  severity: GreenClaimSeverity;
  /** Regex source, matched case-insensitively with Unicode boundaries. */
  source: string;
  hint?: GreenClaimHint;
}

// Shared fragments. `H` is an optional hyphen or space, `CO2` any spelling of it.
const H = "[-\\u2010\\u2011\\s]?";
const CO2 = "(?:co2|co₂|co\\s2)";
const YEAR = "20\\d\\d";
const APOS = "['\\u2019]";

const EN: GreenClaimPattern[] = [
  // Future performance (Art. 6(2)(d)): needs a published, verified plan.
  {
    id: "en-future-target",
    rule: "futureClaim",
    severity: "check",
    source:
      `(?:net${H}zero|(?:climate|carbon|${CO2})${H}(?:neutral|positive|negative))[^.!?\\n]{0,30}?\\b(?:by|` +
      `in|before|until)\\s+${YEAR}|(?:by|before|until)\\s+${YEAR}[^.!?\\n]{0,30}?(?:net${H}zero|` +
      `(?:climate|carbon|${CO2})${H}(?:neutral|positive|negative))`,
  },
  // Offsetting (Annex I 4c). Examples from recital 12.
  {
    id: "en-climate-neutral",
    rule: "offsetting",
    severity: "likely",
    source: `climate${H}neutral(?:ity)?`,
  },
  {
    id: "en-carbon-neutral",
    rule: "offsetting",
    severity: "likely",
    source: `(?:carbon|${CO2})${H}neutral(?:ity)?(?:\\s+certified)?`,
  },
  {
    id: "en-co2-neutral-certified",
    rule: "offsetting",
    severity: "likely",
    source: `certified\\s+(?:carbon|${CO2})${H}neutral`,
  },
  {
    id: "en-positive",
    rule: "offsetting",
    severity: "likely",
    source: `(?:carbon|climate|${CO2})${H}positive`,
  },
  {
    id: "en-net-zero",
    rule: "offsetting",
    severity: "likely",
    source: `(?:climate\\s+)?net${H}zero`,
  },
  {
    id: "en-compensated",
    rule: "offsetting",
    severity: "likely",
    source: `(?:climate|carbon|${CO2})${H}(?:compensated|offset)`,
  },
  {
    id: "en-offset-emissions",
    rule: "offsetting",
    severity: "likely",
    source: `offset(?:s|ting)?\\s+(?:(?:our|the|its|all|their)\\s+)?(?:carbon|${CO2}|emissions|footprint)`,
  },
  {
    id: "en-reduced-impact",
    rule: "offsetting",
    severity: "likely",
    source: "reduced\\s+climate\\s+impact",
  },
  {
    id: "en-footprint",
    rule: "offsetting",
    severity: "likely",
    source: `(?:limited|low|lower|reduced|minimal)\\s+(?:carbon|${CO2})\\s+footprint`,
  },
  {
    id: "en-zero-carbon",
    rule: "offsetting",
    severity: "check",
    source: `(?:zero${H}carbon|carbon${H}free)`,
  },
  // Sustainability labels (Annex I 2a). "EU Ecolabel" is a public label (recital 8).
  {
    id: "en-label",
    rule: "label",
    severity: "check",
    source: `(?<!eu${H})(?:eco|green|sustainability|environmental|climate)${H}(?:label|seal|badge|mark|certificate)s?`,
  },
  {
    id: "en-eco-certified",
    rule: "label",
    severity: "check",
    source: `(?:eco|green|sustainab(?:le|ility))${H}certified|certified\\s+(?:green|eco|sustainable)`,
  },
  // Legal requirements as a selling point (Annex I 10a, recital 15).
  {
    id: "en-free-from",
    rule: "legalRequirement",
    severity: "check",
    source:
      "(?:cfc|pfas|bpa|phthalates?|lead|mercury|cadmium|pvc)-free|free\\s+(?:from|of)\\s+(?:cfcs?|pfas|bpa|phthalates|lead|mercury|cadmium|pvc)",
  },
  // Whole product vs one aspect (Annex I 4b, recital 11).
  {
    id: "en-made-recycled",
    rule: "wholeProduct",
    severity: "check",
    source:
      "(?:made|produced|crafted|manufactured)\\s+(?:from|with|of|using)\\s+recycled(?:\\s+\\p{L}+)?",
  },
  {
    id: "en-fully-recyclable",
    rule: "wholeProduct",
    severity: "check",
    source: "(?:fully|completely|100\\s?%)\\s*recyclable",
    hint: "recyclable",
  },
  // Generic claims (Annex I 4a). Examples from recitals 9 and 10.
  { id: "en-eco-friendly", rule: "generic", severity: "likely", source: `eco${H}friendly` },
  {
    id: "en-environment-friendly",
    rule: "generic",
    severity: "likely",
    source: `environment(?:ally)?${H}friendly`,
  },
  {
    id: "en-friendly",
    rule: "generic",
    severity: "likely",
    source: `(?:nature|planet|earth|climate|carbon)${H}friendly`,
  },
  {
    id: "en-natures-friend",
    rule: "generic",
    severity: "likely",
    source: `nature${APOS}?s\\s+friend`,
  },
  { id: "en-ecological", rule: "generic", severity: "likely", source: "ecological(?:ly)?" },
  {
    id: "en-environmentally-x",
    rule: "generic",
    severity: "likely",
    source: "environmentally\\s+(?:correct|sound|responsible|conscious|safe|kind|better)",
  },
  {
    id: "en-gentle",
    rule: "generic",
    severity: "likely",
    source:
      "(?:gentle|kind|good|better)\\s+(?:on|to|for)\\s+the\\s+(?:environment|planet|earth|climate)",
  },
  {
    id: "en-eco-mode",
    rule: "generic",
    severity: "check",
    source: `eco${H}(?:mode|program(?:me)?|setting|cycle)`,
    hint: "modeName",
  },
  {
    id: "en-eco",
    rule: "generic",
    severity: "likely",
    source: `(?<!eu${H})eco(?:${H}conscious)?(?!${H}label)`,
    hint: "organicTerm",
  },
  {
    id: "en-planet-conscious",
    rule: "generic",
    severity: "likely",
    source: `(?:planet|earth|climate)${H}(?:conscious|positive)`,
  },
  {
    id: "en-green-phrase",
    rule: "generic",
    severity: "likely",
    source:
      "green(?:er)?\\s+(?:choice|alternative|option|product|solution|living|credentials|packaging|shipping|delivery|future)s?",
    hint: "greenColour",
  },
  {
    id: "en-go-green",
    rule: "generic",
    severity: "likely",
    source: "(?:go|going|choose|think)\\s+green|greener",
    hint: "greenColour",
  },
  { id: "en-low-carbon", rule: "generic", severity: "likely", source: `low${H}carbon` },
  { id: "en-zero-waste", rule: "generic", severity: "likely", source: `zero${H}waste` },
  {
    id: "en-energy-efficient",
    rule: "generic",
    severity: "check",
    source: `energy${H}(?:efficient|saving)`,
    hint: "energy",
  },
  {
    id: "en-biodegradable",
    rule: "generic",
    severity: "likely",
    source: "biodegradable",
    hint: "biodegradable",
  },
  {
    id: "en-compostable",
    rule: "generic",
    severity: "check",
    source: "(?:home\\s+)?compostable",
    hint: "compostable",
  },
  { id: "en-biobased", rule: "generic", severity: "likely", source: `bio${H}based` },
  {
    id: "en-sustainable",
    rule: "generic",
    severity: "likely",
    source: "sustainabl[ey](?:\\s+(?:sourced|made|produced|grown|packaged))?|sustainability",
    hint: "sustainable",
  },
  {
    id: "en-responsible",
    rule: "generic",
    severity: "likely",
    source:
      "responsibly\\s+(?:sourced|made|produced|manufactured)|responsible\\s+(?:choice|production|sourcing)",
    hint: "sustainable",
  },
  {
    id: "en-conscious",
    rule: "generic",
    severity: "check",
    source: "conscious(?:ly)?\\s+(?:choice|made|collection|consumer|living)",
    hint: "sustainable",
  },
];

const NL: GreenClaimPattern[] = [
  {
    id: "nl-future-target",
    rule: "futureClaim",
    severity: "check",
    source:
      `(?:klimaatneutraal|${CO2}${H}neutraal|netto${H}nul|klimaatpositief)[^.!?\\n]{0,30}?(?<![\\p{L}])` +
      `(?:in|voor|vóór|tegen|uiterlijk)\\s+${YEAR}|(?:in|voor|vóór|tegen|uiterlijk)\\s+${YEAR}[^.!?\\n]{0,30}?(?:klimaatneutraal|` +
      `${CO2}${H}neutraal|netto${H}nul|klimaatpositief)`,
  },
  // Recital 12, Dutch version: klimaatneutraal, gecertificeerd CO2-neutraal, ...
  {
    id: "nl-klimaatneutraal",
    rule: "offsetting",
    severity: "likely",
    source: "klimaatneutra(?:al|le)|klimaatneutraliteit",
  },
  {
    id: "nl-co2-neutraal",
    rule: "offsetting",
    severity: "likely",
    source: `(?:gecertificeerd\\s+)?(?:${CO2}|koolstof)${H}neutra(?:al|le)`,
  },
  {
    id: "nl-positief",
    rule: "offsetting",
    severity: "likely",
    source: `(?:klimaat|${CO2}|koolstof)${H}positie(?:f|ve)|(?:met\\s+)?positieve\\s+koolstofbalans`,
  },
  {
    id: "nl-netto-nul",
    rule: "offsetting",
    severity: "likely",
    source: `netto${H}nul(?:impact|uitstoot)?`,
  },
  {
    id: "nl-gecompenseerd",
    rule: "offsetting",
    severity: "likely",
    source: `(?:klimaat|${CO2}|uitstoot)${H}gecompenseerd(?:e)?|klimaatcompensatie|gecompenseerde\\s+(?:${CO2}|uitstoot)`,
  },
  {
    id: "nl-minder-impact",
    rule: "offsetting",
    severity: "likely",
    source: "minder\\s+impact\\s+op\\s+het\\s+klimaat",
  },
  {
    id: "nl-voetafdruk",
    rule: "offsetting",
    severity: "likely",
    source: `(?:beperkte|lage|lagere|kleine|kleinere)\\s+(?:${CO2}|koolstof)${H}voetafdruk`,
  },
  {
    id: "nl-keurmerk",
    rule: "label",
    severity: "check",
    source: `(?<!eu${H})(?:eco|milieu|duurzaamheids|groene?|klimaat)${H}(?:keurmerk|label|logo|zegel|certificaat)(?:en|s)?`,
  },
  {
    id: "nl-gecertificeerd",
    rule: "label",
    severity: "check",
    source: "(?:eco|duurzaam|groen)\\s+gecertificeerd|gecertificeerd\\s+(?:duurzaam|groen|eco)",
  },
  {
    id: "nl-vrij-van",
    rule: "legalRequirement",
    severity: "check",
    source: `(?:cfk|pfas|bpa|ftalaat|lood|kwik|cadmium|pvc)${H}vrij|vrij\\s+van\\s+(?:cfk${APOS}?s?|pfas|bpa|ftalaten|lood|kwik|cadmium|pvc)`,
  },
  {
    id: "nl-gerecycled",
    rule: "wholeProduct",
    severity: "check",
    source:
      "(?:gemaakt|geproduceerd|vervaardigd)\\s+(?:van|uit|met)\\s+(?:gerecycle(?:d|erd)e?|gerecyclede)(?:\\s+\\p{L}+)?",
  },
  {
    id: "nl-recyclebaar",
    rule: "wholeProduct",
    severity: "check",
    source: "(?:volledig|helemaal|100\\s?%)\\s*recyclebaar",
    hint: "recyclable",
  },
  // Recital 9, Dutch version.
  {
    id: "nl-milieuvriendelijk",
    rule: "generic",
    severity: "likely",
    source: "milieuvriendelijk(?:e|er|ste)?",
  },
  { id: "nl-milieubewust", rule: "generic", severity: "likely", source: "milieubewust(?:e|er)?" },
  {
    id: "nl-natuurvriendelijk",
    rule: "generic",
    severity: "likely",
    source: "(?:natuur|planeet|aarde|klimaat)vriendelijk(?:e|er)?",
  },
  {
    id: "nl-ecologisch",
    rule: "generic",
    severity: "likely",
    source: "ecologisch(?:e)?(?:\\s+verantwoord(?:e)?)?",
  },
  { id: "nl-zacht", rule: "generic", severity: "likely", source: "zacht\\s+voor\\s+het\\s+milieu" },
  {
    id: "nl-goed-voor",
    rule: "generic",
    severity: "likely",
    source: "(?:beter|goed)\\s+voor\\s+(?:het\\s+milieu|de\\s+planeet|het\\s+klimaat|de\\s+aarde)",
  },
  {
    id: "nl-koolstofarm",
    rule: "generic",
    severity: "likely",
    source: `koolstofarm(?:e)?|${CO2}${H}arm(?:e)?`,
  },
  {
    id: "nl-eco-modus",
    rule: "generic",
    severity: "check",
    source: `eco${H}(?:modus|programma|stand|instelling)`,
    hint: "modeName",
  },
  {
    id: "nl-eco",
    rule: "generic",
    severity: "likely",
    source: `(?<!eu${H})eco(?!${H}label)`,
    hint: "organicTerm",
  },
  {
    id: "nl-groen",
    rule: "generic",
    severity: "likely",
    source:
      "groene\\s+(?:keuze|optie|alternatief|producten?|oplossing|verpakking|levering|verzending|toekomst)|groener(?:e)?|kies\\s+(?:voor\\s+)?groen",
    hint: "greenColour",
  },
  { id: "nl-afvalvrij", rule: "generic", severity: "likely", source: `afvalvrij|zero${H}waste` },
  {
    id: "nl-energie",
    rule: "generic",
    severity: "check",
    source: `energie${H}(?:efficiënt(?:e)?|zuinig(?:e)?)`,
    hint: "energy",
  },
  {
    id: "nl-afbreekbaar",
    rule: "generic",
    severity: "likely",
    source: "biologisch\\s+afbreekbaar(?:e)?",
    hint: "biodegradable",
  },
  {
    id: "nl-composteerbaar",
    rule: "generic",
    severity: "check",
    source: "composteerbaar(?:e)?",
    hint: "compostable",
  },
  { id: "nl-biogebaseerd", rule: "generic", severity: "likely", source: `bio${H}gebaseerd(?:e)?` },
  // Recital 10: "bewust", "duurzaam", "verantwoord". "Duurzaam" also means long-lasting.
  {
    id: "nl-duurzaam-env",
    rule: "generic",
    severity: "likely",
    source:
      "duurza(?:am|me)\\s+(?:geproduceerd|gemaakt|ingekocht|geteeld|verpakt|keuze|alternatief|producten?|verpakking|mode)|duurzaamheid",
    hint: "sustainable",
  },
  {
    id: "nl-duurzaam",
    rule: "generic",
    severity: "check",
    source: "duurza(?:am|me|amste|mer)",
    hint: "durableAmbiguous",
  },
  {
    id: "nl-verantwoord",
    rule: "generic",
    severity: "likely",
    source:
      "verantwoord(?:e)?\\s+(?:geproduceerd|gemaakt|ingekocht|keuze|productie)|bewuste\\s+keuze",
    hint: "sustainable",
  },
];

const DE: GreenClaimPattern[] = [
  {
    id: "de-future-target",
    rule: "futureClaim",
    severity: "check",
    source:
      `(?:klimaneutral|${CO2}${H}neutral|netto${H}null|klimapositiv)[^.!?\\n]{0,30}?\\b(?:bis|` +
      `ab|in)\\s+(?:zum\\s+jahr\\s+)?${YEAR}|bis\\s+(?:zum\\s+jahr\\s+)?${YEAR}[^.!?\\n]{0,30}?(?:klimaneutral|` +
      `${CO2}${H}neutral|netto${H}null)`,
  },
  // Recital 12, German version: klimaneutral, zertifiziert CO2-neutral, CO2-positiv, ...
  {
    id: "de-klimaneutral",
    rule: "offsetting",
    severity: "likely",
    source: "klimaneutral(?:e|er|es|en|em|ität)?",
  },
  {
    id: "de-co2-neutral",
    rule: "offsetting",
    severity: "likely",
    source: `(?:zertifiziert\\s+)?${CO2}${H}neutral(?:e|er|es|en|em|ität)?`,
  },
  {
    id: "de-positiv",
    rule: "offsetting",
    severity: "likely",
    source: `(?:klima|${CO2})${H}positiv(?:e|er|es|en|em)?`,
  },
  {
    id: "de-ausgleich",
    rule: "offsetting",
    severity: "likely",
    source: `mit\\s+klimaausgleich|(?:klima|${CO2})${H}(?:kompensiert(?:e|er|es|en|em)?|ausgleich)`,
  },
  { id: "de-netto-null", rule: "offsetting", severity: "likely", source: `netto${H}null` },
  {
    id: "de-klimaschonend",
    rule: "offsetting",
    severity: "likely",
    source: "klimaschonend(?:e|er|es|en|em)?",
  },
  {
    id: "de-fussabdruck",
    rule: "offsetting",
    severity: "likely",
    source: `(?:mit\\s+)?(?:reduziert|gering|niedrig|klein)(?:e|er|es|en|em)?\\s+${CO2}${H}fu(?:ß|ss)abdruck`,
  },
  {
    id: "de-siegel",
    rule: "label",
    severity: "check",
    source: `(?<!eu${H})(?:öko|umwelt|nachhaltigkeits|klima|grün(?:es)?)${H}(?:siegel|label|zeichen|logo|zertifikat)(?:s|e|n)?`,
  },
  {
    id: "de-frei",
    rule: "legalRequirement",
    severity: "check",
    source: `(?:fckw|pfas|bpa|phthalat|blei|quecksilber|cadmium|pvc)${H}frei(?:e|er|es|en|em)?|frei\\s+von\\s+(?:fckw|pfas|bpa|phthalaten|blei|quecksilber|cadmium|pvc)`,
  },
  {
    id: "de-recycelt",
    rule: "wholeProduct",
    severity: "check",
    source:
      "(?:aus|mit)\\s+recycelte(?:m|n)?\\s+\\p{L}+|(?:aus|mit)\\s+recyclingmaterial(?:\\s+hergestellt)?",
  },
  {
    id: "de-recycelbar",
    rule: "wholeProduct",
    severity: "check",
    source: "(?:vollständig|komplett|100\\s?%)\\s*recycelbar(?:e|er|es|en|em)?",
    hint: "recyclable",
  },
  // Recital 9, German version.
  {
    id: "de-umwelt",
    rule: "generic",
    severity: "likely",
    source: "umwelt(?:freundlich|schonend|verträglich|gerecht|bewusst)(?:e|er|es|en|em|ere|ste)?",
  },
  {
    id: "de-freundlich",
    rule: "generic",
    severity: "likely",
    source: `(?:natur|klima|planeten|${CO2})${H}freundlich(?:e|er|es|en|em)?`,
  },
  {
    id: "de-oekologisch",
    rule: "generic",
    severity: "likely",
    // "ökologisch" is also a reserved organic term (Regulation (EU) 2018/848,
    // Annex IV): organic farming phrases are left alone, the rest get a hint.
    source:
      "(?<!kontrolliert(?:e[mnrs]?)?\\s)ökologisch(?:e|er|es|en|em)?" +
      "(?!\\s+(?:landbau|landwirtschaft|anbau|erzeugung|tierhaltung|aquakultur))",
    hint: "organicTerm",
  },
  {
    id: "de-gut-fuer",
    rule: "generic",
    severity: "likely",
    source: "(?:gut|besser)\\s+für\\s+(?:die\\s+umwelt|den\\s+planeten|das\\s+klima|die\\s+erde)",
  },
  {
    id: "de-eco-modus",
    rule: "generic",
    severity: "check",
    source: `(?:eco|öko)${H}(?:modus|programm|einstellung)`,
    hint: "modeName",
  },
  {
    id: "de-oeko",
    rule: "generic",
    severity: "likely",
    // Skips Öko-Tex, the Öko-Test magazine, organic farming compounds and EU
    // organic control codes such as DE-ÖKO-001 (Regulation (EU) 2018/848).
    source:
      `(?<!\\p{L}{2}-)öko(?!-?(?:tex|test|landbau|anbau|kontrollstelle)|-\\d)|` +
      `(?<!eu${H})eco(?!${H}label)`,
    hint: "organicTerm",
  },
  {
    id: "de-gruen",
    rule: "generic",
    severity: "likely",
    source:
      "grüne(?:r|s|n)?\\s+(?:wahl|alternative|lösung|produkte?|verpackung|versand|zukunft)|grüner\\s+(?:leben|einkaufen|wohnen)",
    hint: "greenColour",
  },
  {
    id: "de-zero-waste",
    rule: "generic",
    severity: "likely",
    source: `zero${H}waste|müllfrei(?:e|er|es|en|em)?`,
  },
  {
    id: "de-energie",
    rule: "generic",
    severity: "check",
    source: "energie(?:effizient|sparend)(?:e|er|es|en|em)?",
    hint: "energy",
  },
  {
    id: "de-abbaubar",
    rule: "generic",
    severity: "likely",
    source: "biologisch\\s+abbaubar(?:e|er|es|en|em)?",
    hint: "biodegradable",
  },
  {
    id: "de-kompostierbar",
    rule: "generic",
    severity: "check",
    source: "kompostierbar(?:e|er|es|en|em)?",
    hint: "compostable",
  },
  {
    id: "de-biobasiert",
    rule: "generic",
    severity: "likely",
    source: `bio${H}basiert(?:e|er|es|en|em)?`,
  },
  // Recital 10: "bewusst", "nachhaltig", "verantwortungsbewusst".
  {
    id: "de-nachhaltig",
    rule: "generic",
    severity: "likely",
    source: "nachhaltig(?:e|er|es|en|em|keit)?",
    hint: "sustainable",
  },
  {
    id: "de-verantwortung",
    rule: "generic",
    severity: "likely",
    source: "verantwortungs(?:bewusst|voll)(?:e|er|es|en|em)?",
    hint: "sustainable",
  },
];

const FR: GreenClaimPattern[] = [
  {
    id: "fr-future-target",
    rule: "futureClaim",
    severity: "check",
    source:
      `(?:neutralité\\s+carbone|neutre\\s+en\\s+(?:carbone|${CO2})|zéro\\s+émission\\s+nette|` +
      `net\\s+zéro|zéro\\s+net)[^.!?\\n]{0,30}?(?:d${APOS}ici|en|avant)\\s+${YEAR}|(?:d${APOS}ici|` +
      `avant)\\s+${YEAR}[^.!?\\n]{0,30}?(?:neutralité\\s+carbone|neutre\\s+en\\s+(?:carbone|` +
      `${CO2})|zéro\\s+émission\\s+nette|net\\s+zéro)`,
  },
  // Recital 12, French version: neutre pour le climat, certifié neutre en CO2, ...
  {
    id: "fr-neutre",
    rule: "offsetting",
    severity: "likely",
    source:
      `(?:certifiée?s?\\s+)?neutres?\\s+(?:en|pour\\s+le)\\s+(?:carbone|${CO2}|climat)|` +
      `neutralité\\s+(?:carbone|climatique)|(?:carbo|climato)${H}neutres?`,
  },
  {
    id: "fr-bilan",
    rule: "offsetting",
    severity: "likely",
    source: "bilan\\s+carbone\\s+(?:positif|neutre|nul)",
  },
  {
    id: "fr-zero-net",
    rule: "offsetting",
    severity: "likely",
    source: "zéro\\s+net(?:\\s+pour\\s+le\\s+climat)?|net\\s+zéro|zéro\\s+émissions?\\s+nettes?",
  },
  {
    id: "fr-compense",
    rule: "offsetting",
    severity: "likely",
    source: `(?:climatiquement|100\\s?%)\\s+compensée?s?|compensée?s?\\s+(?:en\\s+)?(?:carbone|${CO2})|émissions\\s+compensées`,
  },
  {
    id: "fr-impact-reduit",
    rule: "offsetting",
    severity: "likely",
    source: "impact\\s+(?:réduit\\s+sur\\s+le\\s+climat|climatique\\s+réduit)",
  },
  {
    id: "fr-empreinte",
    rule: "offsetting",
    severity: "likely",
    source: `empreinte\\s+(?:${CO2}|carbone)\\s+(?:limitée|réduite|faible)`,
  },
  {
    id: "fr-label",
    rule: "label",
    severity: "check",
    source:
      `(?:label|logo|sceau|certificat)s?\\s+(?:écologiques?|verts?|environnementa(?:l|ux)` +
      `|durables?|écoresponsables?)(?!\\s+(?:de\\s+l${APOS}\\s?ue|européen))|(?<!eu${H})` +
      `[ée]co${H}label(?!\\s+européen)`,
  },
  {
    id: "fr-sans",
    rule: "legalRequirement",
    severity: "check",
    source: "sans\\s+(?:cfc|pfas|bpa|bisphénol\\s+a|phtalates?|plomb|mercure|cadmium|pvc)",
  },
  {
    id: "fr-recycle",
    rule: "wholeProduct",
    severity: "check",
    source:
      "(?:fabriquée?s?|conçue?s?|réalisée?s?|produite?s?)\\s+(?:avec|à\\s+partir|en|de)\\s+(?:de\\s+|des\\s+)?(?:matériaux|matières|plastiques?|tissus?|fibres?)\\s+recyclée?s?",
  },
  {
    id: "fr-recyclable",
    rule: "wholeProduct",
    severity: "check",
    source: "(?:entièrement|totalement|100\\s?%)\\s*recyclables?",
    hint: "recyclable",
  },
  // Recital 9, French version.
  {
    id: "fr-respectueux",
    rule: "generic",
    severity: "likely",
    source: `respectueu(?:x|se|ses)\\s+(?:de\\s+l${APOS}\\s?environnement|de\\s+la\\s+(?:nature|planète)|du\\s+climat)`,
  },
  {
    id: "fr-ami",
    rule: "generic",
    severity: "likely",
    source: "amie?s?\\s+de\\s+la\\s+(?:nature|planète)",
  },
  {
    id: "fr-ecologique",
    rule: "generic",
    severity: "likely",
    source: "écologiques?|écologiquement",
  },
  {
    id: "fr-bon-pour",
    rule: "generic",
    severity: "likely",
    source: `(?:bon(?:ne)?s?|meilleure?s?)\\s+pour\\s+(?:l${APOS}\\s?environnement|la\\s+planète|le\\s+climat)|favorables?\\s+à\\s+l${APOS}\\s?environnement`,
  },
  {
    id: "fr-faible-carbone",
    rule: "generic",
    severity: "likely",
    source: "à\\s+faible\\s+(?:intensité\\s+de\\s+)?carbone|bas\\s+carbone",
  },
  {
    id: "fr-eco-mode",
    rule: "generic",
    severity: "check",
    source: `(?:éco|eco)${H}(?:mode|programme|réglage)|(?:mode|programme)\\s+(?:éco|eco)`,
    hint: "modeName",
  },
  {
    id: "fr-ecoresponsable",
    rule: "generic",
    severity: "likely",
    source: `éco${H}(?:responsables?|conçue?s?|citoyen(?:ne)?s?)`,
    hint: "sustainable",
  },
  {
    id: "fr-eco",
    rule: "generic",
    severity: "likely",
    source: `(?<!eu${H})[ée]co(?!${H}label)`,
    hint: "organicTerm",
  },
  {
    id: "fr-vert",
    rule: "generic",
    severity: "likely",
    source:
      "(?:choix|alternatives?|solutions?|produits?|emballages?|livraisons?)\\s+verte?s?|plus\\s+verte?s?",
    hint: "greenColour",
  },
  { id: "fr-zero-dechet", rule: "generic", severity: "likely", source: `zéro${H}déchets?` },
  {
    id: "fr-energie",
    rule: "generic",
    severity: "check",
    source: "économes?\\s+en\\s+énergie|basse\\s+consommation",
    hint: "energy",
  },
  {
    id: "fr-biodegradable",
    rule: "generic",
    severity: "likely",
    source: "biodégradables?",
    hint: "biodegradable",
  },
  {
    id: "fr-compostable",
    rule: "generic",
    severity: "check",
    source: "compostables?",
    hint: "compostable",
  },
  { id: "fr-biosource", rule: "generic", severity: "likely", source: "biosourcée?s?" },
  // Recital 10: "respectueux", "durable", "responsable". "Durable" also means long-lasting.
  {
    id: "fr-durable-env",
    rule: "generic",
    severity: "likely",
    source:
      "(?:de\\s+manière|de\\s+façon)\\s+(?:durable|responsable)|développement\\s+durable|(?:mode|consommation|choix|achat)\\s+(?:durable|responsable)",
    hint: "sustainable",
  },
  {
    id: "fr-durable",
    rule: "generic",
    severity: "check",
    source: "durables?",
    hint: "durableAmbiguous",
  },
];

export const GREEN_CLAIM_PATTERNS: Record<GreenClaimLanguage, readonly GreenClaimPattern[]> = {
  en: EN,
  nl: NL,
  de: DE,
  fr: FR,
};

/**
 * Mentions of a public label with recognised excellent environmental
 * performance (EU Ecolabel, Regulation (EC) No 66/2010; recital 10), in every
 * language version of its name. A generic claim next to one becomes a `check`:
 * it may be allowed when the label's criteria cover what the claim says.
 */
export const RECOGNISED_LABEL_SOURCE =
  `eu${H}ecolabel|eu${H}umweltzeichen|eu${H}milieukeur|europe(?:es|se)\\s+ecolabel|` +
  `(?:é|e)colabel\\s+européen|label\\s+écologique\\s+(?:de\\s+l${APOS}ue|européen)|` +
  `energ(?:y|ie)${H}(?:class|klasse)\\s*a(?![\\p{L}\\p{N}+])|classe\\s+(?:énergétique\\s+)` +
  `?a(?![\\p{L}\\p{N}+])`;

/**
 * A specification on the same medium turns a generic claim into a specific one
 * (recital 9). The scanner treats a percentage or a measured quantity in the
 * same sentence as a possible specification and downgrades to `check`.
 */
export const SPECIFICATION_SOURCE = "\\d+(?:[.,]\\d+)?\\s?(?:%|kwh|kg|g\\b|t\\b|tonnes?|tons?)";
