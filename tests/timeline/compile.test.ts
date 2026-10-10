import { describe, expect, it } from "vitest";
import type { Episode } from "../../src/domain/episode.js";
import type { Segment, Take } from "../../src/domain/timeline.js";
import { compileTimeline } from "../../src/timeline/compile.js";

function makeTake(overrides: Partial<Take> & Pick<Take, "id" | "file" | "chapterIndex" | "chapter">): Take {
  return {
    take: 1,
    version: 1,
    duration: 20,
    words: [],
    ...overrides,
  };
}

describe("compileTimeline", () => {
  it("compile une timeline séquentielle en ignorant les segments coupés (dropped)", () => {
    const take = makeTake({
      id: "00-hook-1.1",
      file: "/rushs/00-hook-1.1.mp4",
      chapterIndex: 0,
      chapter: "hook",
    });
    const segments: Segment[] = [
      {
        takeId: "00-hook-1.1",
        start: 1.0,
        end: 4.0,
        framing: "large",
        words: [
          { text: "Bonjour", start: 1.0, end: 1.5 },
          { text: "à", start: 1.5, end: 1.7 },
          { text: "tous", start: 1.7, end: 2.2 },
        ],
      },
      {
        takeId: "00-hook-1.1",
        start: 4.5,
        end: 6.5,
        dropped: true,
        words: [{ text: "euh", start: 4.5, end: 5.0 }],
      },
      {
        takeId: "00-hook-1.1",
        start: 7.0,
        end: 9.0,
        framing: "serré",
        words: [
          { text: "C'est", start: 7.0, end: 7.4 },
          { text: "parti.", start: 7.4, end: 8.0 },
        ],
      },
    ];
    const episode: Episode = {
      name: "test-ep",
      sourceDir: "/rushs",
      takes: [take],
      silences: {},
      segments,
    };

    const timeline = compileTimeline(episode);

    expect(timeline.fps).toBe(30);
    expect(timeline.width).toBe(1920);
    expect(timeline.height).toBe(1080);
    expect(timeline.chapters).toEqual([]);
    expect(timeline.shots).toHaveLength(2);

    const [shot1, shot2] = timeline.shots;
    expect(shot1).toMatchObject({
      takeId: "00-hook-1.1",
      file: "/rushs/00-hook-1.1.mp4",
      trimBefore: 1.0,
      trimAfter: 4.0,
      start: 0,
      end: 3.0,
      startFrame: 0,
      durationInFrames: 90,
      framing: "large",
    });
    expect(shot1?.words).toEqual([
      { text: "Bonjour", start: 1.0, end: 1.5, timelineStart: 0, timelineEnd: 0.5 },
      { text: "à", start: 1.5, end: 1.7, timelineStart: 0.5, timelineEnd: 0.7 },
      { text: "tous", start: 1.7, end: 2.2, timelineStart: 0.7, timelineEnd: 1.2 },
    ]);

    expect(shot2).toMatchObject({
      takeId: "00-hook-1.1",
      file: "/rushs/00-hook-1.1.mp4",
      trimBefore: 7.0,
      trimAfter: 9.0,
      start: 3.0,
      end: 5.0,
      startFrame: 90,
      durationInFrames: 60,
      framing: "serré",
    });
    expect(shot2?.words).toEqual([
      { text: "C'est", start: 7.0, end: 7.4, timelineStart: 3.0, timelineEnd: 3.4 },
      { text: "parti.", start: 7.4, end: 8.0, timelineStart: 3.4, timelineEnd: 4.0 },
    ]);

    expect(timeline.captions).toEqual([
      {
        start: 0,
        end: 1.2,
        startFrame: 0,
        durationInFrames: 36,
        words: [
          { text: "Bonjour", start: 1.0, end: 1.5, timelineStart: 0, timelineEnd: 0.5 },
          { text: "à", start: 1.5, end: 1.7, timelineStart: 0.5, timelineEnd: 0.7 },
          { text: "tous", start: 1.7, end: 2.2, timelineStart: 0.7, timelineEnd: 1.2 },
        ],
      },
      {
        start: 3.0,
        end: 4.0,
        startFrame: 90,
        durationInFrames: 30,
        words: [
          { text: "C'est", start: 7.0, end: 7.4, timelineStart: 3.0, timelineEnd: 3.4 },
          { text: "parti.", start: 7.4, end: 8.0, timelineStart: 3.4, timelineEnd: 4.0 },
        ],
      },
    ]);

    expect(timeline.duration).toBe(5.0);
    expect(timeline.durationInFrames).toBe(150);
  });

  it("insère des cartes de chapitre à chaque changement de chapitre et décale les plans", () => {
    const take0 = makeTake({
      id: "00-hook-1.2",
      file: "/rushs/00-hook-1.2.mp4",
      chapterIndex: 0,
      chapter: "Hook",
    });
    const take2 = makeTake({
      id: "02-Probleme-1.2",
      file: "/rushs/02-Probleme-1.2.mp4",
      chapterIndex: 2,
      chapter: "Le problème",
    });
    const episode: Episode = {
      name: "conclusion",
      sourceDir: "/rushs",
      takes: [take0, take2],
      silences: {},
      segments: [
        {
          takeId: "00-hook-1.2",
          start: 0.5,
          end: 3.5,
          framing: "large",
          words: [{ text: "Lundi", start: 0.5, end: 1.0 }],
        },
        {
          takeId: "02-Probleme-1.2",
          start: 1.0,
          end: 5.0,
          framing: "large",
          words: [{ text: "Problème", start: 1.0, end: 1.8 }],
        },
        {
          takeId: "02-Probleme-1.2",
          start: 5.5,
          end: 7.5,
          framing: "serré",
          words: [{ text: "Suite", start: 5.5, end: 6.0 }],
        },
      ],
    };

    const timeline = compileTimeline(episode);

    expect(timeline.chapters).toEqual([
      {
        chapterIndex: 0,
        title: "Hook",
        start: 0,
        end: 2.0,
        startFrame: 0,
        durationInFrames: 60,
      },
      {
        chapterIndex: 2,
        title: "Le problème",
        start: 5.0,
        end: 7.0,
        startFrame: 150,
        durationInFrames: 60,
      },
    ]);

    expect(timeline.shots.map((s) => ({ start: s.start, end: s.end, startFrame: s.startFrame }))).toEqual([
      { start: 2.0, end: 5.0, startFrame: 60 },
      { start: 7.0, end: 11.0, startFrame: 210 },
      { start: 11.0, end: 13.0, startFrame: 330 },
    ]);
    expect(timeline.duration).toBe(13.0);
    expect(timeline.durationInFrames).toBe(390);
  });

  it("permet de désactiver le décalage des cartes de chapitre avec chapterDuration: 0", () => {
    const take0 = makeTake({
      id: "00-hook-1.2",
      file: "/rushs/00-hook-1.2.mp4",
      chapterIndex: 0,
      chapter: "Hook",
    });
    const take2 = makeTake({
      id: "02-Probleme-1.2",
      file: "/rushs/02-Probleme-1.2.mp4",
      chapterIndex: 2,
      chapter: "Le problème",
    });
    const episode: Episode = {
      name: "conclusion",
      sourceDir: "/rushs",
      takes: [take0, take2],
      silences: {},
      segments: [
        { takeId: "00-hook-1.2", start: 0, end: 2, words: [] },
        { takeId: "02-Probleme-1.2", start: 0, end: 3, words: [] },
      ],
    };

    const timeline = compileTimeline(episode, { chapterDuration: 0 });
    expect(timeline.shots.map((s) => ({ start: s.start, end: s.end }))).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 5 },
    ]);
    expect(timeline.duration).toBe(5);
  });

  it("extrait les annotations {broll}, {texte} et {mot} calées sur la timeline", () => {
    const take = makeTake({
      id: "02-Probleme-1.2",
      file: "/rushs/02-Probleme-1.2.mp4",
      chapterIndex: 2,
      chapter: "Le problème",
    });
    const episode: Episode = {
      name: "conclusion",
      sourceDir: "/rushs",
      takes: [take],
      silences: {},
      segments: [
        {
          takeId: "02-Probleme-1.2",
          start: 0.3,
          end: 4.3,
          annotations: [
            "broll: gemini-sac-de-noeud.mp4",
            "broll: schema-architecture.png",
            "texte: 1. La dilution",
            "mot: dilue",
          ],
          words: [
            { text: "Le", start: 0.3, end: 0.6 },
            { text: "message", start: 0.6, end: 1.2 },
            { text: "se", start: 1.2, end: 1.5 },
            { text: "dilue,", start: 1.5, end: 2.1 },
            { text: "complètement.", start: 2.1, end: 3.5 },
          ],
        },
        {
          takeId: "02-Probleme-1.2",
          start: 5.0,
          end: 5.8,
          annotations: ["mot: introuvable"],
          words: [{ text: "Court", start: 5.0, end: 5.5 }],
        },
      ],
    };

    const timeline = compileTimeline(episode, { chapterDuration: 2.0 });

    // Le premier segment démarre à t=2.0s (après la carte de chapitre de 2.0s) et finit à t=6.0s
    expect(timeline.brolls).toEqual([
      {
        takeId: "02-Probleme-1.2",
        asset: "gemini-sac-de-noeud.mp4",
        isVideo: true,
        start: 2.0,
        end: 6.0,
        startFrame: 60,
        durationInFrames: 120,
      },
      {
        takeId: "02-Probleme-1.2",
        asset: "schema-architecture.png",
        isVideo: false,
        start: 2.0,
        end: 6.0,
        startFrame: 60,
        durationInFrames: 120,
      },
    ]);

    expect(timeline.texts).toEqual([
      {
        takeId: "02-Probleme-1.2",
        text: "1. La dilution",
        start: 2.0,
        end: 6.0,
        startFrame: 60,
        durationInFrames: 120,
      },
    ]);

    // "dilue," est prononcé à 1.5s dans le rush -> 2.0 + (1.5 - 0.3) = 3.2s dans la timeline, durée 1.2s -> 4.4s
    // "introuvable" est absent -> repli sur shot.start (6.0s), borné à shot.end (6.8s)
    expect(timeline.keywords).toEqual([
      {
        takeId: "02-Probleme-1.2",
        word: "dilue",
        start: 3.2,
        end: 4.4,
        startFrame: 96,
        durationInFrames: 36,
      },
      {
        takeId: "02-Probleme-1.2",
        word: "introuvable",
        start: 6.0,
        end: 6.8,
        startFrame: 180,
        durationInFrames: 24,
      },
    ]);
  });

  it("gère includeChapterCards: true même sur un chapitre unique d'indice 0 et lève une erreur si une prise est inconnue", () => {
    const take0 = makeTake({
      id: "00-hook-1.1",
      file: "/rushs/00-hook-1.1.mp4",
      chapterIndex: 0,
      chapter: "Introduction",
    });
    const episode: Episode = {
      name: "intro",
      sourceDir: "/rushs",
      takes: [take0],
      silences: {},
      segments: [{ takeId: "00-hook-1.1", start: 0, end: 1.5, words: [] }],
    };

    const withCard = compileTimeline(episode, { includeChapterCards: true, fps: 60, width: 1280, height: 720 });
    expect(withCard.fps).toBe(60);
    expect(withCard.width).toBe(1280);
    expect(withCard.height).toBe(720);
    expect(withCard.chapters).toEqual([
      {
        chapterIndex: 0,
        title: "Introduction",
        start: 0,
        end: 2.0,
        startFrame: 0,
        durationInFrames: 120,
      },
    ]);
    expect(withCard.duration).toBe(3.5);
    expect(withCard.durationInFrames).toBe(210);

    const brokenEpisode: Episode = {
      ...episode,
      segments: [{ takeId: "inconnue", start: 0, end: 1, words: [] }],
    };
    expect(() => compileTimeline(brokenEpisode)).toThrow(/prise inconnue/);
  });

  it("génère des cartes de chapitre à partir de segment.chapterIndex sur un rush unique (et omet la carte du chapitre 0 sauf si includeChapterCards: true)", () => {
    const singleTake = makeTake({
      id: "PXL_20250412",
      file: "/rushs/PXL_20250412.mp4",
      chapterIndex: 0,
      chapter: "rush",
    });
    const episode: Episode = {
      name: "imposteur",
      sourceDir: "/rushs",
      takes: [singleTake],
      silences: {},
      segments: [
        {
          takeId: "PXL_20250412",
          start: 0.5,
          end: 3.5,
          framing: "large",
          chapterIndex: 0,
          chapter: "Hook",
          words: [{ text: "Salut", start: 0.5, end: 1.0 }],
        },
        {
          takeId: "PXL_20250412",
          start: 26.0,
          end: 30.0,
          framing: "large",
          chapterIndex: 1,
          chapter: "Anecdote personnelle",
          words: [{ text: "Anecdote", start: 26.0, end: 27.0 }],
        },
      ],
    };

    const timeline = compileTimeline(episode);
    expect(timeline.chapters).toEqual([
      {
        chapterIndex: 1,
        title: "Anecdote personnelle",
        start: 3.0,
        end: 5.0,
        startFrame: 90,
        durationInFrames: 60,
      },
    ]);
    expect(timeline.shots.map((s) => ({ start: s.start, end: s.end, startFrame: s.startFrame }))).toEqual([
      { start: 0, end: 3.0, startFrame: 0 },
      { start: 5.0, end: 9.0, startFrame: 150 },
    ]);
  });
});

