import { describe, expect, it } from "vitest";
import { segmentsFromWords } from "../../src/cut/silences.js";
import type { Word } from "../../src/domain/timeline.js";

const w = (text: string, start: number, end: number): Word => ({ text, start, end });

// Paramètres calibrés sur le style actuel : on coupe à partir de 0,45 s de
// silence et on garde 0,12 s de respiration de chaque côté.
const opts = { takeId: "t1", duration: 60, minGap: 0.45, padding: 0.12 };

describe("segmentsFromWords", () => {
  it("ne produit rien sans mots", () => {
    expect(segmentsFromWords([], opts)).toEqual([]);
  });

  it("garde une phrase continue en un seul segment avec ses marges", () => {
    const words = [w("Lundi", 1.0, 1.4), w("soir", 1.5, 1.9), w("votre", 2.0, 2.3)];
    const segments = segmentsFromWords(words, opts);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ takeId: "t1", start: 0.88, end: 2.42, words });
  });

  it("coupe quand le silence entre deux mots atteint le seuil", () => {
    const words = [w("a", 1.0, 1.2), w("b", 1.65, 1.9), w("c", 2.3, 2.6)];
    const segments = segmentsFromWords(words, opts);
    expect(segments.map((s) => s.words.map((x) => x.text))).toEqual([["a"], ["b", "c"]]);
  });

  it("ne coupe pas pour un silence juste sous le seuil", () => {
    const words = [w("a", 1.0, 1.2), w("b", 1.64, 1.9)];
    expect(segmentsFromWords(words, opts)).toHaveLength(1);
  });

  it("borne les marges au début et à la fin du rush", () => {
    const words = [w("a", 0.05, 0.3), w("b", 59.5, 59.95)];
    const segments = segmentsFromWords(words, opts);
    expect(segments[0]?.start).toBe(0);
    expect(segments[1]?.end).toBe(60);
  });

  it("trie les mots par début avant de segmenter", () => {
    const words = [w("b", 1.4, 1.7), w("a", 1.0, 1.3)];
    const [seg] = segmentsFromWords(words, opts);
    expect(seg?.words.map((x) => x.text)).toEqual(["a", "b"]);
  });

  it("refuse une marge qui ferait se chevaucher deux segments", () => {
    expect(() => segmentsFromWords([], { ...opts, minGap: 0.2, padding: 0.12 })).toThrow(
      /padding/,
    );
  });
});
