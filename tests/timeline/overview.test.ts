import { describe, expect, it } from "vitest";
import type { CompiledTimeline, TalkShot } from "../../src/timeline/compile.js";
import {
  formatCompactTime,
  formatShotSequenceName,
  summarizeTimelineMedia,
} from "../../src/timeline/overview.js";

function makeShot(overrides: Partial<TalkShot> = {}): TalkShot {
  return {
    takeId: "PXL_20250412_164129863",
    file: "/episodes/ep1/rushs/PXL_20250412_164129863.mp4",
    trimBefore: 0,
    trimAfter: 2.4,
    start: 0,
    end: 2.4,
    startFrame: 0,
    durationInFrames: 72,
    framing: "large",
    words: [
      { text: "Tu", start: 0, end: 0.3, timelineStart: 0, timelineEnd: 0.3 },
      { text: "t'es", start: 0.3, end: 0.6, timelineStart: 0.3, timelineEnd: 0.6 },
      { text: "déjà", start: 0.6, end: 1.0, timelineStart: 0.6, timelineEnd: 1.0 },
      { text: "demandé", start: 1.0, end: 1.5, timelineStart: 1.0, timelineEnd: 1.5 },
      { text: "pourquoi", start: 1.5, end: 1.9, timelineStart: 1.5, timelineEnd: 1.9 },
      { text: "ton", start: 1.9, end: 2.1, timelineStart: 1.9, timelineEnd: 2.1 },
      { text: "cerveau", start: 2.1, end: 2.4, timelineStart: 2.1, timelineEnd: 2.4 },
    ],
    ...overrides,
  };
}

describe("formatCompactTime", () => {
  it("formate des secondes en mm:ss par défaut", () => {
    expect(formatCompactTime(0)).toBe("00:00");
    expect(formatCompactTime(5.2)).toBe("00:05");
    expect(formatCompactTime(65.4)).toBe("01:05");
    expect(formatCompactTime(600)).toBe("10:00");
  });

  it("formate avec décimales optionnelles quand demandé", () => {
    expect(formatCompactTime(30.549, 3)).toBe("00:30.549");
    expect(formatCompactTime(65.4, 1)).toBe("01:05.4");
  });
});

describe("formatShotSequenceName", () => {
  it("génère un libellé lisible avec numéro, cadrage, rush, timecode source et texte tronqué", () => {
    const shot = makeShot();
    const label = formatShotSequenceName(shot, 0);

    expect(label).toContain("🎬 #001 [large] PXL_20250412_164129863 (00:00→00:02) — ");
    expect(label).toContain("Tu t'es déjà demandé");
    expect(label.endsWith("...")).toBe(true);
  });

  it("ne tronque pas un texte court et gère un plan sans mots", () => {
    const shortShot = makeShot({
      framing: "serré",
      trimBefore: 65,
      trimAfter: 68,
      words: [{ text: "Bonjour !", start: 65, end: 66, timelineStart: 0, timelineEnd: 1 }],
    });
    expect(formatShotSequenceName(shortShot, 11)).toBe(
      "🎬 #012 [serré] PXL_20250412_164129863 (01:05→01:08) — Bonjour !",
    );

    const silentShot = makeShot({ words: [] });
    expect(formatShotSequenceName(silentShot, 2)).toBe(
      "🎬 #003 [large] PXL_20250412_164129863 (00:00→00:02)",
    );
  });
});

describe("summarizeTimelineMedia", () => {
  it("agrège les rushs par fichier, les B-rolls par asset et les chapitres", () => {
    const timeline: CompiledTimeline = {
      fps: 30,
      width: 1920,
      height: 1080,
      duration: 12,
      durationInFrames: 360,
      chapters: [
        {
          chapterIndex: 1,
          title: "Introduction",
          start: 0,
          end: 2,
          startFrame: 0,
          durationInFrames: 60,
        },
      ],
      shots: [
        makeShot({
          takeId: "rush-1",
          file: "/rushs/rush-1.mp4",
          trimBefore: 10,
          trimAfter: 14,
          start: 2,
          end: 6,
          framing: "large",
        }),
        makeShot({
          takeId: "rush-1",
          file: "/rushs/rush-1.mp4",
          trimBefore: 20,
          trimAfter: 23,
          start: 6,
          end: 9,
          framing: "serré",
        }),
        makeShot({
          takeId: "rush-2",
          file: "/rushs/rush-2.mp4",
          trimBefore: 0,
          trimAfter: 3,
          start: 9,
          end: 12,
          framing: "large",
        }),
      ],
      brolls: [
        {
          takeId: "rush-1",
          asset: "schema.png",
          isVideo: false,
          start: 2,
          end: 6,
          startFrame: 60,
          durationInFrames: 120,
        },
        {
          takeId: "rush-2",
          asset: "schema.png",
          isVideo: false,
          start: 9,
          end: 12,
          startFrame: 270,
          durationInFrames: 90,
        },
      ],
      texts: [],
      keywords: [],
      captions: [],
    };

    const summary = summarizeTimelineMedia(timeline);

    expect(summary.totalShots).toBe(3);
    expect(summary.totalDuration).toBe(12);
    expect(summary.chapters).toHaveLength(1);
    expect(summary.rushes).toEqual([
      {
        file: "/rushs/rush-1.mp4",
        takeId: "rush-1",
        shotCount: 2,
        totalDuration: 7,
        largeCount: 1,
        serreCount: 1,
      },
      {
        file: "/rushs/rush-2.mp4",
        takeId: "rush-2",
        shotCount: 1,
        totalDuration: 3,
        largeCount: 1,
        serreCount: 0,
      },
    ]);
    expect(summary.brolls).toHaveLength(1);
    expect(summary.brolls[0]?.asset).toBe("schema.png");
    expect(summary.brolls[0]?.count).toBe(2);
    expect(summary.brolls[0]?.firstStart).toBe(2);
    expect(summary.brolls[0]?.occurrences).toHaveLength(2);
  });
});
