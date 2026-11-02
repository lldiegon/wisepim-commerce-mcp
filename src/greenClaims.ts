/**
 * Green claims scanner: finds phrases in product copy that Directive (EU)
 * 2024/825 restricts, using the per-language term lists in
 * ./claimTerms.ts. Pure and synchronous, so the
 * free tool runs entirely locally.
 *
 * A finding is a pointer for review, not a legal verdict: the scanner cannot
 * see logos, images or the proof a trader holds.
 */
import {
  GREEN_CLAIM_PATTERNS,
  GREEN_CLAIM_RULES,
  RECOGNISED_LABEL_SOURCE,
  SPECIFICATION_SOURCE,
  type GreenClaimHint,
  type GreenClaimLanguage,
  type GreenClaimPattern,
  type GreenClaimRule,
  type GreenClaimSeverity,
} from "./claimTerms";

export interface GreenClaimFinding {
  patternId: string;
  rule: GreenClaimRule;
  severity: GreenClaimSeverity;
  hint?: GreenClaimHint;
  /** Character offsets in the scanned text, end exclusive. */
  start: number;
  end: number;
  /** The matched phrase as written. */
  text: string;
  /** A percentage or measured quantity sits in the same sentence (recital 9). */
  specified: boolean;
  /** The EU Ecolabel or energy class A is named in the same sentence (recital 10). */
  recognisedLabel: boolean;
}

export interface ScanOptions {
  /** Brand or product names to skip, matched case-insensitively. */
  ignore?: readonly string[];
}

/** Longest text the scanner reads per field; longer input is cut, not rejected. */
export const MAX_SCAN_LENGTH = 20_000;

const BOUNDARY_BEFORE = "(?<![\\p{L}\\p{N}])";
const BOUNDARY_AFTER = "(?![\\p{L}\\p{N}])";

interface CompiledPattern {
  pattern: GreenClaimPattern;
  regex: RegExp;
  priority: number;
}

function compile(language: GreenClaimLanguage): CompiledPattern[] {
  return GREEN_CLAIM_PATTERNS[language].map((pattern) => ({
    pattern,
    regex: new RegExp(`${BOUNDARY_BEFORE}(?:${pattern.source})${BOUNDARY_AFTER}`, "giu"),
    priority: GREEN_CLAIM_RULES.indexOf(pattern.rule),
  }));
}

/** Compiled once at module load: the term lists are static and hold no user data. */
const COMPILED: Record<GreenClaimLanguage, CompiledPattern[]> = {
  en: compile("en"),
  nl: compile("nl"),
  de: compile("de"),
  fr: compile("fr"),
};

const RECOGNISED_LABEL = new RegExp(`${BOUNDARY_BEFORE}(?:${RECOGNISED_LABEL_SOURCE})`, "giu");
const SPECIFICATION = new RegExp(SPECIFICATION_SOURCE, "iu");

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function spansOf(regex: RegExp, text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  regex.lastIndex = 0;
  for (const match of text.matchAll(regex)) {
    if (match[0].length === 0) continue;
    spans.push([match.index, match.index + match[0].length]);
  }
  return spans;
}

function overlaps(
  start: number,
  end: number,
  spans: ReadonlyArray<readonly [number, number]>,
): boolean {
  return spans.some(([s, e]) => start < e && s < end);
}

/** Sentence bounds around an offset: split on . ! ? ; and line breaks. */
function sentenceAround(text: string, start: number, end: number): string {
  const isStop = (char: string) =>
    char === "\n" || char === "!" || char === "?" || char === ";" || char === ".";
  let from = start;
  while (from > 0 && !isStopAt(text, from - 1, isStop)) from -= 1;
  let to = end;
  while (to < text.length && !isStopAt(text, to, isStop)) to += 1;
  return text.slice(from, to);
}

/** A period between two digits ("2.5 kg") does not end a sentence. */
function isStopAt(text: string, index: number, isStop: (char: string) => boolean): boolean {
  const char = text[index];
  if (!isStop(char)) return false;
  if (char === "." && /\d/.test(text[index - 1] ?? "") && /\d/.test(text[index + 1] ?? ""))
    return false;
  return true;
}

/**
 * The part of a field the scanner reads: the first MAX_SCAN_LENGTH characters,
 * pulled back to the last whitespace when the cut falls inside a word, so a
 * truncated "eco-friendl" is not reported as "eco".
 */
function scannedPart(rawText: string): string {
  if (rawText.length <= MAX_SCAN_LENGTH) return rawText;
  const cut = rawText.slice(0, MAX_SCAN_LENGTH);
  if (/\s/u.test(rawText[MAX_SCAN_LENGTH])) return cut;
  const lastSpace = cut.search(/\s\S*$/u);
  return lastSpace === -1 ? "" : cut.slice(0, lastSpace);
}

/**
 * Every flagged phrase in `text`, in reading order and never overlapping.
 * When two patterns cover the same words, the stricter rule wins
 * (GREEN_CLAIM_RULES order), then the longer phrase.
 */
