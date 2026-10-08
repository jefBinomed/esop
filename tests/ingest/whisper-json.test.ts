import { describe, expect, it } from "vitest";
import { wordsFromWhisperJson } from "../../src/ingest/whisper-json.js";

// Forme produite par `whisper-cli -ojf -sow -ml 1` : une entrée par mot,
// texte précédé d'une espace, offsets en millisecondes.
const entry = (text: string, from: number, to: number) => ({
  timestamps: { from: "00:00:00,000", to: "00:00:00,000" },
  offsets: { from, to },
  text,
});

describe("wordsFromWhisperJson", () => {
  it("convertit les entrées en mots en secondes, texte nettoyé", () => {
    const json = { transcription: [entry(" Lundi", 470, 800), entry(" soir,", 810, 1200)] };
    expect(wordsFromWhisperJson(json)).toEqual([
      { text: "Lundi", start: 0.47, end: 0.8 },
      { text: "soir,", start: 0.81, end: 1.2 },
    ]);
  });

  it("ignore les entrées sans lettre ni chiffre", () => {
    const json = { transcription: [entry(" .", 0, 10), entry(" ...", 20, 30), entry(" 42", 40, 50)] };
    expect(wordsFromWhisperJson(json).map((w) => w.text)).toEqual(["42"]);
  });

  it("ignore les annotations entre crochets ou parenthèses", () => {
    const json = { transcription: [entry(" [Musique]", 0, 10), entry(" (rires)", 20, 30), entry(" ok", 40, 50)] };
    expect(wordsFromWhisperJson(json).map((w) => w.text)).toEqual(["ok"]);
  });

  it("refuse un document sans transcription", () => {
    expect(() => wordsFromWhisperJson({})).toThrow(/transcription/);
  });
});
