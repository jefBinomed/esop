import { describe, expect, it } from "vitest";
import { parseSilenceLog } from "../../src/cut/silences.js";

const log = `
[silencedetect @ 0x1] silence_start: 6.46
[silencedetect @ 0x1] silence_end: 6.94 | silence_duration: 0.48
frame= 1000 fps=0.0 q=-0.0 size=N/A
[silencedetect @ 0x1] silence_start: 12.72
[silencedetect @ 0x1] silence_end: 13.7 | silence_duration: 0.98
[silencedetect @ 0x1] silence_start: 490.5
`;

describe("parseSilenceLog", () => {
  it("lit les couples start/end de silencedetect", () => {
    expect(parseSilenceLog(log, 491.1)).toEqual([
      { start: 6.46, end: 6.94 },
      { start: 12.72, end: 13.7 },
      { start: 490.5, end: 491.1 },
    ]);
  });

  it("ferme un silence final sans fin sur la durée du média", () => {
    expect(parseSilenceLog("silence_start: 10\n", 12)).toEqual([{ start: 10, end: 12 }]);
  });

  it("renvoie une liste vide sans silence", () => {
    expect(parseSilenceLog("frame= 12\n", 5)).toEqual([]);
  });
});
