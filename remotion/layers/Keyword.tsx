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
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "flex-start",
        padding: "0 96px 140px 96px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          padding: "24px 44px",
          borderRadius: 20,
          backgroundColor: THEME.colors.surface,
          borderLeft: `8px solid ${THEME.colors.accent}`,
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.45)",
          transform: `translateX(${translateX.toFixed(2)}px)`,
          opacity,
          fontFamily: THEME.fonts.heading,
          fontSize: 48,
          fontWeight: 700,
          color: THEME.colors.primary,
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
        justifyContent: "flex-start",
        alignItems: "flex-start",
        padding: "120px 96px",
        pointerEvents: "none",
        opacity: exitOpacity,
      }}
    >
      <div
        style={{
          padding: "18px 38px",
          borderRadius: 999,
          backgroundColor: THEME.colors.accent,
          color: THEME.colors.background,
          fontFamily: THEME.fonts.heading,
          fontSize: 52,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: 2,
          boxShadow: "0 18px 42px rgba(0, 0, 0, 0.4)",
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
