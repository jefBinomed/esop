/**
 * Système de style partagé par tous les épisodes (« Et si on parlait »).
 * Toutes les constantes de rythme, couleurs, typographies et courbes sont
 * centralisées ici conformément à `docs/conception.md` §6.
 */
export const THEME = {
  fps: 30,
  width: 1920,
  height: 1080,
  /** Zoom progressif (+2 %) appliqué sur la durée d'un segment de parole. */
  progressiveZoom: 0.02,
  /** Durée du fondu d'entrée d'un B-roll en frames (retour par coupe franche). */
  brollFadeFrames: 8,
  /** Amplitude du zoom Ken Burns sur les images B-roll (+5 %). */
  kenBurnsScale: 0.05,
  /** Paramètres du ducking musical sous la parole (−14 dB ≈ 0.2). */
  ducking: {
    fullVolume: 1.0,
    duckedVolume: 0.2,
    fadeDuration: 0.25,
  },
  colors: {
    background: "#0f172a",
    surface: "rgba(15, 23, 42, 0.88)",
    primary: "#f8fafc",
    accent: "#f59e0b",
    accentSoft: "#fde68a",
    muted: "#94a3b8",
  },
  fonts: {
    heading: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    body: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
} as const;

/** Extrait le nom de fichier d'un chemin POSIX ou Windows sans dépendance Node. */
export function fileBasename(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts.at(-1) ?? filePath;
}

/**
 * En mode Studio/Player (`isRendering === false`), `VideoForPreview` de Remotion
 * ajoute automatiquement `#t=start,end` en bornant `end` à la durée de la
 * composition (`durationInFrames`). Or un rush brut est plus long que le
 * montage coupé : dès que `trimBefore >= duration` de la composition, Remotion
 * génère `#t=385,370.8` (`start > end`), ce qui met `<video>` en pause immédiate
 * dans Chrome et déclenche une boucle de `play-and-seek` à 30 Hz (vidéo noire +
 * grésillement audio). Ajouter un hash neutre `#studio` court-circuite
 * `appendVideoFragment` tout en partageant le cache média entre tous les plans.
 */
export function studioSafeVideoSrc(assetUrl: string, isRendering: boolean): string {
  if (isRendering || assetUrl.includes("#")) {
    return assetUrl;
  }
  return `${assetUrl}#studio`;
}
