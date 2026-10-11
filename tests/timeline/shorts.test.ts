import { describe, expect, it } from "vitest";
import type { Episode } from "../../src/domain/episode.js";
import { compileShort } from "../../src/timeline/shorts.js";

const multiChapterEpisode: Episode = {
  name: "imposteur",
  sourceDir: "/rushs",
  takes: [
    {
      id: "PXL_20250412",
      file: "/rushs/PXL_20250412.mp4",
      chapterIndex: 0,
      chapter: "rush",
      take: 1,
      version: 1,
      duration: 120,
      words: [],
    },
  ],
  silences: {},
  segments: [
    {
      takeId: "PXL_20250412",
      start: 0,
      end: 10,
      chapterIndex: 0,
      chapter: "Hook",
      framing: "large",
      words: [{ text: "Intro", start: 0, end: 1 }],
    },
    {
      takeId: "PXL_20250412",
      start: 12,
      end: 32,
      chapterIndex: 1,
      chapter: "Anecdote personnelle",
      framing: "large",
      words: [{ text: "Première", start: 12, end: 13 }],
    },
    {
      takeId: "PXL_20250412",
      start: 33,
      end: 58,
      chapterIndex: 1,
      chapter: "Anecdote personnelle",
      framing: "serré",
      words: [{ text: "Deuxième", start: 33, end: 34 }],
    },
    {
      takeId: "PXL_20250412",
      start: 60,
      end: 85,
      chapterIndex: 1,
      chapter: "Anecdote personnelle",
      framing: "large",
      words: [{ text: "Troisième", start: 60, end: 61 }],
    },
    {
      takeId: "PXL_20250412",
      start: 90,
      end: 105,
      chapterIndex: 2,
      chapter: "Trois astuces",
      framing: "serré",
      annotations: ["short: astuce"],
      words: [{ text: "Astuce", start: 90, end: 91 }],
    },
  ],
};

describe("timeline/shorts", () => {
  it("sélectionne par défaut les segments annotés {short: ...} s'il en existe, en 1080×1920 sans carte de chapitre", () => {
    const short = compileShort(multiChapterEpisode);

    expect(short.title).toBe("Trois astuces");
    expect(short.timeline.width).toBe(1080);
    expect(short.timeline.height).toBe(1920);
    expect(short.timeline.fps).toBe(30);
    expect(short.timeline.chapters).toEqual([]);
    expect(short.timeline.shots).toHaveLength(1);
    expect(short.timeline.duration).toBe(15);
  });

  it("filtre par chapterIndex et borne la durée à maxDurationSeconds (60 s par défaut)", () => {
    const short = compileShort(multiChapterEpisode, { chapterIndex: 1, maxDurationSeconds: 50 });

    expect(short.title).toBe("Anecdote personnelle");
    expect(short.timeline.width).toBe(1080);
    expect(short.timeline.height).toBe(1920);
    expect(short.timeline.chapters).toEqual([]);
    // 20s + 25s = 45s <= 50s (le 3e segment de 25s ferait 70s > 50s)
    expect(short.timeline.shots).toHaveLength(2);
    expect(short.timeline.duration).toBe(45);
  });

  it("se replie sur le chapitre 1 quand aucune annotation {short} n'est présente", () => {
    const withoutShortTag: Episode = {
      ...multiChapterEpisode,
      segments: (multiChapterEpisode.segments ?? []).map((s) => {
        const { annotations: _a, ...rest } = s;
        return rest;
      }),
    };

    const short = compileShort(withoutShortTag);
    expect(short.title).toBe("Anecdote personnelle");
    // 20s + 25s = 45s <= 60s
    expect(short.timeline.shots).toHaveLength(2);
    expect(short.timeline.duration).toBe(45);
  });
});
