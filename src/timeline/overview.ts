import type { BrollCue, ChapterCue, CompiledTimeline, TalkShot } from "./compile.js";

/** Résumé d'un rush vidéo source utilisé dans la timeline compilée. */
export interface RushSummary {
  readonly file: string;
  readonly takeId: string;
  readonly shotCount: number;
  readonly totalDuration: number;
  readonly largeCount: number;
  readonly serreCount: number;
}

/** Résumé d'un asset B-roll utilisé dans la timeline compilée. */
export interface BrollSummary {
  readonly asset: string;
  readonly isVideo: boolean;
  readonly count: number;
  readonly firstStart: number;
  readonly occurrences: readonly BrollCue[];
}

/** Synthèse complète des médias d'une `CompiledTimeline`. */
export interface TimelineMediaSummary {
  readonly rushes: readonly RushSummary[];
  readonly brolls: readonly BrollSummary[];
  readonly chapters: readonly ChapterCue[];
  readonly totalShots: number;
  readonly totalDuration: number;
}

/**
 * Formate une durée en secondes sous la forme compacte `mm:ss` (ou `mm:ss.d`
 * lorsque `decimals > 0`).
 */
export function formatCompactTime(seconds: number, decimals = 0): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const rem = safe - mins * 60;
  const minsStr = String(mins).padStart(2, "0");

  if (decimals <= 0) {
    const secs = Math.floor(rem);
    return `${minsStr}:${String(secs).padStart(2, "0")}`;
  }

  const fixed = rem.toFixed(decimals);
  const [intPart = "0", fracPart = ""] = fixed.split(".");
  return `${minsStr}:${intPart.padStart(2, "0")}.${fracPart}`;
}

/**
 * Formate un nom de `<Sequence>` lisible pour Remotion Studio décrivant le
 * numéro de plan, le cadrage, le rush source, son timecode dans le rush et un
 * extrait du texte prononcé.
 */
export function formatShotSequenceName(shot: TalkShot, index: number): string {
  const num = String(index + 1).padStart(3, "0");
  const base = extractStem(shot.file);
  const range = `${formatCompactTime(shot.trimBefore)}→${formatCompactTime(shot.trimAfter)}`;
  const rawText = shot.words.map((w) => w.text).join(" ").trim();

  if (rawText.length === 0) {
    return `🎬 #${num} [${shot.framing}] ${base} (${range})`;
  }

  const maxLen = 30;
  const preview =
    rawText.length > maxLen ? `${rawText.slice(0, maxLen).trimEnd()}...` : rawText;

  return `🎬 #${num} [${shot.framing}] ${base} (${range}) — ${preview}`;
}

/**
 * Agrège les statistiques des rushs, des B-rolls et des chapitres utilisés
 * dans une timeline compilée.
 */
export function summarizeTimelineMedia(timeline: CompiledTimeline): TimelineMediaSummary {
  const rushMap = new Map<
    string,
    {
      file: string;
      takeId: string;
      shotCount: number;
      totalDuration: number;
      largeCount: number;
      serreCount: number;
    }
  >();

  for (const shot of timeline.shots) {
    const key = shot.file;
    const duration = Math.max(0, shot.end - shot.start);
    const existing = rushMap.get(key);
    if (existing !== undefined) {
      existing.shotCount += 1;
      existing.totalDuration = Math.round((existing.totalDuration + duration) * 1e6) / 1e6;
      if (shot.framing === "large") existing.largeCount += 1;
      else existing.serreCount += 1;
    } else {
      rushMap.set(key, {
        file: shot.file,
        takeId: shot.takeId,
        shotCount: 1,
        totalDuration: Math.round(duration * 1e6) / 1e6,
        largeCount: shot.framing === "large" ? 1 : 0,
        serreCount: shot.framing === "serré" ? 1 : 0,
      });
    }
  }

  const brollMap = new Map<
    string,
    {
      asset: string;
      isVideo: boolean;
      count: number;
      firstStart: number;
      occurrences: BrollCue[];
    }
  >();

  for (const cue of timeline.brolls) {
    const existing = brollMap.get(cue.asset);
    if (existing !== undefined) {
      existing.count += 1;
      if (cue.start < existing.firstStart) {
        existing.firstStart = cue.start;
      }
      existing.occurrences.push(cue);
    } else {
      brollMap.set(cue.asset, {
        asset: cue.asset,
        isVideo: cue.isVideo,
        count: 1,
        firstStart: cue.start,
        occurrences: [cue],
      });
    }
  }

  return {
    rushes: Array.from(rushMap.values()),
    brolls: Array.from(brollMap.values()),
    chapters: timeline.chapters,
    totalShots: timeline.shots.length,
    totalDuration: timeline.duration,
  };
}

function extractStem(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  const basename = parts.at(-1) ?? filePath;
  return basename.replace(/\.[^.]+$/, "");
}
