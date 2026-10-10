import { describe, expect, it } from "vitest";
import { mergeMontageEdits, parseMontage, segmentsFromMontage, serializeMontage } from "../../src/montage/format.js";
import { formatTimecode, parseTimecode } from "../../src/montage/timecode.js";
import type { Segment, Take, Word } from "../../src/domain/timeline.js";

const w = (text: string, start: number, end: number): Word => ({ text, start, end });

const takes: Take[] = [
  { id: "00-hook-1.2", file: "00-hook-1.2.mp4", chapterIndex: 0, chapter: "hook", take: 1, version: 2, duration: 30, words: [] },
  { id: "02-Probleme-1.2", file: "02-Probleme-1.2.mp4", chapterIndex: 2, chapter: "Probleme", take: 1, version: 2, duration: 30, words: [] },
];

const segments: Segment[] = [
  { takeId: "00-hook-1.2", start: 0.47, end: 8.09, words: [w("Lundi", 0.5, 0.9), w("soir,", 1, 1.4)] },
  { takeId: "00-hook-1.2", start: 9.27, end: 13.55, framing: "serré", words: [w("Votre", 9.3, 9.6)] },
  { takeId: "02-Probleme-1.2", start: 0.3, end: 4.9, dropped: true, annotations: ["broll: sac.mp4"], words: [w("Et", 0.4, 0.5)] },
];

const expected = `# conclusion

## 00 — hook

[00-hook-1.2 00:00.470→00:08.090] Lundi soir,
[00-hook-1.2 00:09.270→00:13.550] (serré) Votre

## 02 — Probleme

[02-Probleme-1.2 00:00.300→00:04.900] {broll: sac.mp4} ~~Et~~
`;

describe("timecode", () => {
  it("fait l'aller-retour à la milliseconde", () => {
    for (const s of [0, 0.001, 59.999, 60, 491.123, 3600.5]) {
      expect(parseTimecode(formatTimecode(s))).toBe(s);
    }
    expect(formatTimecode(491.123)).toBe("08:11.123");
  });

  it("refuse un timecode mal formé", () => {
    expect(() => parseTimecode("1:2.3")).toThrow(/timecode/);
  });
});

describe("serializeMontage", () => {
  it("écrit un chapitre par prise et une ligne par segment", () => {
    expect(serializeMontage("conclusion", takes, segments)).toBe(expected);
  });

  it("refuse un segment dont la prise est inconnue", () => {
    expect(() => serializeMontage("x", takes, [{ ...segments[0]!, takeId: "nope" }])).toThrow(/prise inconnue/);
  });
});

describe("parseMontage", () => {
  it("relit ce que serializeMontage a écrit", () => {
    expect(parseMontage(expected)).toEqual({
      title: "conclusion",
      lines: [
        { takeId: "00-hook-1.2", start: 0.47, end: 8.09, text: "Lundi soir,", dropped: false, annotations: [], chapterIndex: 0, chapter: "hook" },
        { takeId: "00-hook-1.2", start: 9.27, end: 13.55, text: "Votre", dropped: false, framing: "serré", annotations: [], chapterIndex: 0, chapter: "hook" },
        { takeId: "02-Probleme-1.2", start: 0.3, end: 4.9, text: "Et", dropped: true, annotations: ["broll: sac.mp4"], chapterIndex: 2, chapter: "Probleme" },
      ],
    });
  });

  it("accepte cadrage et annotations dans n'importe quel ordre", () => {
    const doc = parseMontage("[t 00:00.000→00:01.000] {mot: bug} (large) {texte: 1. x} ok");
    expect(doc.lines[0]).toMatchObject({ framing: "large", annotations: ["mot: bug", "texte: 1. x"], text: "ok" });
  });

  it("ignore les lignes libres et associe les titres de chapitre aux lignes suivantes", () => {
    const doc = parseMontage("# t\n\nnote perso\n## 00 — hook\n[t 00:00.000→00:01.000] ok\n");
    expect(doc.lines).toHaveLength(1);
    expect(doc.lines[0]).toMatchObject({ chapterIndex: 0, chapter: "hook" });
  });
});

