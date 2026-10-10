import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { TalkShot } from "../../src/timeline/compile.js";
import { FRAMINGS } from "../../src/zoom/framing.js";
import { fileBasename, THEME } from "../theme.js";

export interface TalkLayerProps {
  readonly shots: readonly TalkShot[];
}

interface ShotViewProps {
  readonly shot: TalkShot;
}

const ShotView: React.FC<ShotViewProps> = ({ shot }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const geometry = FRAMINGS[shot.framing];

  const zoomFactor = interpolate(
    frame,
    [0, Math.max(1, shot.durationInFrames - 1)],
    [1, 1 + THEME.progressiveZoom],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const scale = geometry.scale * zoomFactor;
  const originX = `${Math.round(geometry.centerX * 100)}%`;
  const originY = `${Math.round(geometry.centerY * 100)}%`;

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <OffthreadVideo
        src={staticFile(`rushs/${fileBasename(shot.file)}`)}
        startFrom={Math.round(shot.trimBefore * fps)}
        endAt={Math.round(shot.trimAfter * fps)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transformOrigin: `${originX} ${originY}`,
          transform: `scale(${scale.toFixed(4)})`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Calque principal des plans de parole avec alternance large/serré et zoom progressif +2 %. */
export const TalkLayer: React.FC<TalkLayerProps> = ({ shots }) => {
  return (
    <AbsoluteFill>
      {shots.map((shot) => (
        <Sequence
          key={`${shot.takeId}-${shot.startFrame}`}
          from={shot.startFrame}
          durationInFrames={shot.durationInFrames}
        >
          <ShotView shot={shot} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