export function scanGreenClaims(
  rawText: string,
  language: GreenClaimLanguage,
  options: ScanOptions = {},
): GreenClaimFinding[] {
  const text = scannedPart(rawText);
  if (!text.trim()) return [];

  const ignored = (options.ignore ?? [])
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
    .flatMap((term) =>
      spansOf(new RegExp(`${BOUNDARY_BEFORE}${escapeRegex(term)}${BOUNDARY_AFTER}`, "giu"), text),
    );
  const recognisedSpans = spansOf(RECOGNISED_LABEL, text);

  const candidates: Array<{ compiled: CompiledPattern; start: number; end: number; text: string }> =
    [];
  for (const compiled of COMPILED[language]) {
    compiled.regex.lastIndex = 0;
    for (const match of text.matchAll(compiled.regex)) {
      const matched = match[0];
      if (!matched.trim()) continue;
      candidates.push({
        compiled,
        start: match.index,
        end: match.index + matched.length,
        text: matched,
      });
    }
  }

  candidates.sort(
    (a, b) =>
      a.compiled.priority - b.compiled.priority ||
      b.end - b.start - (a.end - a.start) ||
      a.start - b.start,
  );

  const taken: Array<[number, number]> = [];
  const findings: GreenClaimFinding[] = [];
  for (const candidate of candidates) {
    const { start, end } = candidate;
    if (overlaps(start, end, taken)) continue;
    // Words inside a public label's own name ("label écologique de l'UE") are not a claim.
    if (overlaps(start, end, recognisedSpans)) continue;
    if (overlaps(start, end, ignored)) continue;
    taken.push([start, end]);

    const { pattern } = candidate.compiled;
    const sentence = sentenceAround(text, start, end);
    const withoutMatch = sentence.replace(candidate.text, " ");
    const specified = SPECIFICATION.test(withoutMatch);
    RECOGNISED_LABEL.lastIndex = 0;
    const recognisedLabel = RECOGNISED_LABEL.test(sentence);
    RECOGNISED_LABEL.lastIndex = 0;

    // A generic claim with a specification or a recognised label beside it may
    // be lawful (recitals 9 and 10): flag it for review instead of as likely.
    const softened = pattern.rule === "generic" && (specified || recognisedLabel);
    findings.push({
      patternId: pattern.id,
      rule: pattern.rule,
      severity: softened ? "check" : pattern.severity,
      ...(pattern.hint ? { hint: pattern.hint } : {}),
      start,
      end,
      text: candidate.text,
      specified,
      recognisedLabel,
    });
  }

  return findings.sort((a, b) => a.start - b.start);
}

export const GREEN_CLAIM_FIELDS = ["title", "description", "bullets"] as const;
export type GreenClaimField = (typeof GREEN_CLAIM_FIELDS)[number];
export type ProductCopy = Record<GreenClaimField, string>;

export interface ProductCopyScan {
  fields: Record<GreenClaimField, GreenClaimFinding[]>;
  total: number;
  likely: number;
  check: number;
  byRule: Record<GreenClaimRule, number>;
}

/** Scans title, description and bullets separately and totals the findings. */
export function scanProductCopy(
  copy: ProductCopy,
  language: GreenClaimLanguage,
  options: ScanOptions = {},
): ProductCopyScan {
  const fields = {
    title: scanGreenClaims(copy.title, language, options),
    description: scanGreenClaims(copy.description, language, options),
    bullets: scanGreenClaims(copy.bullets, language, options),
  };
  const all = [...fields.title, ...fields.description, ...fields.bullets];
  const byRule = Object.fromEntries(GREEN_CLAIM_RULES.map((rule) => [rule, 0])) as Record<
    GreenClaimRule,
    number
  >;
  for (const finding of all) byRule[finding.rule] += 1;
  return {
    fields,
    total: all.length,
    likely: all.filter((finding) => finding.severity === "likely").length,
    check: all.filter((finding) => finding.severity === "check").length,
    byRule,
  };
}

export interface HighlightSegment {
  text: string;
  /** 1-based finding number within the field, when this segment is flagged. */
  index?: number;
  finding?: GreenClaimFinding;
}

/** Splits text into plain and flagged segments for highlighting. */
export function highlightSegments(
  text: string,
  findings: readonly GreenClaimFinding[],
): HighlightSegment[] {
  const source = text.slice(0, MAX_SCAN_LENGTH);
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  findings.forEach((finding, i) => {
    if (finding.start > cursor) segments.push({ text: source.slice(cursor, finding.start) });
    segments.push({ text: source.slice(finding.start, finding.end), index: i + 1, finding });
    cursor = finding.end;
  });
  if (cursor < source.length) segments.push({ text: source.slice(cursor) });
  return segments;
}

/** Parses the comma or line separated ignore list from the form. */
export function parseIgnoreList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);
}
