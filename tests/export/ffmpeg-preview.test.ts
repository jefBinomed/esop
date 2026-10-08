import { describe, expect, it } from "vitest";
import { extractArgs, planPreview } from "../../src/export/ffmpeg-preview.js";
import type { Segment, Take } from "../../src/domain/timeline.js";

const take = (id: string): Take => ({
  id,
  file: `/rushs/${id}.mp4`,
  chapterIndex: 0,
  chapter: "x",
  take: 1,
  version: 1,
  duration: 100,
  words: [],
});
const sizes = { a: { width: 1920, height: 1080 }, b: { width: 1920, height: 1080 } };

describe("planPreview", () => {
  it("prépare une extraction recadrée par segment gardé", () => {
    const segments: Segment[] = [
      { takeId: "a", start: 1, end: 3.5, framing: "large", words: [] },
      { takeId: "a", start: 4, end: 6, dropped: true, words: [] },
      { takeId: "b", start: 0, end: 2, framing: "serré", words: [] },
    ];
    expect(planPreview([take("a"), take("b")], segments, sizes, { width: 960 })).toEqual([
      { input: "/rushs/a.mp4", start: 1, duration: 2.5, filter: "crop=1728:972:192:0,scale=960:540,setsar=1" },
      { input: "/rushs/b.mp4", start: 0, duration: 2, filter: "crop=1128:634:722:137,scale=960:540,setsar=1" },
    ]);
  });

  it("refuse un plan sans segment conservé", () => {
    expect(() => planPreview([take("a")], [{ takeId: "a", start: 0, end: 1, dropped: true, words: [] }], sizes)).toThrow(
      /aucun segment/,
    );
  });
});

describe("extractArgs", () => {
  it("cherche avant d'ouvrir l'entrée et active le décodage matériel demandé", () => {
    const args = extractArgs({ input: "in.mp4", start: 12.5, duration: 3, filter: "f" }, "out.mp4", "videotoolbox");
    expect(args.indexOf("-ss")).toBeLessThan(args.indexOf("-i"));
    expect(args).toContain("videotoolbox");
    expect(args.at(-1)).toBe("out.mp4");
  });

  it("se passe de décodage matériel quand aucun n'est fourni", () => {
    expect(extractArgs({ input: "in.mp4", start: 0, duration: 1, filter: "f" }, "o.mp4", undefined)).not.toContain("-hwaccel");
  });
});
