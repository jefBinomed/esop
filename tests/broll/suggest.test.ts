import { describe, expect, it } from "vitest";
import { extractAssetTokens, suggestBrolls } from "../../src/broll/suggest.js";
import type { Episode } from "../../src/domain/episode.js";

describe("broll/suggest", () => {
  describe("extractAssetTokens", () => {
    it("extrait les tokens significatifs normalisés sans accents ni stop-words", () => {
      expect(extractAssetTokens("pexels-karolina-grabowska-6632499.jpg")).toEqual([
        "karolina",
        "grabowska",
      ]);
      expect(extractAssetTokens("Logo_Réseau-Électrique-Large-12.png")).toEqual([
        "reseau",
        "electrique",
      ]);
      expect(extractAssetTokens("portrait-Photoroom.png")).toEqual(["portrait"]);
    });

    it("ignore les fichiers audio, données, rushs PXL et exports réservés", () => {
      expect(extractAssetTokens("funk-244706.mp3")).toEqual([]);
      expect(extractAssetTokens("sound.wav")).toEqual([]);
      expect(extractAssetTokens("episode.json")).toEqual([]);
      expect(extractAssetTokens("montage.md")).toEqual([]);
      expect(extractAssetTokens("projet.osp")).toEqual([]);
      expect(extractAssetTokens("PXL_20250412_164129863.mp4")).toEqual([]);
      expect(extractAssetTokens("preview.mp4")).toEqual([]);
      expect(extractAssetTokens("final.mp4")).toEqual([]);
      expect(extractAssetTokens("short-01.mp4")).toEqual([]);
      expect(extractAssetTokens("miniature-youtube.png")).toEqual([]);
    });
  });

  describe("suggestBrolls", () => {
    const baseEpisode: Episode = {
      name: "imposteur",
      sourceDir: "/rushs",
      takes: [
        {
          id: "01-intro-1.1",
          file: "/rushs/01-intro-1.1.mp4",
          chapterIndex: 1,
          chapter: "Intro",
          take: 1,
          version: 1,
          duration: 30,
          words: [],
        },
      ],
      silences: {},
      segments: [
        {
          takeId: "01-intro-1.1",
          start: 0,
          end: 4,
          words: [
            { text: "Le", start: 0, end: 0.5 },
            { text: "syndrome", start: 0.5, end: 1.5 },
            { text: "de", start: 1.5, end: 1.8 },
            { text: "l'imposteur", start: 1.8, end: 3.5 },
          ],
        },
        {
          takeId: "01-intro-1.1",
          start: 4.5,
          end: 8,
          words: [
            { text: "Toujours", start: 4.5, end: 5.2 },
            { text: "ce", start: 5.2, end: 5.5 },
            { text: "syndrome", start: 5.5, end: 6.5 },
          ],
        },
        {
          takeId: "01-intro-1.1",
          start: 8.5,
          end: 12,
          dropped: true,
          words: [
            { text: "Architecture", start: 8.5, end: 10 },
          ],
        },
        {
          takeId: "01-intro-1.1",
          start: 12.5,
          end: 16,
          annotations: ["broll: deja-present.png"],
          words: [
            { text: "Architecture", start: 12.5, end: 14 },
          ],
        },
        {
          takeId: "01-intro-1.1",
          start: 16.5,
          end: 20,
          words: [
            { text: "Une", start: 16.5, end: 17 },
            { text: "belle", start: 17, end: 17.5 },
            { text: "architecture", start: 17.5, end: 19.5 },
          ],
        },
      ],
    };

    it("suggère un B-roll pertinent par mot entier, ignore les segments coupés ou déjà annotés et évite deux suggestions identiques consécutives", () => {
      const assets = [
        "01-intro-1.1.mp4",
        "PXL_20250412.mp4",
        "funk-244706.mp3",
        "illustration-syndrome-imposteur.png",
        "schema-architecture.webp",
      ];

      const suggestions = suggestBrolls(baseEpisode, assets);

      expect(suggestions).toEqual([
        {
          segmentIndex: 0,
          takeId: "01-intro-1.1",
          start: 0,
          end: 4,
          asset: "illustration-syndrome-imposteur.png",
          matchedToken: "syndrome",
        },
        {
          segmentIndex: 4,
          takeId: "01-intro-1.1",
          start: 16.5,
          end: 20,
          asset: "schema-architecture.webp",
          matchedToken: "architecture",
        },
      ]);
    });
  });
});
