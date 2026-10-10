import { describe, expect, it } from "vitest";
import type { Segment, Span, Take, Word } from "../../src/domain/timeline.js";
import { evaluateTakes } from "../../src/takes/evaluate.js";
import { parseSelectedTakes, serializeTakes } from "../../src/takes/format.js";
import { applyScriptAnnotations, parseScript } from "../../src/takes/script.js";

const w = (text: string, start: number, end: number): Word => ({ text, start, end });
const s = (start: number, end: number): Span => ({ start, end });

const sampleScript = `# Conclusion

## 00 — Hook
mot: bug

## 02 — Le problème
texte: 1. La dilution
texte: 2. Le flou artistique
mot: dilue
`;

describe("parseScript", () => {
  it("extrait le titre, les chapitres, les textes et les mots clés", () => {
    expect(parseScript(sampleScript)).toEqual({
      title: "Conclusion",
      chapters: [
        { index: 0, title: "Hook", texts: [], keywords: ["bug"] },
        { index: 2, title: "Le problème", texts: ["1. La dilution", "2. Le flou artistique"], keywords: ["dilue"] },
      ],
    });
  });
});

describe("evaluateTakes", () => {
  const takes: Take[] = [
    {
      id: "02-Probleme-1.1",
      file: "02-Probleme-1.1.mp4",
      chapterIndex: 2,
      chapter: "Probleme",
      take: 1,
      version: 1,
      duration: 25,
      words: [w("La", 1, 2), w("dilution", 2, 3), w("dilue", 10, 11)],
    },
    {
      id: "02-Probleme-1.2",
      file: "02-Probleme-1.2.mp4",
      chapterIndex: 2,
      chapter: "Probleme",
      take: 1,
      version: 2,
      duration: 20,
      words: [w("La", 1, 2), w("dilution", 2, 3), w("flou", 5, 6), w("artistique", 6, 7), w("dilue", 10, 11)],
    },
  ];

  const silences: Record<string, readonly Span[]> = {
    "02-Probleme-1.1": [s(4, 6), s(8, 9.5), s(12, 14)],
    "02-Probleme-1.2": [s(4, 4.6)],
  };

  it("recommande la prise qui couvre le mieux le script avec le moins d'hésitations", () => {
    const script = parseScript(sampleScript);
    const evals = evaluateTakes(takes, silences, script);
    expect(evals).toHaveLength(2);
    expect(evals[0]).toMatchObject({
      takeId: "02-Probleme-1.1",
      hesitationCount: 3,
      missingPoints: ["2. Le flou artistique"],
      recommended: false,
    });
    expect(evals[1]).toMatchObject({
      takeId: "02-Probleme-1.2",
      hesitationCount: 1,
      missingPoints: [],
      recommended: true,
    });
  });
});

describe("serializeTakes / parseSelectedTakes", () => {
  it("coche la prise recommandée et relit le choix de l'utilisateur", () => {
    const script = parseScript(sampleScript);
    const takes: Take[] = [
      {
        id: "00-hook-1.1",
        file: "00-hook-1.1.mp4",
        chapterIndex: 0,
        chapter: "hook",
        take: 1,
        version: 1,
        duration: 12,
        words: [w("aucun", 1, 2)],
      },
      {
        id: "00-hook-1.2",
        file: "00-hook-1.2.mp4",
        chapterIndex: 0,
        chapter: "hook",
        take: 1,
        version: 2,
        duration: 10,
        words: [w("c'est", 1, 2), w("le", 2, 3), w("bug.", 3, 4)],
      },
    ];
    const evals = evaluateTakes(takes, {}, script);
    const md = serializeTakes("conclusion", evals, script);
    expect(md).toContain("## 00 — Hook");
    expect(md).toContain("- [ ] `00-hook-1.1`");
    expect(md).toContain("- [x] `00-hook-1.2`");
    expect(parseSelectedTakes(md)).toEqual(new Set(["00-hook-1.2"]));
  });
});

describe("applyScriptAnnotations", () => {
  it("pose les annotations {mot: ...} et {texte: ...} sur les segments qui les prononcent", () => {
    const script = parseScript(sampleScript);
    const takes: Take[] = [
      { id: "02-Probleme-1.2", file: "f.mp4", chapterIndex: 2, chapter: "Probleme", take: 1, version: 2, duration: 20, words: [] },
    ];
    const segments: Segment[] = [
      { takeId: "02-Probleme-1.2", start: 0, end: 5, words: [w("Première", 1, 2), w("dilution", 2, 3)] },
      { takeId: "02-Probleme-1.2", start: 6, end: 10, words: [w("Le", 6, 7), w("message", 7, 8), w("se", 8, 9), w("dilue,", 9, 10)] },
    ];
    const annotated = applyScriptAnnotations(segments, takes, script);
    expect(annotated[0]?.annotations).toEqual(["texte: 1. La dilution"]);
    expect(annotated[1]?.annotations).toEqual(["mot: dilue"]);
  });
});
