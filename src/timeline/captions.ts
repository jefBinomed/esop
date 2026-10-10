import type { TalkShot, TimelineWord } from "./compile.js";

/** Alias d'un mot horodaté dans la timeline finale. */
export type TimedWord = TimelineWord;

/** Page de sous-titre (jusqu'à 3 mots affichés simultanément). */
export interface CaptionPage {
  readonly start: number;
  readonly end: number;
  readonly startFrame: number;
  readonly durationInFrames: number;
  readonly words: readonly TimedWord[];
}

/** Options de découpage des sous-titres mot à mot. */
export interface CaptionOptions {
  /** Cadence d'images par seconde (par défaut `30`). */
  readonly fps?: number;
  /** Nombre maximal de mots par page (par défaut `3`). */
  readonly maxWordsPerPage?: number;
  /** Écart maximal en secondes entre deux mots d'une même page (par défaut `0.4`). */
  readonly maxGapSeconds?: number;
}

export const DEFAULT_CAPTION_OPTIONS = {
  fps: 30,
  maxWordsPerPage: 3,
  maxGapSeconds: 0.4,
} as const;

const STRONG_PUNCTUATION = /[.?!:;]$/;

/**
 * Découpe les mots horodatés des plans de parole (`TalkShot[]`) en pages de
 * sous-titres courtes (3 mots au plus par défaut), en coupant également sur
 * les silences internes (`> maxGapSeconds`) et les ponctuations fortes.
 */
export function buildCaptionPages(
  shots: readonly TalkShot[],
  opts?: CaptionOptions,
): readonly CaptionPage[] {
  const fps = opts?.fps ?? DEFAULT_CAPTION_OPTIONS.fps;
  const maxWordsPerPage = Math.max(1, opts?.maxWordsPerPage ?? DEFAULT_CAPTION_OPTIONS.maxWordsPerPage);
  const maxGapSeconds = opts?.maxGapSeconds ?? DEFAULT_CAPTION_OPTIONS.maxGapSeconds;

  const pages: CaptionPage[] = [];

  const flushPage = (pageWords: readonly TimedWord[]): void => {
    const first = pageWords[0];
    const last = pageWords[pageWords.length - 1];
    if (first === undefined || last === undefined) return;
    const start = first.timelineStart;
    const end = last.timelineEnd;
    const startFrame = Math.round(start * fps);
    const durationInFrames = Math.max(1, Math.round((end - start) * fps));
    pages.push({
      start,
      end,
      startFrame,
      durationInFrames,
      words: pageWords,
    });
  };

  for (const shot of shots) {
    if (shot.words.length === 0) continue;

    let currentWords: TimedWord[] = [];

    for (const word of shot.words) {
      const prevWord = currentWords[currentWords.length - 1];
      if (prevWord !== undefined && word.timelineStart - prevWord.timelineEnd > maxGapSeconds) {
        flushPage(currentWords);
        currentWords = [];
      }

      currentWords.push(word);

      if (
        currentWords.length >= maxWordsPerPage ||
        STRONG_PUNCTUATION.test(word.text.trim())
      ) {
        flushPage(currentWords);
        currentWords = [];
      }
    }

    if (currentWords.length > 0) {
      flushPage(currentWords);
    }
  }

  return pages;
}

/**
 * Détermine l'indice du mot actif dans une page de sous-titre à l'instant `currentTime`.
 */
export function activeWordIndex(words: readonly TimedWord[], currentTime: number): number {
  const exactIndex = words.findIndex(
    (w) => currentTime >= w.timelineStart && currentTime <= w.timelineEnd,
  );
  if (exactIndex !== -1) {
    return exactIndex;
  }

  let fallbackIndex = 0;
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    if (word !== undefined && word.timelineStart <= currentTime) {
      fallbackIndex = i;
    }
  }
  return fallbackIndex;
}

