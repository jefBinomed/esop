import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { KeywordCue, TextCue } from "../../src/timeline/compile.js";
import { THEME } from "../theme.js";

export interface KeywordLayerProps {
  readonly texts: readonly TextCue[];
  readonly keywords: readonly KeywordCue[];
}

interface TextBannerProps {
  readonly cue: TextCue;
}

const TextBanner: React.FC<TextBannerProps> = ({ cue }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 160 },
  });
  const translateX = interpolate(enter, [0, 1], [-80, 0]);
  const opacity = interpolate(enter, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 52,
          left: 40,
          width: 430,
          backgroundColor: "rgba(43, 76, 126, 0.94)",
          borderRadius: 18,
          padding: "24px 28px",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.45)",
          transform: `translateX(${translateX.toFixed(2)}px)`,
          opacity,
          fontFamily: THEME.fonts.heading,
          color: "#f8fafc",
          fontSize: 38,
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.25,
        }}
      >
        {cue.text}
      </div>
    </AbsoluteFill>
  );
};

interface KeywordBadgeProps {
  readonly cue: KeywordCue;
}

const KeywordBadge: React.FC<KeywordBadgeProps> = ({ cue }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({
    frame,
    fps,
    config: { damping: 11, stiffness: 200 },
  });
  const exitStart = Math.max(0, cue.durationInFrames - 6);
  const exitOpacity = interpolate(
    frame,
    [exitStart, cue.durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const scale = interpolate(pop, [0, 1], [0.4, 1]);

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity: exitOpacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "48%",
          right: 110,
          color: "#facc15",
          fontFamily: THEME.fonts.heading,
          fontSize: 68,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: 2,
          WebkitTextStroke: "3px #000",
          textShadow: "0 6px 18px rgba(0,0,0,0.85)",
          transform: `scale(${scale.toFixed(4)})`,
        }}
      >
        {cue.word}
      </div>
    </AbsoluteFill>
  );
};

/** Calque des textes à l'écran (`{texte: …}`) et des mots-clés surgissants (`{mot: …}`). */
export const KeywordLayer: React.FC<KeywordLayerProps> = ({ texts, keywords }) => {
  return (
    <AbsoluteFill>
      {texts.map((cue, index) => (
        <Sequence
          key={`text-${cue.takeId}-${cue.startFrame}-${index}`}
          from={cue.startFrame}
          durationInFrames={cue.durationInFrames}
        >
          <TextBanner cue={cue} />
        </Sequence>
      ))}
      {keywords.map((cue, index) => (
        <Sequence
          key={`keyword-${cue.takeId}-${cue.startFrame}-${index}`}
          from={cue.startFrame}
          durationInFrames={cue.durationInFrames}
        >
          <KeywordBadge cue={cue} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
