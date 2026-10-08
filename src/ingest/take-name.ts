import type { Take } from "../domain/timeline.js";

export type TakeName = Pick<Take, "chapterIndex" | "chapter" | "take" | "version">;

/**
 * Convention de nommage des prises : `NN-chapitre-prise[.version].ext`.
 * Le chapitre peut contenir des tirets (`04-arme-secrete-2.3`), la version
 * est séparée par un point ou un tiret (`2-choc-4-2`) et vaut 1 si absente.
 */
const TAKE_NAME = /^(\d+)-(.+?)-(\d+)(?:[.-](\d+))?\.(?:mp4|mov)$/i;

export function parseTakeName(fileName: string): TakeName | undefined {
  const match = TAKE_NAME.exec(fileName);
  if (match === null) return undefined;
  const [, chapterIndex, chapter, take, version] = match;
  if (chapterIndex === undefined || chapter === undefined || take === undefined) return undefined;
  return {
    chapterIndex: Number(chapterIndex),
    chapter,
    take: Number(take),
    version: version === undefined ? 1 : Number(version),
  };
}
