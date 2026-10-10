import { DEFAULT_SEGMENT_OPTIONS } from "../cut/segments.js";
import type { Span, Take } from "../domain/timeline.js";
import { matchesPoint, normalizeTokens, type EpisodeScript } from "./script.js";

export interface TakeEvaluation {
  readonly takeId: string;
  readonly chapterIndex: number;
  readonly chapter: string;
  readonly duration: number;
  readonly speechDuration: number;
  /** Silences internes (hors début et fin de rush) dépassant le seuil de coupe. */
  readonly hesitationCount: number;
  /** Points (`texte:` ou `mot:`) du script non retrouvés dans la transcription. */
  readonly missingPoints: readonly string[];
  readonly recommended: boolean;
}

/**
 * Évalue chaque prise et désigne une recommandation par chapitre : priorité à
 * la prise qui couvre le plus de points du script, puis à celle qui compte le
 * moins d'hésitations par minute de parole (et la version la plus récente en
 * cas d'égalité).
 */
export function evaluateTakes(
  takes: readonly Take[],
  silences: Readonly<Record<string, readonly Span[]>>,
  script?: EpisodeScript,
  minGap: number = DEFAULT_SEGMENT_OPTIONS.minGap,
): TakeEvaluation[] {
  const chaptersByIndex = new Map(script?.chapters.map((c) => [c.index, c]) ?? []);

  const raw = takes.map((take) => {
    const takeSilences = (silences[take.id] ?? []).filter((s) => s.end - s.start >= minGap);
    const silenceTotal = takeSilences.reduce((sum, s) => sum + (s.end - s.start), 0);
    const speechDuration = Math.max(0, Math.round((take.duration - silenceTotal) * 10) / 10);
    const hesitationCount = takeSilences.filter((s) => s.start > 0.5 && s.end < take.duration - 0.5).length;

    const chapterScript = chaptersByIndex.get(take.chapterIndex);
    const expectedPoints = [...(chapterScript?.texts ?? []), ...(chapterScript?.keywords ?? [])];
    const tokens = new Set(take.words.flatMap((w) => normalizeTokens(w.text)));
    const missingPoints = expectedPoints.filter((point) => !matchesPoint(tokens, point));

    return {
      take,
      takeId: take.id,
      chapterIndex: take.chapterIndex,
      chapter: chapterScript?.title ?? take.chapter,
      duration: Math.round(take.duration * 10) / 10,
      speechDuration,
      hesitationCount,
      missingPoints,
    };
  });

  const bestByChapter = new Map<number, string>();
  const byChapter = new Map<number, typeof raw>();
  for (const item of raw) {
    const group = byChapter.get(item.chapterIndex);
    if (group === undefined) {
      byChapter.set(item.chapterIndex, [item]);
    } else {
      group.push(item);
    }
  }
  for (const [chapterIndex, group] of byChapter) {
    const sorted = [...group].sort((a, b) => {
      if (a.missingPoints.length !== b.missingPoints.length) {
        return a.missingPoints.length - b.missingPoints.length;
      }
      if (a.hesitationCount !== b.hesitationCount) {
        return a.hesitationCount - b.hesitationCount;
      }
      return b.take.take - a.take.take || b.take.version - a.take.version;
    });
    const winner = sorted[0];
    if (winner !== undefined) bestByChapter.set(chapterIndex, winner.takeId);
  }

  return raw.map(({ take: _, ...item }) => ({
    ...item,
    recommended: bestByChapter.get(item.chapterIndex) === item.takeId,
  }));
}