describe("segmentsFromMontage", () => {
  it("reconstruit les segments depuis montage.md en rattachant les mots de la prise", () => {
    const takesWithWords: Take[] = [
      { ...takes[0]!, words: [w("Lundi", 0.5, 0.9), w("soir,", 1, 1.4), w("Votre", 9.3, 9.6)] },
      { ...takes[1]!, words: [w("Et", 0.4, 0.5)] },
    ];
    const doc = parseMontage(expected);
    expect(segmentsFromMontage(doc, takesWithWords)).toEqual([
      { takeId: "00-hook-1.2", start: 0.47, end: 8.09, chapterIndex: 0, chapter: "hook", words: [w("Lundi", 0.5, 0.9), w("soir,", 1, 1.4)] },
      { takeId: "00-hook-1.2", start: 9.27, end: 13.55, framing: "serré", chapterIndex: 0, chapter: "hook", words: [w("Votre", 9.3, 9.6)] },
      {
        takeId: "02-Probleme-1.2",
        start: 0.3,
        end: 4.9,
        chapterIndex: 2,
        chapter: "Probleme",
        dropped: true,
        annotations: ["broll: sac.mp4"],
        words: [w("Et", 0.4, 0.5)],
      },
    ]);
  });

  it("refuse une ligne dont la prise est inconnue", () => {
    const doc = parseMontage("[inconnue 00:00.000→00:01.000] texte\n");
    expect(() => segmentsFromMontage(doc, takes)).toThrow(/prise inconnue/);
  });
});

describe("mergeMontageEdits", () => {
  it("préserve les coupes barrées et les annotations lors d'un nouveau cut", () => {
    const fresh: Segment[] = [
      { takeId: "00-hook-1.2", start: 0.47, end: 8.09, words: [w("Lundi", 0.5, 0.9)] },
      { takeId: "02-Probleme-1.2", start: 0.3, end: 4.9, words: [w("Et", 0.4, 0.5)] },
    ];
    const doc = parseMontage(expected);
    expect(mergeMontageEdits(fresh, doc)).toEqual([
      { takeId: "00-hook-1.2", start: 0.47, end: 8.09, chapterIndex: 0, chapter: "hook", words: [w("Lundi", 0.5, 0.9)] },
      {
        takeId: "02-Probleme-1.2",
        start: 0.3,
        end: 4.9,
        chapterIndex: 2,
        chapter: "Probleme",
        dropped: true,
        annotations: ["broll: sac.mp4"],
        words: [w("Et", 0.4, 0.5)],
      },
    ]);
  });

  it("préserve les chapitres inline au milieu d'un rush unique (parse ↔ serialize ↔ merge)", () => {
    const singleTake: Take[] = [
      { id: "rush-1", file: "rush-1.mp4", chapterIndex: 0, chapter: "rush", take: 1, version: 1, duration: 60, words: [w("Un", 1, 2), w("Deux", 10, 11)] },
    ];
    const inlineMd = `# imposteur

## 00 — Hook

[rush-1 00:01.000→00:02.000] (large) Un

## 01 — Anecdote personnelle

[rush-1 00:10.000→00:11.000] (large) Deux
`;
    const doc = parseMontage(inlineMd);
    expect(doc.lines).toEqual([
      { takeId: "rush-1", start: 1, end: 2, text: "Un", dropped: false, framing: "large", annotations: [], chapterIndex: 0, chapter: "Hook" },
      { takeId: "rush-1", start: 10, end: 11, text: "Deux", dropped: false, framing: "large", annotations: [], chapterIndex: 1, chapter: "Anecdote personnelle" },
    ]);

    const rebuilt = segmentsFromMontage(doc, singleTake);
    expect(rebuilt).toEqual([
      { takeId: "rush-1", start: 1, end: 2, framing: "large", chapterIndex: 0, chapter: "Hook", words: [w("Un", 1, 2)] },
      { takeId: "rush-1", start: 10, end: 11, framing: "large", chapterIndex: 1, chapter: "Anecdote personnelle", words: [w("Deux", 10, 11)] },
    ]);

    expect(serializeMontage("imposteur", singleTake, rebuilt)).toBe(inlineMd);

    const rawSegments: Segment[] = [
      { takeId: "rush-1", start: 1, end: 2, words: [w("Un", 1, 2)] },
      { takeId: "rush-1", start: 10, end: 11, words: [w("Deux", 10, 11)] },
    ];
    const merged = mergeMontageEdits(rawSegments, doc);
    expect(serializeMontage("imposteur", singleTake, merged)).toBe(
      inlineMd.replace(/\(large\) /g, ""),
    );
  });
});



