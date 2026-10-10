import type React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
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

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.colors.background,
        opacity: exitOpacity,
        fontFamily: THEME.fonts.heading,
      }}
    >
      <Audio
        src={staticFile("resources/intro-tv.mp4")}
        volume={0.6}
        endAt={cue.durationInFrames}
      />
      <Img
        src={staticFile("resources/chapitre-bulle-vide.png")}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          left: "14.2%",
          top: "9.2%",
          width: "27.6%",
          height: "24.5%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${scale.toFixed(4)})`,
        }}
      >
        <span
          style={{
            color: "#0c3c52",
            fontSize: 46,
            fontWeight: 900,
            letterSpacing: 2,
          }}
        >
          CHAPITRE {cue.chapterIndex}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: "46%",
          top: "0",
          width: "46%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            color: "#f8fafc",
            fontSize: 64,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.2,
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
