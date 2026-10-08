import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import type { Episode } from "../domain/episode.js";
import { sortTakes } from "../domain/episode.js";
import type { Span, Take } from "../domain/timeline.js";
import { detectSilences } from "../cut/silences.js";
import { probeMedia } from "./probe.js";
import { parseTakeName } from "./take-name.js";
import { transcribe } from "./transcribe.js";

export interface IngestOptions {
  /** Fichiers explicites ; sinon, tous les rushs nommés selon la convention. */
  readonly files?: readonly string[];
  /** Épisode déjà ingéré, pour ne pas retranscrire les prises inchangées. */
  readonly previous?: Episode;
  readonly log?: (message: string) => void;
}

const VIDEO_EXT = new Set([".mp4", ".mov"]);

/** Liste les rushs d'un dossier d'épisode qui suivent la convention de nommage. */
export async function listTakeFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  return entries
    .filter((name) => VIDEO_EXT.has(extname(name).toLowerCase()) && parseTakeName(name) !== undefined)
    .sort()
    .map((name) => join(dir, name));
}

/**
 * Ingère un épisode : métadonnées, transcription et silences de chaque
 * prise. Un fichier hors convention est accepté en prise unique du
 * chapitre 0, ce qui couvre les anciens rushs d'un seul tenant.
 */
export async function ingestEpisode(dir: string, opts: IngestOptions = {}): Promise<Episode> {
  const sourceDir = resolve(dir);
  const files = opts.files?.map((f) => resolve(sourceDir, f)) ?? (await listTakeFiles(sourceDir));
  if (files.length === 0) throw new Error(`aucun rush nommé NN-chapitre-prise.version dans ${sourceDir}`);
  const log = opts.log ?? (() => undefined);

  const takes: Take[] = [];
  const silences: Record<string, readonly Span[]> = {};
  for (const file of files) {
    const name = basename(file);
    const id = name.replace(extname(name), "");
    const parsed = parseTakeName(name) ?? { chapterIndex: 0, chapter: "rush", take: 1, version: 1 };
    const reused = reusable(opts.previous, id, file);
    if (reused !== undefined) {
      log(`${name} : transcription réutilisée`);
      takes.push(reused.take);
      silences[id] = reused.silences;
      continue;
    }
    log(`${name} : métadonnées`);
    const info = await probeMedia(file);
    log(`${name} : transcription (${Math.round(info.duration)} s)`);
    const words = await transcribe(file);
    log(`${name} : silences`);
    silences[id] = await detectSilences(file, info.duration);
    takes.push({ id, file, ...parsed, duration: info.duration, words });
  }

  return { name: basename(sourceDir), sourceDir, takes: sortTakes(takes), silences };
}

/** Une prise déjà ingérée au même chemin est réutilisée telle quelle. */
function reusable(
  previous: Episode | undefined,
  id: string,
  file: string,
): { take: Take; silences: readonly Span[] } | undefined {
  const take = previous?.takes.find((t) => t.id === id);
  const silences = previous?.silences[id];
  if (take === undefined || silences === undefined || take.file !== file) return undefined;
  return { take, silences };
}

export async function readEpisode(path: string): Promise<Episode | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as Episode;
  } catch {
    return undefined;
  }
}
