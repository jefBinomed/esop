import type { Episode } from "../domain/episode.js";
import type { Framing, Span, Take, Word } from "../domain/timeline.js";

/** Paramètres de compilation d'un épisode vers la timeline Remotion. */
export interface CompileOptions {
  /** Cadence d'images par seconde (par défaut `30`). */
  readonly fps?: number;
  /** Largeur de la composition en pixels (par défaut `1920`). */
  readonly width?: number;
  /** Hauteur de la composition en pixels (par défaut `1080`). */
  readonly height?: number;
  /**
   * Durée d'une carte de chapitre en secondes (par défaut `2.0` s lorsque
   * l'épisode comporte des chapitres nommés `chapterIndex > 0` ou que
   * `includeChapterCards === true`, sinon `0`).
   */
  readonly chapterDuration?: number;
  /** Force l'insertion (ou la suppression) des cartes de chapitre. */
  readonly includeChapterCards?: boolean;
  /** Durée par défaut d'un mot-clé animé en secondes (par défaut `1.2` s). */
  readonly keywordDuration?: number;
}

export const DEFAULT_COMPILE_OPTIONS = {
  fps: 30,
  width: 1920,
  height: 1080,
  chapterDuration: 2.0,
  keywordDuration: 1.2,
} as const;

/** Mot horodaté dans le rush d'origine et recalé dans la timeline finale. */
export interface TimelineWord extends Word {
  readonly timelineStart: number;
  readonly timelineEnd: number;
}

/** Carte de chapitre insérée à chaque changement de `take.chapterIndex`. */
export interface ChapterCue extends Span {
  readonly chapterIndex: number;
  readonly title: string;
  readonly startFrame: number;
  readonly durationInFrames: number;
}

/** Plan de parole (segment conservé) positionné dans la vidéo finale. */
export interface TalkShot extends Span {
  readonly takeId: string;
  readonly file: string;
  readonly trimBefore: number;
  readonly trimAfter: number;
  readonly startFrame: number;
  readonly durationInFrames: number;
  readonly framing: Framing;
  readonly words: readonly TimelineWord[];
}

/** Calque B-roll (`{broll: <asset>}`) aligné sur un plan de parole. */
export interface BrollCue extends Span {
  readonly takeId: string;
  readonly asset: string;
  readonly isVideo: boolean;
  readonly startFrame: number;
  readonly durationInFrames: number;
}

/** Calque de texte à l'écran (`{texte: <label>}`) aligné sur un plan de parole. */
export interface TextCue extends Span {
  readonly takeId: string;
  readonly text: string;
  readonly startFrame: number;
  readonly durationInFrames: number;
}

/** Calque de mot-clé animé (`{mot: <mot>}`) synchronisé sur la prononciation. */
export interface KeywordCue extends Span {
  readonly takeId: string;
  readonly word: string;
  readonly startFrame: number;
  readonly durationInFrames: number;
}

/** Timeline séquentielle complète prête pour les calques Remotion. */
export interface CompiledTimeline {
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly duration: number;
  readonly durationInFrames: number;
  readonly chapters: readonly ChapterCue[];
  readonly shots: readonly TalkShot[];
  readonly brolls: readonly BrollCue[];
  readonly texts: readonly TextCue[];
  readonly keywords: readonly KeywordCue[];
}

const VIDEO_EXT = /\.(mp4|mov|webm)$/i;
const ANNOTATION_KV = /^\{?\s*([^:}]+?)\s*:\s*(.+?)\s*\}?$/;

/**
 * Compile un `Episode` (prises et segments non coupés) en une timeline
 * séquentielle exprimée en secondes et en frames pour Remotion.
 */
