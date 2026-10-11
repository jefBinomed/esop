import type { Episode } from "../domain/episode.js";
import type { Segment, Take } from "../domain/timeline.js";
import { compileTimeline, type CompiledTimeline } from "./compile.js";

/** Options de sélection et de compilation d'un Short vertical `9:16`. */
export interface CompileShortOptions {
  /** Identifiant de l'annotation `{short: <shortId>}` à filtrer. */
  readonly shortId?: string;
  /** Indice du chapitre à extraire (par défaut `1` si des chapitres `> 0` existent). */
  readonly chapterIndex?: number;
  /** Durée maximale du Short en secondes (par défaut `60` s). */
  readonly maxDurationSeconds?: number;
  /** Cadence d'images par seconde (par défaut `30`). */
  readonly fps?: number;
}

/** Résultat de la compilation d'un Short vertical `1080×1920`. */
export interface CompiledShort {
  readonly title: string;
  readonly timeline: CompiledTimeline;
}

export const SHORT_DIMENSIONS = {
  width: 1080,
  height: 1920,
  fps: 30,
  maxDurationSeconds: 60,
} as const;

const SHORT_ANNOTATION_RE = /^\s*\{?\s*short(?:\s*:\s*([^}]+?))?\s*\}?\s*$/i;

/**
 * Extrait un sous-ensemble cohérent de segments depuis un `Episode` (par tag
 * `{short: ...}` ou par chapitre, borné à `maxDurationSeconds`) et le compile
 * en format vertical `1080×1920` sans cartes de chapitre intercalaires.
 */
export function compileShort(episode: Episode, opts?: CompileShortOptions): CompiledShort {
  const fps = opts?.fps ?? SHORT_DIMENSIONS.fps;
  const maxDurationSeconds = opts?.maxDurationSeconds ?? SHORT_DIMENSIONS.maxDurationSeconds;
  const takesById = new Map<string, Take>(episode.takes.map((t) => [t.id, t]));
  const kept = (episode.segments ?? []).filter((s) => s.dropped !== true);

  const candidates = selectCandidateSegments(kept, takesById, opts);
  const bounded = boundSegmentsByDuration(candidates, maxDurationSeconds);

  const first = bounded[0];
  const firstTake = first !== undefined ? takesById.get(first.takeId) : undefined;
  const rawTitle = first?.chapter ?? firstTake?.chapter ?? episode.name;
  const title = rawTitle.trim().length > 0 && rawTitle !== "rush" ? rawTitle : episode.name;

  const filteredEpisode: Episode = {
    ...episode,
    segments: bounded,
  };

  const timeline = compileTimeline(filteredEpisode, {
    fps,
    width: SHORT_DIMENSIONS.width,
    height: SHORT_DIMENSIONS.height,
    includeChapterCards: false,
  });

  return { title, timeline };
}

function selectCandidateSegments(
  kept: readonly Segment[],
  takesById: ReadonlyMap<string, Take>,
  opts?: CompileShortOptions,
): readonly Segment[] {
  if (opts?.shortId !== undefined) {
    const target = opts.shortId.trim().toLowerCase();
    return kept.filter((seg) => extractShortTag(seg)?.toLowerCase() === target);
  }

  if (opts?.chapterIndex !== undefined) {
    return kept.filter(
      (seg) => (seg.chapterIndex ?? takesById.get(seg.takeId)?.chapterIndex ?? 0) === opts.chapterIndex,
    );
  }

  const firstTagged = kept.map((seg) => extractShortTag(seg)).find((tag) => tag !== undefined);
  if (firstTagged !== undefined) {
    const target = firstTagged.toLowerCase();
    return kept.filter((seg) => extractShortTag(seg)?.toLowerCase() === target);
  }

  const positiveChapters = kept
    .map((seg) => seg.chapterIndex ?? takesById.get(seg.takeId)?.chapterIndex ?? 0)
    .filter((idx) => idx > 0);

  if (positiveChapters.length > 0) {
    const targetChapter = positiveChapters.includes(1) ? 1 : (positiveChapters[0] ?? 1);
    return kept.filter(
      (seg) => (seg.chapterIndex ?? takesById.get(seg.takeId)?.chapterIndex ?? 0) === targetChapter,
    );
  }

  return kept;
}

function boundSegmentsByDuration(
  segments: readonly Segment[],
  maxDurationSeconds: number,
): readonly Segment[] {
  const result: Segment[] = [];
  let accumulated = 0;

  for (const segment of segments) {
    const duration = Math.max(0, segment.end - segment.start);
    if (result.length > 0 && accumulated + duration > maxDurationSeconds + 1e-6) {
      break;
    }
    result.push(segment);
    accumulated += duration;
    if (accumulated >= maxDurationSeconds) {
      break;
    }
  }

  return result;
}

function extractShortTag(segment: Segment): string | undefined {
  for (const raw of segment.annotations ?? []) {
    const match = SHORT_ANNOTATION_RE.exec(raw);
    if (match !== null) {
      return (match[1] ?? "default").trim();
    }
  }
  return undefined;
}
