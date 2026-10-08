import type { Segment, Word } from "../domain/timeline.js";

export interface SilenceOptions {
  /** Identifiant de la prise dont viennent les mots. */
  readonly takeId: string;
  /** Durée du rush en secondes, pour borner la marge de fin. */
  readonly duration: number;
  /** Silence minimal entre deux mots pour couper, en secondes. */
  readonly minGap: number;
  /** Respiration conservée de chaque côté d'un segment, en secondes. */
  readonly padding: number;
}

/** Valeurs calibrées sur les montages existants (0,17 à 0,3 s conservés). */
export const DEFAULT_SILENCE_OPTIONS = { minGap: 0.45, padding: 0.12 } as const;

/**
 * Regroupe les mots en segments de parole : un nouveau segment démarre dès
 * que le silence avant un mot atteint `minGap`. Chaque segment reçoit une
 * marge `padding` de chaque côté, bornée par le rush.
 */
export function segmentsFromWords(words: readonly Word[], opts: SilenceOptions): Segment[] {
  if (opts.padding * 2 >= opts.minGap) {
    throw new RangeError(
      `padding (${opts.padding}) doit rester sous minGap/2 (${opts.minGap / 2}) pour éviter les chevauchements`,
    );
  }

  const sorted = [...words].sort((a, b) => a.start - b.start);
  const groups: Word[][] = [];
  let current: Word[] = [];

  for (const word of sorted) {
    const previous = current.at(-1);
    if (previous !== undefined && ms(word.start - previous.end) >= ms(opts.minGap)) {
      groups.push(current);
      current = [];
    }
    current.push(word);
  }
  if (current.length > 0) groups.push(current);

  return groups.map((group) => toSegment(group, opts));
}

function toSegment(group: readonly Word[], opts: SilenceOptions): Segment {
  const first = group[0];
  const last = group.at(-1);
  if (first === undefined || last === undefined) throw new Error("groupe vide");
  return {
    takeId: opts.takeId,
    start: round(Math.max(0, first.start - opts.padding)),
    end: round(Math.min(opts.duration, last.end + opts.padding)),
    words: group,
  };
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
