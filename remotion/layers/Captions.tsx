import type React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { activeWordIndex, type CaptionPage } from "../../src/timeline/captions.js";
import { THEME } from "../theme.js";

export interface CaptionsLayerProps {
  readonly captions: readonly CaptionPage[];
}

interface CaptionPageViewProps {
  readonly page: CaptionPage;
}

const CaptionPageView: React.FC<CaptionPageViewProps> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = (page.startFrame + frame) / fps;
  const activeIndex = activeWordIndex(page.words, currentTime);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 52,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(11, 15, 25, 0.82)",
          borderRadius: 16,
          padding: "12px 28px",
          boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          display: "flex",
          gap: 14,
          alignItems: "baseline",
        }}
      >
        {page.words.map((word, index) => {
          const isActive = index === activeIndex;
          return (
            <span
              key={`${word.timelineStart}-${index}`}
              style={{
                display: "inline-block",
                fontFamily: THEME.fonts.heading,
                fontSize: 44,
                fontWeight: 800,
                ...(isActive
                  ? {
                      color: "#38bdf8",
                      transform: "scale(1.06)",
                    }
                  : {
                      color: "#f8fafc",
                      opacity: 0.88,
                    }),
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Calque de sous-titres mot à mot dynamiques (3 mots maximum par page, mot actif surligné). */
export const CaptionsLayer: React.FC<CaptionsLayerProps> = ({ captions }) => {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {captions.map((page, index) => (
        <Sequence
          key={`caption-${page.startFrame}-${index}`}
          from={page.startFrame}
          durationInFrames={page.durationInFrames}
        >
          <CaptionPageView page={page} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
