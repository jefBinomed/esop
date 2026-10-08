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
}

export const DEFAULT_PREVIEW_OPTIONS: PreviewOptions = { width: 960 };

export interface PreviewPlan {
  /** Fichiers sources, dans l'ordre des entrées ffmpeg. */
  readonly inputs: readonly string[];
  /** Contenu du script `-filter_complex_script`. */
  readonly filterScript: string;
}

/**
 * Construit le graphe ffmpeg d'une coupe brute : chaque segment conservé est
 * découpé (trim), recadré selon son cadrage, mis à l'échelle, puis tout est
 * concaténé. Pur : aucune commande lancée ici.
 */
export function planPreview(
  takes: readonly Take[],
  segments: readonly Segment[],
  sizes: Readonly<Record<string, { width: number; height: number }>>,
  opts: PreviewOptions = DEFAULT_PREVIEW_OPTIONS,
): PreviewPlan {
  const kept = segments.filter((s) => s.dropped !== true);
  if (kept.length === 0) throw new Error("aucun segment conservé à prévisualiser");

  const inputs = [...new Set(kept.map((s) => s.takeId))].map((id) => {
    const take = takes.find((t) => t.id === id);
    if (take === undefined) throw new Error(`prise inconnue : ${id}`);
    return take.file;
  });
  const inputIndex = new Map(inputs.map((file, i) => [takes.find((t) => t.file === file)?.id ?? file, i]));
  const outWidth = opts.width;
  const outHeight = Math.round((outWidth * 9) / 16 / 2) * 2;

  const lines = kept.map((segment, i) => {
    const input = inputIndex.get(segment.takeId) ?? 0;
    const size = sizes[segment.takeId];
    if (size === undefined) throw new Error(`dimensions inconnues pour ${segment.takeId}`);
    const crop = cropRect(size.width, size.height, segment.framing ?? "large");
    const video =
      `[${input}:v]trim=start=${segment.start}:end=${segment.end},setpts=PTS-STARTPTS,` +
      `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},scale=${outWidth}:${outHeight}[v${i}]`;
    const audio = `[${input}:a]atrim=start=${segment.start}:end=${segment.end},asetpts=PTS-STARTPTS[a${i}]`;
    return `${video};\n${audio}`;
  });

  const concat = `${kept.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${kept.length}:v=1:a=1[v][a]`;
  return { inputs, filterScript: `${lines.join(";\n")};\n${concat}\n` };
}

/** Rend la coupe brute en H.264 rapide. Le script de filtres passe par un fichier : 100 segments dépassent la ligne de commande. */
export async function renderPreview(plan: PreviewPlan, output: string): Promise<void> {
  const workDir = await mkdtemp(join(tmpdir(), "esop-preview-"));
  try {
    const script = join(workDir, "filters.txt");
    await writeFile(script, plan.filterScript, "utf8");
    await run(
      "ffmpeg",
      [
        "-v", "error", "-y",
        ...plan.inputs.flatMap((file) => ["-i", file]),
        "-filter_complex_script", script,
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        output,
      ],
      { maxBuffer: 64 * 1024 * 1024 },
    );
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
