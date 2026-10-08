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
}

/**
 * Calibré sur le montage CapCut de « syndrome imposteur » : 0,35 s de silence
 * reproduit son rythme (125 segments contre 132, médiane 2,8 s), 0,12 s de
 * respiration correspond aux 0,17 à 0,3 s conservés après coupe.
 */
export const DEFAULT_SEGMENT_OPTIONS = { minGap: 0.35, padding: 0.12 } as const;

/**
 * Découpe un rush en segments de parole à partir des silences détectés dans
 * l'audio. Les silences plus courts que `minGap` sont ignorés ; les autres
 * deviennent des coupes, avec `padding` de respiration conservé de chaque
 * côté. Les horodatages whisper étant approximatifs, chaque mot est rattaché
 * au segment qu'il recouvre le plus, et à défaut au segment le plus proche :
 * aucun mot n'est perdu.
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

  const speech: Span[] = [];
  let cursor = 0;
  for (const cut of cuts) {
    pushSpeech(speech, cursor, cut.start + opts.padding, opts);
    cursor = cut.end - opts.padding;
  }
  pushSpeech(speech, cursor, opts.duration, opts);

  const attached: Word[][] = speech.map(() => []);
  for (const word of words) {
    const index = bestSpanIndex(speech, word);
    if (index !== undefined) attached[index]?.push(word);
  }

  return speech
    .map((span, i) => ({ takeId: opts.takeId, start: span.start, end: span.end, words: attached[i] ?? [] }))
    .filter((segment) => segment.words.length > 0);
}

/** Segment de plus grand recouvrement avec le mot, sinon le plus proche. */
function bestSpanIndex(spans: readonly Span[], word: Word): number | undefined {
  let best: number | undefined;
  let bestOverlap = 0;
  let nearest: number | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  spans.forEach((span, i) => {
    const overlap = Math.min(span.end, word.end) - Math.max(span.start, word.start);
    if (overlap > bestOverlap) {
      best = i;
      bestOverlap = overlap;
    }
    const distance = word.end <= span.start ? span.start - word.end : word.start - span.end;
    if (distance < nearestDistance) {
      nearest = i;
      nearestDistance = distance;
    }
  });
  return best ?? nearest;
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
