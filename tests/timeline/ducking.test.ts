import { describe, expect, it } from "vitest";
import { musicVolumeAt } from "../../src/timeline/ducking.js";

describe("musicVolumeAt", () => {
  it("retourne le volume plein hors des segments de parole", () => {
    const shots = [{ start: 2.0, end: 5.0 }];
    expect(musicVolumeAt(0, shots)).toBe(1.0);
    expect(musicVolumeAt(1.5, shots)).toBe(1.0);
    expect(musicVolumeAt(5.5, shots)).toBe(1.0);
  });

  it("retourne le volume atténué (0.2 par défaut) pendant la parole", () => {
    const shots = [{ start: 2.0, end: 5.0 }];
    expect(musicVolumeAt(2.0, shots)).toBeCloseTo(0.2, 5);
    expect(musicVolumeAt(3.5, shots)).toBeCloseTo(0.2, 5);
    expect(musicVolumeAt(5.0, shots)).toBeCloseTo(0.2, 5);
  });

  it("applique un fondu linéaire doux en entrée et en sortie de parole", () => {
    const shots = [{ start: 2.0, end: 5.0 }];
    // fadeDuration par défaut = 0.25s -> entrée sur [1.75, 2.0], sortie sur [5.0, 5.25]
    expect(musicVolumeAt(1.75, shots)).toBeCloseTo(1.0, 5);
    expect(musicVolumeAt(1.875, shots)).toBeCloseTo(0.6, 5);
    expect(musicVolumeAt(2.0, shots)).toBeCloseTo(0.2, 5);

    expect(musicVolumeAt(5.0, shots)).toBeCloseTo(0.2, 5);
    expect(musicVolumeAt(5.125, shots)).toBeCloseTo(0.6, 5);
    expect(musicVolumeAt(5.25, shots)).toBeCloseTo(1.0, 5);
  });

  it("maintient le volume à duckedVolume entre deux plans séparés par moins de 2 * fadeDuration", () => {
    const shots = [
      { start: 2.0, end: 5.0 },
      { start: 5.0, end: 8.0 }, // coupe franche (écart 0s)
      { start: 8.3, end: 10.0 }, // écart 0.3s < 2 * 0.25s (0.5s)
    ];

    expect(musicVolumeAt(5.0, shots)).toBeCloseTo(0.2, 5);
    expect(musicVolumeAt(8.0, shots)).toBeCloseTo(0.2, 5);
    expect(musicVolumeAt(8.15, shots)).toBeCloseTo(0.2, 5);
    expect(musicVolumeAt(8.3, shots)).toBeCloseTo(0.2, 5);
  });

  it("remonte le volume pendant une carte de chapitre plus longue que 2 * fadeDuration", () => {
    const shots = [
      { start: 2.0, end: 5.0 },
      { start: 7.0, end: 10.0 }, // carte de chapitre de 2.0s entre 5.0 et 7.0
    ];

    expect(musicVolumeAt(5.125, shots)).toBeCloseTo(0.6, 5);
    expect(musicVolumeAt(6.0, shots)).toBeCloseTo(1.0, 5);
    expect(musicVolumeAt(6.875, shots)).toBeCloseTo(0.6, 5);
  });

  it("respecte les options personnalisées (fullVolume, duckedVolume, fadeDuration) et les listes vides", () => {
    expect(musicVolumeAt(3.0, [], { fullVolume: 0.8 })).toBeCloseTo(0.8, 5);

    const shots = [{ start: 1.0, end: 2.0 }];
    expect(musicVolumeAt(1.5, shots, { fullVolume: 0.8, duckedVolume: 0.1, fadeDuration: 0 })).toBeCloseTo(0.1, 5);
    expect(musicVolumeAt(0.99, shots, { fullVolume: 0.8, duckedVolume: 0.1, fadeDuration: 0 })).toBeCloseTo(0.8, 5);
  });
});

