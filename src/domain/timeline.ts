/**
 * Modèle pivot du montage. Tout est en secondes, indépendant de tout moteur
 * de rendu. Les modules `cut/`, `zoom/` et `montage/` ne manipulent que ça.
 */

/** Un mot transcrit, avec ses bornes dans le rush d'origine. */
export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/** Cadrage d'un segment : large ou serré. */
export type Framing = "large" | "serré";

/**
 * Une prise : un fichier rush nommé `NN-chapitre-prise.version.mp4`.
 * `chapterIndex` vient du préfixe `NN`, `take` et `version` du suffixe.
 */
export interface Take {
  readonly id: string;
  readonly file: string;
  readonly chapterIndex: number;
  readonly chapter: string;
  readonly take: number;
  readonly version: number;
  readonly duration: number;
  readonly words: readonly Word[];
}

/** Un intervalle de temps dans un rush, bornes incluses en secondes. */
export interface Span {
  readonly start: number;
  readonly end: number;
}

/**
 * Un segment de parole conservé dans le montage. `start`/`end` sont dans le
 * repère du rush ; la position dans la vidéo finale se déduit de l'ordre.
 */
export interface Segment extends Span {
  readonly takeId: string;
  readonly words: readonly Word[];
  readonly framing?: Framing;
  readonly dropped?: boolean;
  readonly reason?: string;
}

export function spanDuration(span: Span): number {
  return span.end - span.start;
}
