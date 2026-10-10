import type React from "react";
import { Audio, staticFile, useVideoConfig } from "remotion";
import type { Span } from "../../src/domain/timeline.js";
import { musicVolumeAt } from "../../src/timeline/ducking.js";
import { THEME } from "../theme.js";

export interface MusicLayerProps {
  readonly shots: readonly Pick<Span, "start" | "end">[];
  readonly src?: string;
}

/** Piste musicale en boucle avec ducking automatique (−14 dB) sous la parole. */
export const MusicLayer: React.FC<MusicLayerProps> = ({
  shots,
  src = "rushs/funk-244706.mp3",
}) => {
  const { fps } = useVideoConfig();

  return (
    <Audio
      src={staticFile(src)}
      loop
      volume={(frame) => musicVolumeAt(frame / fps, shots, THEME.ducking)}
    />
  );
};
