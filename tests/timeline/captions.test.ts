import { describe, expect, it } from "vitest";
import { activeWordIndex, buildCaptionPages } from "../../src/timeline/captions.js";
import type { TalkShot, TimelineWord } from "../../src/timeline/compile.js";

function makeWord(text: string, timelineStart: number, timelineEnd: number): TimelineWord {
  return {
    text,
    start: timelineStart,
    end: timelineEnd,
    timelineStart,
    timelineEnd,
  };
}

function makeShot(words: readonly TimelineWord[], start = 0, end = 10): TalkShot {
  return {
    takeId: "take-1",
    file: "/rushs/take-1.mp4",
    trimBefore: start,
    trimAfter: end,
    start,
    end,
    startFrame: Math.round(start * 30),
    durationInFrames: Math.max(1, Math.round((end - start) * 30)),
    framing: "large",
    words,
  };
}

describe("buildCaptionPages", () => {
  it("ignore les plans sans mots", () => {
    const pages = buildCaptionPages([makeShot([])]);
    expect(pages).toEqual([]);
  });

  it("regroupe les mots par paquets de 3 par défaut avec calcul des frames à 30 fps", () => {
    const shot = makeShot([
      makeWord("Lundi", 0.0, 0.3),
      makeWord("soir", 0.3, 0.6),
      makeWord("votre", 0.6, 0.9),
      makeWord("pote", 0.9, 1.2),
      makeWord("sort", 1.2, 1.6),
    ]);

    const pages = buildCaptionPages([shot]);

    expect(pages).toHaveLength(2);
    expect(pages[0]).toEqual({
      start: 0.0,
      end: 0.9,
      startFrame: 0,
      durationInFrames: 27,
      words: [
        makeWord("Lundi", 0.0, 0.3),
        makeWord("soir", 0.3, 0.6),
        makeWord("votre", 0.6, 0.9),
      ],
    });
    expect(pages[1]).toEqual({
      start: 0.9,
      end: 1.6,
      startFrame: 27,
      durationInFrames: 21,
      words: [
        makeWord("pote", 0.9, 1.2),
        makeWord("sort", 1.2, 1.6),
      ],
    });
  });

  it("coupe la page avant le mot suivant si l'écart dépasse maxGapSeconds (0.4s par défaut)", () => {
    const shot = makeShot([
      makeWord("Bonjour", 1.0, 1.4),
      makeWord("tout", 2.0, 2.2), // gap = 0.6s > 0.4s
      makeWord("le", 2.2, 2.4),
      makeWord("monde", 2.4, 2.8),
    ]);

    const pages = buildCaptionPages([shot]);

    expect(pages).toHaveLength(2);
    expect(pages[0]?.words.map((w) => w.text)).toEqual(["Bonjour"]);
    expect(pages[0]?.start).toBe(1.0);
    expect(pages[0]?.end).toBe(1.4);
    expect(pages[1]?.words.map((w) => w.text)).toEqual(["tout", "le", "monde"]);
    expect(pages[1]?.start).toBe(2.0);
    expect(pages[1]?.end).toBe(2.8);
  });

  it("coupe la page après un mot terminé par une ponctuation forte (. ? ! : ;)", () => {
    const shot = makeShot([
      makeWord("C'est", 0.0, 0.2),
      makeWord("vrai.", 0.2, 0.5),
      makeWord("Mais", 0.55, 0.8),
      makeWord("pourquoi?", 0.8, 1.2),
      makeWord("Parce", 1.25, 1.5),
      makeWord("que!", 1.5, 1.8),
      makeWord("Attention:", 1.85, 2.2),
      makeWord("voici;", 2.25, 2.5),
      makeWord("la", 2.55, 2.7),
      makeWord("suite", 2.7, 3.0),
    ]);

    const pages = buildCaptionPages([shot]);

    expect(pages.map((p) => p.words.map((w) => w.text))).toEqual([
      ["C'est", "vrai."],
      ["Mais", "pourquoi?"],
      ["Parce", "que!"],
      ["Attention:"],
      ["voici;"],
      ["la", "suite"],
    ]);
  });

  it("ne fusionne jamais les mots de deux plans (shots) distincts et respecte les options personnalisées", () => {
    const shot1 = makeShot([makeWord("Un", 0.0, 0.2)], 0, 1);
    const shot2 = makeShot(
      [
        makeWord("Deux", 1.0, 1.2),
        makeWord("Trois", 1.2, 1.4),
        makeWord("Quatre", 1.4, 1.4), // durée nulle -> durationInFrames bornée à 1
      ],
      1,
      2,
    );

    const pages = buildCaptionPages([shot1, shot2], {
      fps: 60,
      maxWordsPerPage: 2,
      maxGapSeconds: 0.5,
    });

    expect(pages.map((p) => p.words.map((w) => w.text))).toEqual([
      ["Un"],
      ["Deux", "Trois"],
      ["Quatre"],
    ]);
    expect(pages[1]?.startFrame).toBe(60);
    expect(pages[1]?.durationInFrames).toBe(24);
    expect(pages[2]?.durationInFrames).toBe(1);
  });

  it("identifie l'indice du mot actif ou se replie sur le dernier mot commencé", () => {
    const words = [
      makeWord("Un", 1.0, 1.3),
      makeWord("Deux", 1.4, 1.7),
      makeWord("Trois", 1.8, 2.1),
    ];

    expect(activeWordIndex(words, 0.95)).toBe(0);
    expect(activeWordIndex(words, 1.15)).toBe(0);
    expect(activeWordIndex(words, 1.35)).toBe(0); // dans le creux entre Un et Deux -> dernier mot commencé = 0
    expect(activeWordIndex(words, 1.5)).toBe(1);
    expect(activeWordIndex(words, 1.75)).toBe(1); // dans le creux entre Deux et Trois -> dernier mot commencé = 1
    expect(activeWordIndex(words, 2.0)).toBe(2);
  });
});