export function compileTimeline(episode: Episode, opts?: CompileOptions): CompiledTimeline {
  const fps = opts?.fps ?? DEFAULT_COMPILE_OPTIONS.fps;
  const width = opts?.width ?? DEFAULT_COMPILE_OPTIONS.width;
  const height = opts?.height ?? DEFAULT_COMPILE_OPTIONS.height;
  const keywordDuration = opts?.keywordDuration ?? DEFAULT_COMPILE_OPTIONS.keywordDuration;

  const takesById = new Map<string, Take>(episode.takes.map((t) => [t.id, t]));
  const keptSegments = (episode.segments ?? []).filter((s) => s.dropped !== true);

  const hasNamedChapters =
    episode.takes.some((t) => t.chapterIndex > 0) ||
    keptSegments.some((s) => (s.chapterIndex ?? takesById.get(s.takeId)?.chapterIndex ?? 0) > 0);
  const useChapterCards = opts?.includeChapterCards ?? hasNamedChapters;
  const chapterDuration =
    opts?.chapterDuration !== undefined
      ? opts.chapterDuration
      : useChapterCards
        ? DEFAULT_COMPILE_OPTIONS.chapterDuration
        : 0;

  const chapters: ChapterCue[] = [];
  const shots: TalkShot[] = [];
  const brolls: BrollCue[] = [];
  const texts: TextCue[] = [];
  const keywords: KeywordCue[] = [];

  let cursor = 0;
  let currentChapterIndex: number | undefined;

  for (const segment of keptSegments) {
    const take = takesById.get(segment.takeId);
    if (take === undefined) {
      throw new Error(`prise inconnue : ${segment.takeId}`);
    }

    const chapterIndex = segment.chapterIndex ?? take.chapterIndex;
    const chapterTitle = segment.chapter ?? take.chapter;

    if (chapterIndex !== currentChapterIndex) {
      currentChapterIndex = chapterIndex;
      const shouldInsertCard =
        chapterDuration > 0 &&
        opts?.includeChapterCards !== false &&
        (chapterIndex > 0 || opts?.includeChapterCards === true || segment.chapterIndex === undefined);
      if (shouldInsertCard) {
        const chapterStart = cursor;
        const chapterEnd = roundTime(cursor + chapterDuration);
        const startFrame = Math.round(chapterStart * fps);
        const endFrame = Math.round(chapterEnd * fps);
        chapters.push({
          chapterIndex,
          title: chapterTitle,
          start: chapterStart,
          end: chapterEnd,
          startFrame,
          durationInFrames: Math.max(1, endFrame - startFrame),
        });
        cursor = chapterEnd;
      }
    }

    const segDuration = Math.max(0, segment.end - segment.start);
    const shotStart = cursor;
    const shotEnd = roundTime(cursor + segDuration);
    const shotStartFrame = Math.round(shotStart * fps);
    const shotEndFrame = Math.round(shotEnd * fps);
    const shotDurationInFrames = Math.max(1, shotEndFrame - shotStartFrame);

    const words: TimelineWord[] = segment.words.map((w) => {
      const relStart = Math.max(0, w.start - segment.start);
      const relEnd = Math.max(relStart, w.end - segment.start);
      return {
        text: w.text,
        start: w.start,
        end: w.end,
        timelineStart: roundTime(Math.min(shotEnd, shotStart + relStart)),
        timelineEnd: roundTime(Math.min(shotEnd, shotStart + relEnd)),
      };
    });

    const shot: TalkShot = {
      takeId: segment.takeId,
      file: take.file,
      trimBefore: segment.start,
      trimAfter: segment.end,
      start: shotStart,
      end: shotEnd,
      startFrame: shotStartFrame,
      durationInFrames: shotDurationInFrames,
      framing: segment.framing ?? "large",
      words,
    };
    shots.push(shot);

    for (const rawAnnotation of segment.annotations ?? []) {
      const parsed = ANNOTATION_KV.exec(rawAnnotation.trim());
      if (parsed === null) continue;
      const key = parsed[1]?.trim().toLowerCase();
      const value = parsed[2]?.trim();
      if (!key || !value) continue;

      if (key === "broll" || key === "b-roll") {
        brolls.push({
          takeId: segment.takeId,
          asset: value,
          isVideo: VIDEO_EXT.test(value),
          start: shot.start,
          end: shot.end,
          startFrame: shot.startFrame,
          durationInFrames: shot.durationInFrames,
        });
      } else if (key === "texte" || key === "text") {
        texts.push({
          takeId: segment.takeId,
          text: value,
          start: shot.start,
          end: shot.end,
          startFrame: shot.startFrame,
          durationInFrames: shot.durationInFrames,
        });
      } else if (key === "mot" || key === "keyword") {
        const matchedWord = findMatchingWord(words, value);
        const kwStart = matchedWord !== undefined ? matchedWord.timelineStart : shot.start;
        const kwEnd = roundTime(Math.min(shot.end, Math.max(kwStart, kwStart + keywordDuration)));
        const kwStartFrame = Math.round(kwStart * fps);
        const kwEndFrame = Math.round(kwEnd * fps);
        keywords.push({
          takeId: segment.takeId,
          word: value,
          start: kwStart,
          end: kwEnd,
          startFrame: kwStartFrame,
          durationInFrames: Math.max(1, kwEndFrame - kwStartFrame),
        });
      }
    }

    cursor = shotEnd;
  }

  const duration = cursor;
  const durationInFrames = Math.round(duration * fps);

  return {
    fps,
    width,
    height,
    duration,
    durationInFrames,
    chapters,
    shots,
    brolls,
    texts,
    keywords,
  };
}

function findMatchingWord(words: readonly TimelineWord[], target: string): TimelineWord | undefined {
  const targetTokens = normalizeWordTokens(target);
  const needle = targetTokens[0];
  if (needle === undefined) return undefined;

  return (
    words.find((w) => normalizeWordTokens(w.text).includes(needle)) ??
    words.find((w) => normalizeWordTokens(w.text).some((t) => t.startsWith(needle) || needle.startsWith(t)))
  );
}

function normalizeWordTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0);
}

function roundTime(seconds: number): number {
  return Math.round(seconds * 1e6) / 1e6;
}
