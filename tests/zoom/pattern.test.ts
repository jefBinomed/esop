import { describe, expect, it } from "vitest";
import { cropRect } from "../../src/zoom/framing.js";
import { applyFramingPattern } from "../../src/zoom/pattern.js";
import type { Segment } from "../../src/domain/timeline.js";

const seg = (takeId: string, start: number, end: number, extra: Partial<Segment> = {}): Segment => ({
  takeId,
  start,
  end,
  words: [],
  ...extra,
});

const framings = (segments: readonly Segment[]) => segments.map((s) => s.framing);

describe("applyFramingPattern", () => {
  it("alterne large et serré à chaque coupe, en commençant large", () => {
    const out = applyFramingPattern([seg("t", 0, 3), seg("t", 4, 7), seg("t", 8, 11)]);
    expect(framings(out)).toEqual(["large", "serré", "large"]);
  });

  it("repart en large au changement de prise", () => {
    const out = applyFramingPattern([seg("a", 0, 3), seg("a", 4, 7), seg("b", 0, 3)]);
    expect(framings(out)).toEqual(["large", "serré", "large"]);
  });

  it("garde le cadrage précédent sur un segment trop court", () => {
    const out = applyFramingPattern([seg("t", 0, 3), seg("t", 4, 4.5), seg("t", 5, 8)]);
    expect(framings(out)).toEqual(["large", "large", "serré"]);
  });

  it("respecte un cadrage posé à la main et relance l'alternance derrière", () => {
    const out = applyFramingPattern([seg("t", 0, 3), seg("t", 4, 7, { framing: "large" }), seg("t", 8, 11)]);
    expect(framings(out)).toEqual(["large", "large", "serré"]);
  });

  it("laisse les segments coupés sans cadrage et sans effet sur l'alternance", () => {
    const out = applyFramingPattern([seg("t", 0, 3), seg("t", 4, 7, { dropped: true }), seg("t", 8, 11)]);
    expect(framings(out)).toEqual(["large", undefined, "serré"]);
  });
});

describe("cropRect", () => {
  it("découpe une fenêtre paire recentrée à 40 % de la largeur", () => {
    expect(cropRect(1920, 1080, "serré")).toEqual({ width: 1128, height: 634, x: 204, y: 223 });
  });

  it("reste dans l'image quand le centre est près d'un bord", () => {
    const rect = cropRect(1920, 1080, "large");
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(1920);
    expect(rect.y + rect.height).toBeLessThanOrEqual(1080);
  });
});
