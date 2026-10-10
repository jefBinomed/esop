import type { Segment, Span, Word } from "../domain/timeline.js";

export interface SegmentOptions {
  /** Identifiant de la prise dont viennent silences et mots. */
  readonly takeId: string;
  /** Durée du rush en secondes. */
  readonly duration: number;
  /** Silence minimal pour couper, en secondes. */
  readonly minGap: number;
  /** Respiration conservée de chaque côté d'un segment, en secondes. */
  readonly padding: number;
  /** En dessous de cette durée, un segment est fusionné avec le suivant. */
  readonly minSegment?: number;
}

/**
 * Calibré sur le montage CapCut de « syndrome imposteur » : 0,35 s de silence
 * reproduit son rythme (125 segments contre 132, médiane 2,8 s), 0,12 s de
 * respiration correspond aux 0,17 à 0,3 s conservés après coupe.
 */
export const DEFAULT_SEGMENT_OPTIONS = {
  minGap: 0.35,
  padding: 0.12,
  minSegment: 0.5,
  minSpeech: 0.14,
  maxMergeGap: 0.8,
} as const;

/**
 * Découpe un rush en segments de parole à partir des silences détectés dans
 * l'audio. Les silences plus courts que `minGap` sont ignorés ; les autres
 * deviennent des coupes, avec `padding` de respiration conservé de chaque
 * côté. Les horodatages whisper étant approximatifs, chaque mot est rattaché
 * au segment qu'il recouvre le plus, et à défaut au segment le plus proche :
 * aucun mot n'est perdu. Un segment plus court que `minSegment` (un mot
 * isolé avant une pause courte) est fusionné avec le suivant, silence compris.
 */
export function segmentsFromSilences(
  silences: readonly Span[],
  words: readonly Word[],
  opts: SegmentOptions,
): Segment[] {
  if (opts.padding * 2 >= opts.minGap) {
    throw new RangeError(
      `padding (${opts.padding}) doit rester sous minGap/2 (${opts.minGap / 2}) pour éviter les chevauchements`,
    );
  }

  const cuts = [...silences]
    .filter((s) => ms(s.end - s.start) >= ms(opts.minGap))
    .sort((a, b) => a.start - b.start);

  // `cursor` est la fin brute du silence précédent : il n'y a de parole que
  // si l'intervalle avant le silence suivant dépasse un micro-bruit (clic, souffle).
  const speech: Span[] = [];
  let cursor = 0;
  for (const cut of cuts) {
    if (ms(cut.start - cursor) >= ms(DEFAULT_SEGMENT_OPTIONS.minSpeech)) {
      pushSpeech(speech, cursor - opts.padding, cut.start + opts.padding, opts);
    }
    cursor = Math.max(cursor, cut.end);
  }
  if (ms(opts.duration - cursor) >= ms(DEFAULT_SEGMENT_OPTIONS.minSpeech)) {
    pushSpeech(speech, cursor - opts.padding, opts.duration, opts);
  }
  const merged = mergeShort(speech, opts.minSegment ?? DEFAULT_SEGMENT_OPTIONS.minSegment);

  const attached: Word[][] = merged.map(() => []);
  let lastIndex = 0;
  for (const word of words) {
    const index = resolveSpanIndex(merged, attached, word, lastIndex);
    if (index !== undefined) {
      attached[index]?.push(word);
      lastIndex = index;
    }
  }

  return merged
    .map((span, i) => ({ takeId: opts.takeId, start: span.start, end: span.end, words: attached[i] ?? [] }))
    .filter((segment) => segment.words.length > 0);
}

/**
 * Fusionne chaque intervalle trop court avec le suivant si la pause qui les
 * sépare reste brève (`maxMergeGap`), sinon l'écarte comme souffle isolé.
 */
function mergeShort(spans: readonly Span[], minSegment: number): Span[] {
  const out: Span[] = [];
  let pending: Span | undefined;
  for (const span of spans) {
    const current =
      pending !== undefined && ms(span.start - pending.end) < ms(DEFAULT_SEGMENT_OPTIONS.maxMergeGap)
        ? { start: pending.start, end: span.end }
        : span;
    pending = undefined;
    if (ms(current.end - current.start) < ms(minSegment)) {
      pending = current;
      continue;
    }
    out.push(current);
  }
  if (pending !== undefined) {
    const last = out.pop();
    out.push(last === undefined ? pending : { start: last.start, end: pending.end });
  }
  return out;
}

const END_OF_SENTENCE = /[.?!…]$/;
const STARTS_UPPER = /^\p{Lu}/u;

/**
 * Segment de plus grand recouvrement avec le mot, sinon le plus proche.
 * Quand whisper place le début d'une nouvelle phrase (majuscule ou après une
 * ponctuation finale) dans le silence qui la précède, on le rattache au
 * segment suivant pour ne pas laisser l'amorce sur la fin du plan précédent.
 */
function resolveSpanIndex(
  spans: readonly Span[],
  attached: readonly (readonly Word[])[],
  word: Word,
  lastIndex: number,
): number | undefined {
  let best: number | undefined;
  let bestOverlap = -1;
  let nearest: number | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  spans.forEach((span, i) => {
    if (word.end >= span.start && word.start <= span.end) {
      const overlap = Math.min(span.end, word.end) - Math.max(span.start, word.start);
      if (overlap > bestOverlap) {
        best = i;
        bestOverlap = overlap;
      }
    }
    const distance = word.end <= span.start ? span.start - word.end : word.start - span.end;
    if (distance < nearestDistance) {
      nearest = i;
      nearestDistance = distance;
    }
  });

  const idx = best ?? nearest;
  if (best === undefined && idx !== undefined && idx + 1 < spans.length) {
    const span = spans[idx];
    if (span !== undefined && word.start >= span.end) {
      const prevWords = attached[idx] ?? [];
      const prevLast = prevWords[prevWords.length - 1]?.text ?? "";
      if (idx < lastIndex || END_OF_SENTENCE.test(prevLast) || STARTS_UPPER.test(word.text)) {
        return idx + 1;
      }
    }
  }
  return idx;
}

function pushSpeech(target: Span[], start: number, end: number, opts: SegmentOptions): void {
  const span = { start: round(Math.max(0, start)), end: round(Math.min(opts.duration, end)) };
  if (ms(span.end - span.start) > 0) target.push(span);
}

/**
 * Les comparaisons se font en millisecondes entières : 1.65 - 1.2 vaut
 * 0.44999999999999996 en flottant, ce qui ferait rater un seuil de 0.45.
 */
function ms(seconds: number): number {
  return Math.round(seconds * 1000);
}

/** Arrondi au millième pour éviter les 0.8799999 dans les fichiers générés. */
function round(seconds: number): number {
  return ms(seconds) / 1000;
}
