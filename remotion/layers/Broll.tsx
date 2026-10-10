import type React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useRemotionEnvironment,
} from "remotion";
import type { BrollCue } from "../../src/timeline/compile.js";
import { fileBasename, studioSafeVideoSrc, THEME } from "../theme.js";

export interface BrollLayerProps {
  readonly brolls: readonly BrollCue[];
}

interface BrollItemProps {
  readonly cue: BrollCue;
}

const BrollItem: React.FC<BrollItemProps> = ({ cue }) => {
  const frame = useCurrentFrame();
  const { isRendering } = useRemotionEnvironment();
  const opacity = interpolate(
    frame,
    [0, THEME.brollFadeFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const src = staticFile(`rushs/${fileBasename(cue.asset)}`);

  if (cue.isVideo) {
    return (
      <AbsoluteFill style={{ opacity, backgroundColor: "#000" }}>
        <OffthreadVideo
          src={studioSafeVideoSrc(src, isRendering)}
          muted
          pauseWhenBuffering
          delayRenderTimeoutInMilliseconds={180_000}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
    );
  }

  const scale = interpolate(
    frame,
    [0, Math.max(1, cue.durationInFrames - 1)],
    [1, 1 + THEME.kenBurnsScale],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale.toFixed(4)})`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Calque B-roll : vidéos plein cadre avec fondu d'entrée 8 frames, images en Ken Burns lent. */
export const BrollLayer: React.FC<BrollLayerProps> = ({ brolls }) => {
  return (
    <AbsoluteFill>
      {brolls.map((cue, index) => (
        <Sequence
          key={`broll-${cue.takeId}-${cue.startFrame}-${index}`}
          from={cue.startFrame}
          durationInFrames={cue.durationInFrames}
          premountFor={THEME.fps}
        >
          <BrollItem cue={cue} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
