import type { Segment, Span, Take } from "./timeline.js";

/**
 * Un épisode ingéré : ses prises transcrites, les silences détectés par
 * prise, et les segments une fois la coupe faite. C'est le contenu de
 * `episode.json`, la forme machine dont `montage.md` est la vue éditable.
 */
export interface Episode {
  readonly name: string;
  /** Dossier des rushs, absolu. */
  readonly sourceDir: string;
  readonly takes: readonly Take[];
  readonly silences: Readonly<Record<string, readonly Span[]>>;
  readonly segments?: readonly Segment[];
}

/** Ordre de montage des prises : par chapitre, puis numéro de prise. */
export function sortTakes(takes: readonly Take[]): Take[] {
  return [...takes].sort((a, b) => a.chapterIndex - b.chapterIndex || a.take - b.take || a.version - b.version);
}
