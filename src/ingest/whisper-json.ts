import type { Word } from "../domain/timeline.js";

/** Sous-ensemble du JSON complet de whisper.cpp (`-ojf`) que l'on exploite. */
interface WhisperEntry {
  readonly offsets: { readonly from: number; readonly to: number };
  readonly text: string;
}

const HAS_CONTENT = /\p{L}|\p{N}/u;
const IS_ANNOTATION = /^[([].*[)\]]$/;

/**
 * Convertit la sortie `whisper-cli -ojf -sow -ml 1` (une entrée par mot) en
 * mots horodatés en secondes. Ponctuation isolée et annotations de bruit
 * (`[Musique]`, `(rires)`) sont écartées : ce ne sont pas de la parole.
 */
export function wordsFromWhisperJson(json: unknown): Word[] {
  const entries = (json as { transcription?: unknown }).transcription;
  if (!Array.isArray(entries)) {
    throw new TypeError("JSON whisper sans tableau `transcription`");
  }
  return (entries as WhisperEntry[]).flatMap((entry) => {
    const text = entry.text.trim();
    if (!HAS_CONTENT.test(text) || IS_ANNOTATION.test(text)) return [];
    return [{ text, start: entry.offsets.from / 1000, end: entry.offsets.to / 1000 }];
  });
}
