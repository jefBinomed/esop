import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface ContactSheetOptions {
  /** Une vignette toutes les `interval` secondes. */
  readonly interval: number;
  readonly columns: number;
  readonly thumbnailWidth: number;
}

export const DEFAULT_CONTACT_SHEET: ContactSheetOptions = { interval: 5, columns: 6, thumbnailWidth: 320 };

/** Arguments ffmpeg d'une planche de vignettes horodatées. Pur, testable. */
export function contactSheetArgs(input: string, output: string, duration: number, opts: ContactSheetOptions): string[] {
  const count = Math.max(1, Math.ceil(duration / opts.interval));
  const rows = Math.ceil(count / opts.columns);
  const filter =
    `fps=1/${opts.interval},scale=${opts.thumbnailWidth}:-2,` +
    `drawtext=text='%{pts\\:hms}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6,` +
    `tile=${opts.columns}x${rows}:padding=4:margin=4`;
  return ["-v", "error", "-y", "-i", input, "-vf", filter, "-frames:v", "1", output];
}

/**
 * Planche de vignettes d'une vidéo : la seule façon pour Claude de « voir »
 * un montage. Une image par `interval` secondes, timecode incrusté.
 */
export async function renderContactSheet(
  input: string,
  output: string,
  duration: number,
  opts: ContactSheetOptions = DEFAULT_CONTACT_SHEET,
): Promise<void> {
  await run("ffmpeg", contactSheetArgs(input, output, duration, opts));
}
