import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Word } from "../domain/timeline.js";
import { wordsFromWhisperJson } from "./whisper-json.js";

const run = promisify(execFile);

export interface TranscribeOptions {
  /** Chemin du modèle ggml ; par défaut large-v3-turbo dans le cache utilisateur. */
  readonly model?: string;
  readonly language?: string;
}

export const DEFAULT_MODEL = join(homedir(), ".cache/whisper-cpp/models/ggml-large-v3-turbo.bin");

/**
 * Transcrit un rush en mots horodatés : extraction audio 16 kHz mono par
 * ffmpeg, puis `whisper-cli` en mode un mot par entrée. Les fichiers
 * temporaires sont supprimés quoi qu'il arrive.
 */
export async function transcribe(file: string, opts: TranscribeOptions = {}): Promise<Word[]> {
  const workDir = await mkdtemp(join(tmpdir(), "esop-"));
  try {
    const wav = join(workDir, "audio.wav");
    await run("ffmpeg", ["-v", "error", "-y", "-i", file, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);

    const out = join(workDir, "transcript");
    await run("whisper-cli", [
      "-m", opts.model ?? DEFAULT_MODEL,
      "-l", opts.language ?? "fr",
      "-sow", "-ml", "1",
      "-ojf", "-of", out,
      "-np",
      "-f", wav,
    ]);

    return wordsFromWhisperJson(JSON.parse(await readFile(`${out}.json`, "utf8")));
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
