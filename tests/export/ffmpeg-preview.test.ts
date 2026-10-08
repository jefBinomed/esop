import { describe, expect, it } from "vitest";
import { planPreview } from "../../src/export/ffmpeg-preview.js";
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
  it("découpe, recadre, met à l'échelle et concatène les segments gardés", () => {
    const segments: Segment[] = [
      { takeId: "a", start: 1, end: 3.5, framing: "large", words: [] },
      { takeId: "a", start: 4, end: 6, dropped: true, words: [] },
      { takeId: "b", start: 0, end: 2, framing: "serré", words: [] },
    ];
    const plan = planPreview([take("a"), take("b")], segments, sizes, { width: 960 });
    expect(plan.inputs).toEqual(["/rushs/a.mp4", "/rushs/b.mp4"]);
    expect(plan.filterScript).toBe(
      [
        "[0:v]trim=start=1:end=3.5,setpts=PTS-STARTPTS,crop=1728:972:0:54,scale=960:540[v0];",
        "[0:a]atrim=start=1:end=3.5,asetpts=PTS-STARTPTS[a0];",
        "[1:v]trim=start=0:end=2,setpts=PTS-STARTPTS,crop=1128:634:204:223,scale=960:540[v1];",
        "[1:a]atrim=start=0:end=2,asetpts=PTS-STARTPTS[a1];",
        "[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]",
        "",
      ].join("\n"),
    );
  });

  it("refuse un plan sans segment conservé", () => {
    expect(() => planPreview([take("a")], [{ takeId: "a", start: 0, end: 1, dropped: true, words: [] }], sizes)).toThrow(
      /aucun segment/,
    );
  });
});
