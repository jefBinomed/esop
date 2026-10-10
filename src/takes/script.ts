import type { Segment, Take } from "../domain/timeline.js";

export interface ScriptChapter {
  readonly index: number;
  readonly title: string;
  readonly texts: readonly string[];
  readonly keywords: readonly string[];
}

export interface EpisodeScript {
  readonly title: string;
  readonly chapters: readonly ScriptChapter[];
}

const TITLE = /^#\s+(.+)$/;
const CHAPTER = /^##\s+(\d+)\s*[—–-]\s*(.+)$/;
const TEXT_DIRECTIVE = /^texte\s*:\s*(.+)$/i;
const WORD_DIRECTIVE = /^mot\s*:\s*(.+)$/i;

/**
 * Lit `script.md` : titre de l'épisode, chapitres numérotés, et directives
 * `texte:` / `mot:` qui servent à évaluer les prises et pré-annoter `montage.md`.
 */
export function parseScript(markdown: string): EpisodeScript {
  let title = "";
  const chapters: { index: number; title: string; texts: string[]; keywords: string[] }[] = [];

  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    const titleMatch = TITLE.exec(line);
    if (titleMatch?.[1] !== undefined && title === "") {
      title = titleMatch[1].trim();
      continue;
    }
    const chapterMatch = CHAPTER.exec(line);
    if (chapterMatch?.[1] !== undefined && chapterMatch[2] !== undefined) {
      chapters.push({
        index: Number(chapterMatch[1]),
        title: chapterMatch[2].trim(),
        texts: [],
        keywords: [],
      });
      continue;
    }
    const current = chapters.at(-1);
    if (current === undefined) continue;

    const textMatch = TEXT_DIRECTIVE.exec(line);
    if (textMatch?.[1] !== undefined) {
      current.texts.push(textMatch[1].trim());
      continue;
    }
    const wordMatch = WORD_DIRECTIVE.exec(line);
    if (wordMatch?.[1] !== undefined) {
      current.keywords.push(wordMatch[1].trim());
    }
  }
  return { title, chapters };
}

/**
 * Rattache les `texte:` et `mot:` d'un `script.md` au premier segment non coupé
 * du chapitre qui prononce les termes correspondants.
 */
export function applyScriptAnnotations(
  segments: readonly Segment[],
  takes: readonly Take[],
  script: EpisodeScript,
): Segment[] {
  const takesById = new Map(takes.map((t) => [t.id, t]));
  const chaptersByIndex = new Map(script.chapters.map((c) => [c.index, c]));
  const placed = new Set<string>();

  return segments.map((segment) => {
    if (segment.dropped === true) return segment;
    const take = takesById.get(segment.takeId);
    const chapter = take === undefined ? undefined : chaptersByIndex.get(take.chapterIndex);
    if (chapter === undefined) return segment;

    const tokens = new Set(segment.words.flatMap((w) => normalizeTokens(w.text)));
    const added: string[] = [...(segment.annotations ?? [])];

    for (const text of chapter.texts) {
      const key = `${chapter.index}:texte:${text}`;
      if (placed.has(key)) continue;
      if (matchesPoint(tokens, text)) {
        placed.add(key);
        const tag = `texte: ${text}`;
        if (!added.includes(tag)) added.push(tag);
      }
    }

    for (const keyword of chapter.keywords) {
      const key = `${chapter.index}:mot:${keyword}`;
      if (placed.has(key)) continue;
      if (matchesPoint(tokens, keyword)) {
        placed.add(key);
        const tag = `mot: ${keyword}`;
        if (!added.includes(tag)) added.push(tag);
      }
    }

    return added.length > 0 ? { ...segment, annotations: added } : segment;
  });
}

/** Vérifie si les mots significatifs d'un point du script apparaissent dans l'ensemble de tokens. */
export function matchesPoint(tokens: ReadonlySet<string>, point: string): boolean {
  const required = significantTokens(point);
  return required.length > 0 && required.every((t) => tokens.has(t));
}

const STOP_WORDS = new Set(["le", "la", "les", "un", "une", "des", "du", "de", "et", "ou", "au", "aux", "en", "à"]);

export function significantTokens(text: string): string[] {
  const all = normalizeTokens(text).filter((t) => !/^\d+$/.test(t));
  const filtered = all.filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  return filtered.length > 0 ? filtered : all;
}

export function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0);
}
