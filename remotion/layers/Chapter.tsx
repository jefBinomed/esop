import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ChapterCue } from "../../src/timeline/compile.js";
import { THEME } from "../theme.js";

export interface ChapterLayerProps {
  readonly chapters: readonly ChapterCue[];
}

interface ChapterCardProps {
  readonly cue: ChapterCue;
}

const ChapterCard: React.FC<ChapterCardProps> = ({ cue }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 140 },
  });
  const exitStart = Math.max(0, cue.durationInFrames - 8);
  const exitOpacity = interpolate(
    frame,
    [exitStart, cue.durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const scale = interpolate(enter, [0, 1], [0.88, 1]);
  const numberLabel = String(cue.chapterIndex).padStart(2, "0");

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.colors.background,
        justifyContent: "center",
        alignItems: "center",
        opacity: exitOpacity,
        fontFamily: THEME.fonts.heading,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          padding: "56px 88px",
          borderRadius: 36,
          backgroundColor: THEME.colors.surface,
          border: `3px solid ${THEME.colors.accent}`,
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.55)",
          transform: `scale(${scale.toFixed(4)})`,
        }}
      >
        <span
          style={{
            fontFamily: THEME.fonts.mono,
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: 4,
            color: THEME.colors.accent,
          }}
        >
          CHAPITRE {numberLabel}
        </span>
        <h1
          style={{
            margin: 0,
            fontSize: 84,
            fontWeight: 800,
            color: THEME.colors.primary,
            textAlign: "center",
          }}
        >
          {cue.title}
        </h1>
      </div>
    </AbsoluteFill>
  );
};

/** Calque des cartes de chapitre animées à chaque changement de chapitre. */
export const ChapterLayer: React.FC<ChapterLayerProps> = ({ chapters }) => {
  return (
    <AbsoluteFill>
      {chapters.map((cue) => (
        <Sequence
          key={`chapter-${cue.chapterIndex}-${cue.startFrame}`}
          from={cue.startFrame}
          durationInFrames={cue.durationInFrames}
        >
          <ChapterCard cue={cue} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
