import type { Span } from "../domain/timeline.js";

/** Paramètres du ducking musical sous la voix. */
export interface DuckingOptions {
  /** Volume plein hors parole (par défaut `1.0`). */
  readonly fullVolume?: number;
  /** Volume atténué pendant la parole (par défaut `0.2`, env. −14 dB). */
  readonly duckedVolume?: number;
  /** Durée de la rampe de transition en secondes (par défaut `0.25` s). */
  readonly fadeDuration?: number;
}

export const DEFAULT_DUCKING_OPTIONS = {
  fullVolume: 1.0,
  duckedVolume: 0.2,
  fadeDuration: 0.25,
} as const;

/**
 * Calcule le volume de la musique de fond à l'instant `timeInSeconds`.
 *
 * - Hors parole : `fullVolume` (`1.0` par défaut).
 * - Pendant un segment de parole : `duckedVolume` (`0.2` par défaut).
 * - Aux abords d'un segment de parole : rampe linéaire de durée `fadeDuration`
 *   en amont (`[start - fadeDuration, start]`) et en aval (`[end, end + fadeDuration]`).
 * - Deux segments séparés par moins de `2 * fadeDuration` sont fusionnés pour
 *   éviter toute remontée brusque du volume sur une simple coupe entre deux plans.
 */
export function musicVolumeAt(
  timeInSeconds: number,
  shots: readonly Pick<Span, "start" | "end">[],
  opts?: DuckingOptions,
): number {
  const fullVolume = opts?.fullVolume ?? DEFAULT_DUCKING_OPTIONS.fullVolume;
  const duckedVolume = opts?.duckedVolume ?? DEFAULT_DUCKING_OPTIONS.duckedVolume;
  const fadeDuration = Math.max(0, opts?.fadeDuration ?? DEFAULT_DUCKING_OPTIONS.fadeDuration);

  const merged = mergeSpeechSpans(shots, fadeDuration);
  if (merged.length === 0) return fullVolume;

  for (const span of merged) {
    if (timeInSeconds >= span.start && timeInSeconds <= span.end) {
      return duckedVolume;
    }
    if (fadeDuration > 0) {
      const fadeInStart = span.start - fadeDuration;
      if (timeInSeconds > fadeInStart && timeInSeconds < span.start) {
        const progress = (timeInSeconds - fadeInStart) / fadeDuration;
        return fullVolume + progress * (duckedVolume - fullVolume);
      }
      const fadeOutEnd = span.end + fadeDuration;
      if (timeInSeconds > span.end && timeInSeconds < fadeOutEnd) {
        const progress = (timeInSeconds - span.end) / fadeDuration;
        return duckedVolume + progress * (fullVolume - duckedVolume);
      }
    }
  }

  return fullVolume;
}

/**
 * Fusionne les intervalles de parole qui se chevauchent ou qui sont séparés
 * par au plus `2 * fadeDuration`.
 */
export function mergeSpeechSpans(
  shots: readonly Pick<Span, "start" | "end">[],
  fadeDuration: number = DEFAULT_DUCKING_OPTIONS.fadeDuration,
): Span[] {
  const valid = shots
    .filter((s) => s.end > s.start)
    .map((s) => ({ start: s.start, end: s.end }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: { start: number; end: number }[] = [];
  const minGap = 2 * Math.max(0, fadeDuration);

  for (const span of valid) {
    const previous = merged.at(-1);
    if (previous !== undefined && span.start - previous.end <= minGap) {
      previous.end = Math.max(previous.end, span.end);
    } else {
      merged.push({ start: span.start, end: span.end });
    }
  }

  return merged;
}
