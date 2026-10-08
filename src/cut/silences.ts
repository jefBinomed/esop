import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Span } from "../domain/timeline.js";

const run = promisify(execFile);

export interface SilenceDetectOptions {
  /** Seuil de bruit en dB sous lequel on considère un silence. */
  readonly noiseDb?: number;
  /** Durée minimale d'un silence pour être rapporté, en secondes. */
  readonly minDuration?: number;
}

/** Calibré sur un micro Bluetooth en intérieur : −35 dB, 0,3 s. */
export const DEFAULT_SILENCE_DETECT = { noiseDb: -35, minDuration: 0.3 } as const;

const START = /silence_start:\s*([\d.]+)/g;
const END = /silence_end:\s*([\d.]+)/g;

/**
 * Lit la sortie du filtre `silencedetect` de ffmpeg. Un silence encore
 * ouvert à la fin du média est fermé sur `duration`.
 */
export function parseSilenceLog(log: string, duration: number): Span[] {
  const starts = [...log.matchAll(START)].map((m) => Number(m[1]));
  const ends = [...log.matchAll(END)].map((m) => Number(m[1]));
  return starts.map((start, i) => ({ start, end: ends[i] ?? duration }));
}

/** Détecte les silences d'un média avec ffmpeg et les renvoie en secondes. */
export async function detectSilences(
  file: string,
  duration: number,
  opts: SilenceDetectOptions = {},
): Promise<Span[]> {
  const noise = opts.noiseDb ?? DEFAULT_SILENCE_DETECT.noiseDb;
  const min = opts.minDuration ?? DEFAULT_SILENCE_DETECT.minDuration;
  // silencedetect écrit sur stderr ; `-f null -` évite tout fichier de sortie.
  const { stderr } = await run("ffmpeg", [
    "-v", "info", "-i", file,
    "-af", `silencedetect=noise=${noise}dB:d=${min}`,
    "-f", "null", "-",
  ]);
  return parseSilenceLog(stderr, duration);
}
