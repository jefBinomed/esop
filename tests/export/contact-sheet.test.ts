import { describe, expect, it } from "vitest";
import { contactSheetArgs } from "../../src/export/contact-sheet.js";

describe("contactSheetArgs", () => {
  it("calcule la grille à partir de la durée et de l'intervalle", () => {
    const args = contactSheetArgs("in.mp4", "out.png", 61, { interval: 5, columns: 6, thumbnailWidth: 320 });
    const filter = args[args.indexOf("-vf") + 1];
    expect(filter).toContain("fps=1/5");
    expect(filter).toContain("tile=6x3");
    expect(args.at(-1)).toBe("out.png");
  });

  it("produit au moins une ligne pour une vidéo très courte", () => {
    const args = contactSheetArgs("in.mp4", "out.png", 1, { interval: 5, columns: 6, thumbnailWidth: 320 });
    expect(args[args.indexOf("-vf") + 1]).toContain("tile=6x1");
  });
});
