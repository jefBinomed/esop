import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Segment, Take } from "../domain/timeline.js";
import { cropRect } from "../zoom/framing.js";

const run = promisify(execFile);

export interface PreviewOptions {
  /** Largeur de sortie ; la hauteur suit le 16/9. 960 pour une relecture rapide. */
  readonly width: number;
  /** Extractions ffmpeg menées de front. */
  readonly concurrency: number;
}

export const DEFAULT_PREVIEW_OPTIONS: PreviewOptions = { width: 960, concurrency: 4 };

export interface ExtractJob {
  readonly input: string;
  readonly start: number;
  readonly duration: number;
  /** Chaîne de filtres vidéo : recadrage, échelle, rapport d'aspect. */
  readonly filter: string;
}

/**
 * Prépare une extraction par segment conservé. Chaque extraction cherche
 * directement à `start` dans le rush (`-ss` avant `-i`) : ffmpeg ne décode
 * que les quelques secondes utiles, là où un seul graphe à cent branches
 * décodait tout le rush pour chaque branche. Pur : aucune commande lancée.
 */
export function planPreview(
  takes: readonly Take[],
  segments: readonly Segment[],
  sizes: Readonly<Record<string, { width: number; height: number }>>,
  opts: Pick<PreviewOptions, "width"> = DEFAULT_PREVIEW_OPTIONS,
): ExtractJob[] {
  const kept = segments.filter((s) => s.dropped !== true);
  if (kept.length === 0) throw new Error("aucun segment conservé à prévisualiser");
  const outWidth = opts.width;
  const outHeight = Math.round((outWidth * 9) / 16 / 2) * 2;

  return kept.map((segment) => {
    const take = takes.find((t) => t.id === segment.takeId);
    if (take === undefined) throw new Error(`prise inconnue : ${segment.takeId}`);
    const size = sizes[segment.takeId];
    if (size === undefined) throw new Error(`dimensions inconnues pour ${segment.takeId}`);
    const crop = cropRect(size.width, size.height, segment.framing ?? "large");
    return {
      input: take.file,
      start: segment.start,
      duration: round(segment.end - segment.start),
      // setsar=1 : le recadrage fait dériver le rapport d'aspect des pixels
      // d'un millième et la concaténation refuse alors des entrées « différentes ».
      filter: `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},scale=${outWidth}:${outHeight},setsar=1`,
    };
  });
}

/** Arguments ffmpeg d'une extraction. Décodage matériel quand disponible, encodage H.264 rapide. */
export function extractArgs(job: ExtractJob, output: string, hwaccel: string | undefined): string[] {
  return [
    "-v", "error", "-y",
    ...(hwaccel === undefined ? [] : ["-hwaccel", hwaccel]),
    "-ss", String(job.start), "-i", job.input, "-t", String(job.duration),
    "-vf", job.filter,
    // yuv420p : le téléphone enregistre en yuvj420p (plage étendue), format déprécié côté encodeurs.
    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
    output,
  ];
}

/**
 * Rend la coupe brute : extractions en parallèle dans un dossier temporaire,
 * puis concaténation sans réencodage par le démultiplexeur `concat`.
 */
export async function renderPreview(
  jobs: readonly ExtractJob[],
  output: string,
  opts: Pick<PreviewOptions, "concurrency"> = DEFAULT_PREVIEW_OPTIONS,
  onProgress: (done: number, total: number) => void = () => undefined,
): Promise<void> {
  const workDir = await mkdtemp(join(tmpdir(), "esop-preview-"));
  try {
    const hwaccel = process.platform === "darwin" ? "videotoolbox" : undefined;
    const parts = jobs.map((_, i) => join(workDir, `seg-${String(i).padStart(4, "0")}.mp4`));
    let done = 0;
    await mapConcurrent(jobs, opts.concurrency, async (job, i) => {
      await run("ffmpeg", extractArgs(job, parts[i] ?? "", hwaccel));
      onProgress(++done, jobs.length);
    });

    const list = join(workDir, "list.txt");
    await writeFile(list, parts.map((p) => `file '${p.replaceAll("'", "'\\''")}'`).join("\n"), "utf8");
    await run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", output]);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function mapConcurrent<T>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const i = next++;
      const item = items[i];
      if (item === undefined) return;
      await fn(item, i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
}

function round(seconds: number): number {
  return Math.round(seconds * 1000) / 1000;
}
