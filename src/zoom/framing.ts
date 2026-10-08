import type { Framing } from "../domain/timeline.js";

/**
 * Géométrie d'un cadrage : facteur de zoom et centre de la fenêtre visible,
 * en fraction de l'image source. Relevé sur les montages CapCut existants :
 * large ×1.11 et serré ×1.7, tous deux recentrés à 40 % de la largeur parce
 * que le sujet est assis légèrement à gauche du cadre.
 */
export interface FramingGeometry {
  readonly scale: number;
  readonly centerX: number;
  readonly centerY: number;
}

export const FRAMINGS: Readonly<Record<Framing, FramingGeometry>> = {
  large: { scale: 1.11, centerX: 0.4, centerY: 0.5 },
  serré: { scale: 1.7, centerX: 0.4, centerY: 0.5 },
};

export interface CropRect {
  readonly width: number;
  readonly height: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Fenêtre à découper dans une image `width`×`height` pour obtenir le cadrage,
 * bornée pour rester dans l'image. Dimensions paires, exigées par la plupart
 * des encodeurs.
 */
export function cropRect(width: number, height: number, framing: Framing): CropRect {
  const geometry = FRAMINGS[framing];
  const w = even(width / geometry.scale);
  const h = even(height / geometry.scale);
  const x = clamp(Math.round(width * geometry.centerX - w / 2), 0, width - w);
  const y = clamp(Math.round(height * geometry.centerY - h / 2), 0, height - h);
  return { width: w, height: h, x, y };
}

function even(value: number): number {
  return Math.floor(value / 2) * 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
