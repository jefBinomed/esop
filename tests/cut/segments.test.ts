import { describe, expect, it } from "vitest";
import { segmentsFromSilences } from "../../src/cut/segments.js";
import type { Span, Word } from "../../src/domain/timeline.js";

const w = (text: string, start: number, end: number): Word => ({ text, start, end });
const s = (start: number, end: number): Span => ({ start, end });

// Calibré sur le style actuel : on coupe à partir de 0,45 s de silence et on
// garde 0,12 s de respiration de chaque côté.
const opts = { takeId: "t1", duration: 60, minGap: 0.45, padding: 0.12 };

describe("segmentsFromSilences", () => {
  it("garde tout le rush en un segment sans silence", () => {
    const words = [w("a", 1, 2)];
    expect(segmentsFromSilences([], words, opts)).toEqual([
      { takeId: "t1", start: 0, end: 60, words },
    ]);
  });

  it("coupe sur un silence assez long en gardant une respiration", () => {
    const words = [w("a", 1, 2), w("b", 5, 6)];
    const segments = segmentsFromSilences([s(2.0, 4.8)], words, opts);
    expect(segments).toEqual([
      { takeId: "t1", start: 0, end: 2.12, words: [words[0]] },
      { takeId: "t1", start: 4.68, end: 60, words: [words[1]] },
    ]);
  });

  it("ignore un silence plus court que le seuil", () => {
    const words = [w("a", 1, 2), w("b", 2.5, 3)];
    expect(segmentsFromSilences([s(2.0, 2.4)], words, opts)).toHaveLength(1);
  });

  it("retire les silences de début et de fin sans créer de segment vide", () => {
    const words = [w("a", 3, 4)];
    const segments = segmentsFromSilences([s(0, 2.5), s(4.2, 60)], words, opts);
    expect(segments).toEqual([{ takeId: "t1", start: 2.38, end: 4.32, words }]);
  });

  it("rattache un mot au segment qu'il recouvre le plus", () => {
    // whisper étale souvent un mot sur le silence qui le suit.
    const words = [w("a", 1, 2.6), w("b", 5, 6)];
    const segments = segmentsFromSilences([s(2.0, 4.8)], words, opts);
    expect(segments.map((x) => x.words.map((y) => y.text))).toEqual([["a"], ["b"]]);
  });

  it("rattache un mot tombé dans un silence au segment le plus proche", () => {
    const words = [w("a", 1, 2), w("x", 3.0, 3.5), w("b", 5, 6)];
    const segments = segmentsFromSilences([s(2.0, 4.8)], words, opts);
    expect(segments.map((x) => x.words.map((y) => y.text))).toEqual([["a", "x"], ["b"]]);
  });

  it("supprime un segment de parole sans aucun mot", () => {
    const words = [w("a", 1, 2)];
    const segments = segmentsFromSilences([s(2.0, 4.8), s(5.5, 10)], words, opts);
    expect(segments).toHaveLength(1);
  });

  it("fusionne un segment trop court avec le suivant, silence compris", () => {
    const words = [w("Tu", 0.04, 0.14), w("t'es", 0.6, 0.9)];
    const segments = segmentsFromSilences([s(0.14, 0.575)], words, { ...opts, minSegment: 0.5 });
    expect(segments).toEqual([{ takeId: "t1", start: 0, end: 60, words }]);
  });

  it("fusionne un dernier segment trop court avec le précédent", () => {
    const words = [w("a", 1, 2), w("b", 59.75, 59.9)];
    const segments = segmentsFromSilences([s(2.0, 59.7)], words, { ...opts, minSegment: 0.5 });
    expect(segments).toEqual([{ takeId: "t1", start: 0, end: 60, words }]);
  });

  it("refuse une marge qui dépasserait le demi-seuil", () => {
    expect(() => segmentsFromSilences([], [], { ...opts, minGap: 0.2 })).toThrow(/padding/);
  });
});
