import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useRemotionEnvironment,
  useVideoConfig,
} from "remotion";
import type { TalkShot } from "../../src/timeline/compile.js";
import { formatShotSequenceName } from "../../src/timeline/overview.js";
import { framingTransform } from "../../src/zoom/framing.js";
import { fileBasename, studioSafeVideoSrc, THEME } from "../theme.js";

export interface TalkLayerProps {
  readonly shots: readonly TalkShot[];
}

interface ShotViewProps {
  readonly shot: TalkShot;
}

const ShotView: React.FC<ShotViewProps> = ({ shot }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { isRendering } = useRemotionEnvironment();

  const zoomFactor = interpolate(
    frame,
    [0, Math.max(1, shot.durationInFrames - 1)],
    [1, 1 + THEME.progressiveZoom],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const { scale, translateXPercent, translateYPercent } = framingTransform(
    shot.framing,
    zoomFactor,
  );
  const videoSrc = studioSafeVideoSrc(
    staticFile(`rushs/${fileBasename(shot.file)}`),
    isRendering,
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <OffthreadVideo
        src={videoSrc}
        startFrom={Math.round(shot.trimBefore * fps)}
        pauseWhenBuffering
        delayRenderTimeoutInMilliseconds={180_000}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transformOrigin: "0 0",
          transform: `scale(${scale.toFixed(4)}) translate(${translateXPercent.toFixed(4)}%, ${translateYPercent.toFixed(4)}%)`,
          filter: THEME.colorGradingFilter,
        }}
      />
    </AbsoluteFill>
  );
};

/** Calque principal des plans de parole avec alternance large/serré et zoom progressif +2 %. */
export const TalkLayer: React.FC<TalkLayerProps> = ({ shots }) => {
  return (
    <AbsoluteFill>
      {shots.map((shot, index) => (
        <Sequence
          key={`${shot.takeId}-${shot.startFrame}`}
          name={formatShotSequenceName(shot, index)}
          from={shot.startFrame}
          durationInFrames={shot.durationInFrames}
          premountFor={THEME.fps}
        >
          <ShotView shot={shot} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
