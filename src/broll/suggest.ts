import type { Episode } from "../domain/episode.js";
import type { Segment } from "../domain/timeline.js";

/** Suggestion automatique d'un asset B-roll sur un segment de parole. */
export interface BrollSuggestion {
  readonly segmentIndex: number;
  readonly takeId: string;
  readonly start: number;
  readonly end: number;
  readonly asset: string;
  readonly matchedToken: string;
}

const VALID_BROLL_EXT = /\.(mp4|mov|webm|png|jpe?g|webp|gif|svg)$/i;
const EXCLUDED_EXT = /\.(mp3|wav|json|md|osp|txt)$/i;
const RESERVED_PREFIX = /^(pxl_|preview\.|final\.|short[-.]|miniature[-.])/i;

const GENERIC_STOP_WORDS = new Set([
  "pexels",
  "unsplash",
  "photo",
  "image",
  "img",
  "icon",
  "logo",
  "large",
  "medium",
  "small",
  "photoroom",
  "dev",
]);

/**
 * Extrait les mots-clés significatifs (normalisés sans accents en minuscules)
 * depuis un nom de fichier d'asset B-roll. Retourne `[]` si le fichier n'est
 * pas un média B-roll éligible.
 */
export function extractAssetTokens(filename: string): readonly string[] {
  const base = fileBasename(filename).trim();
  if (
    base.length === 0 ||
    EXCLUDED_EXT.test(base) ||
    !VALID_BROLL_EXT.test(base) ||
    RESERVED_PREFIX.test(base)
  ) {
    return [];
  }

  const lastDot = base.lastIndexOf(".");
  const stem = lastDot > 0 ? base.slice(0, lastDot) : base;

  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const rawPart of stem.split(/[-_.\s]+/)) {
    const normalized = stripAccents(rawPart).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (
      normalized.length < 3 ||
      /^\d+$/.test(normalized) ||
      GENERIC_STOP_WORDS.has(normalized) ||
      seen.has(normalized)
    ) {
      continue;
    }
    seen.add(normalized);
    tokens.push(normalized);
  }

  return tokens;
}

/**
 * Suggère automatiquement des placements de B-roll en rapprochant les tokens
 * des fichiers d'assets avec les mots prononcés dans chaque segment non coupé.
 */
export function suggestBrolls(
  episode: Episode,
  assetFilenames: readonly string[],
  takeFiles?: readonly string[],
): readonly BrollSuggestion[] {
  const excludedBasenames = new Set<string>();
  for (const take of episode.takes) {
    excludedBasenames.add(fileBasename(take.file).toLowerCase());
  }
  for (const takeFile of takeFiles ?? []) {
    excludedBasenames.add(fileBasename(takeFile).toLowerCase());
  }

  const candidateAssets = assetFilenames
    .map((raw) => fileBasename(raw))
    .filter((base) => !excludedBasenames.has(base.toLowerCase()))
    .map((asset) => ({
      asset,
      tokens: extractAssetTokens(asset),
    }))
    .filter((entry) => entry.tokens.length > 0);

  if (candidateAssets.length === 0) return [];

  const segments = episode.segments ?? [];
  const suggestions: BrollSuggestion[] = [];
  let previousSuggestedAsset: string | undefined;

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    if (segment === undefined || segment.dropped === true) {
      continue;
    }

    if (hasBrollAnnotation(segment)) {
      previousSuggestedAsset = extractExistingBrollAsset(segment);
      continue;
    }

    const segmentWords = extractSegmentWordSet(segment);
    let matched: { asset: string; token: string } | undefined;

    for (const candidate of candidateAssets) {
      if (candidate.asset === previousSuggestedAsset) {
        continue;
      }
      const token = candidate.tokens.find((t) => segmentWords.has(t));
      if (token !== undefined) {
        matched = { asset: candidate.asset, token };
        break;
      }
    }

    if (matched !== undefined) {
      suggestions.push({
        segmentIndex: index,
        takeId: segment.takeId,
        start: segment.start,
        end: segment.end,
        asset: matched.asset,
        matchedToken: matched.token,
      });
      previousSuggestedAsset = matched.asset;
    } else {
      previousSuggestedAsset = undefined;
    }
  }

  return suggestions;
}

function hasBrollAnnotation(segment: Segment): boolean {
  return (segment.annotations ?? []).some((a) => /^\s*\{?\s*b-?roll\s*:/i.test(a));
}

function extractExistingBrollAsset(segment: Segment): string | undefined {
  for (const raw of segment.annotations ?? []) {
    const match = /^\s*\{?\s*b-?roll\s*:\s*([^}]+?)\s*\}?\s*$/i.exec(raw);
    if (match?.[1] !== undefined) {
      return fileBasename(match[1].trim());
    }
  }
  return undefined;
}

function extractSegmentWordSet(segment: Segment): ReadonlySet<string> {
  const rawText = [
    segment.words.map((w) => w.text).join(" "),
    (segment as { readonly text?: string }).text ?? "",
  ].join(" ");
  const normalized = stripAccents(rawText).toLowerCase();
  return new Set(normalized.split(/[^a-z0-9]+/).filter((w) => w.length > 0));
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function fileBasename(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts.at(-1) ?? filePath;
}
