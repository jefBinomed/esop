import { describe, expect, it } from "vitest";
import { parseTakeName } from "../../src/ingest/take-name.js";

describe("parseTakeName", () => {
  it("lit la convention courante NN-chapitre-prise.version", () => {
    expect(parseTakeName("02-Probleme-3.2.mp4")).toEqual({
      chapterIndex: 2,
      chapter: "Probleme",
      take: 3,
      version: 2,
    });
  });

  it("accepte un chapitre avec des tirets", () => {
    expect(parseTakeName("04-arme-secrete-2.3.mp4")).toMatchObject({
      chapterIndex: 4,
      chapter: "arme-secrete",
      take: 2,
      version: 3,
    });
  });

  it("donne la version 1 quand elle est absente", () => {
    expect(parseTakeName("01-intro-2.mp4")).toMatchObject({ take: 2, version: 1 });
  });

  it("accepte le tiret comme séparateur de version", () => {
    expect(parseTakeName("2-choc-4-2.mp4")).toMatchObject({
      chapterIndex: 2,
      chapter: "choc",
      take: 4,
      version: 2,
    });
  });

  it("accepte les .mov et ignore la casse de l'extension", () => {
    expect(parseTakeName("00-hook-1.2.MOV")).toMatchObject({ chapter: "hook" });
  });

  it("ignore les fichiers hors convention", () => {
    expect(parseTakeName("PXL_20250412_164129863.mp4")).toBeUndefined();
    expect(parseTakeName("intro-tv.mp4")).toBeUndefined();
    expect(parseTakeName("vecteezy_times-square_1615204.mp4")).toBeUndefined();
    expect(parseTakeName("02-Probleme-3.2.png")).toBeUndefined();
  });
});
