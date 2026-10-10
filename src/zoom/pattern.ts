import type { Framing, Segment } from "../domain/timeline.js";

export interface PatternOptions {
  /** En dessous de cette durée, un segment garde le cadrage précédent. */
  readonly minDurationForChange: number;
}

export const DEFAULT_PATTERN_OPTIONS: PatternOptions = { minDurationForChange: 1.0 };

/**
 * Attribue un cadrage à chaque segment non coupé : alternance large/serré à
 * chaque coupe, premier segment d'une prise toujours en large, et pas de
 * changement sur un segment trop court pour que l'œil le lise. Un cadrage
 * déjà posé à la main (dans montage.md) est respecté et relance l'alternance.
 */
export function applyFramingPattern(
  segments: readonly Segment[],
  opts: PatternOptions = DEFAULT_PATTERN_OPTIONS,
): Segment[] {
  let previousTake: string | undefined;
  let previousChapter: number | undefined;
  let previous: Framing | undefined;

  return segments.map((segment) => {
    if (segment.dropped === true) return segment;

    let framing: Framing;
    if (segment.framing !== undefined) {
      framing = segment.framing;
    } else if (
      segment.takeId !== previousTake ||
      segment.chapterIndex !== previousChapter ||
      previous === undefined
    ) {
      framing = "large";
    } else if (segment.end - segment.start < opts.minDurationForChange) {
      framing = previous;
    } else {
      framing = previous === "large" ? "serré" : "large";
    }

    previousTake = segment.takeId;
    previousChapter = segment.chapterIndex;
    previous = framing;
    return { ...segment, framing };
  });
}

