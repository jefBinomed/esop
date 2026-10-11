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
  useVideoConfig,
} from "remotion";
import type { Episode } from "../src/domain/episode.js";
import { activeWordIndex, type CaptionPage } from "../src/timeline/captions.js";
import type { BrollCue, CompiledTimeline, TalkShot } from "../src/timeline/compile.js";
import { compileShort, SHORT_DIMENSIONS } from "../src/timeline/shorts.js";
import { FRAMINGS } from "../src/zoom/framing.js";
import { KeywordLayer } from "./layers/Keyword.js";
import { MusicLayer } from "./layers/Music.js";
import { fileBasename, studioSafeVideoSrc, THEME } from "./theme.js";

export type ShortProps = {
  readonly title: string;
  readonly timeline: CompiledTimeline;
  readonly episode?: Episode;
  readonly hasMusic?: boolean;
  readonly musicSrc?: string;
  readonly showCaptions?: boolean;
};

/** Point d'ancrage du visage dans le rush horizontal 16:9 d'origine pour centrage 9:16. */
export const FACE_ANCHOR = {
  x: 0.6,
  y: FRAMINGS.large.centerY,
} as const;

interface ShortShotViewProps {
  readonly shot: TalkShot;
}

const ShortShotView: React.FC<ShortShotViewProps> = ({ shot }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { isRendering } = useRemotionEnvironment();

  const zoomFactor = interpolate(
    frame,
    [0, Math.max(1, shot.durationInFrames - 1)],
    [1, 1 + THEME.progressiveZoom],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const baseScale = shot.framing === "serré" ? 1.12 : 1.0;
  const scale = baseScale * zoomFactor;

  const videoHeight = SHORT_DIMENSIONS.height;
  const videoWidth = videoHeight * (16 / 9);
  const rawLeft = SHORT_DIMENSIONS.width / 2 - videoWidth * FACE_ANCHOR.x;
  const left = Math.min(0, Math.max(SHORT_DIMENSIONS.width - videoWidth, rawLeft));

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
          position: "absolute",
          top: 0,
          left,
          width: videoWidth,
          height: videoHeight,
          objectFit: "cover",
          transformOrigin: `${(FACE_ANCHOR.x * 100).toFixed(1)}% ${(FACE_ANCHOR.y * 100).toFixed(1)}%`,
          transform: `scale(${scale.toFixed(4)})`,
          filter: THEME.colorGradingFilter,
        }}
      />
    </AbsoluteFill>
  );
};

interface ShortBrollItemProps {
  readonly cue: BrollCue;
}

const ShortBrollItem: React.FC<ShortBrollItemProps> = ({ cue }) => {
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
  const isLogo = /\.(png|webp|svg)$/i.test(cue.asset);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          bottom: 400,
          left: 190,
          width: 700,
          height: 340,
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
          backgroundColor: "#fff",
          opacity,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: isLogo ? "contain" : "cover",
            transform: `scale(${scale.toFixed(4)})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

interface ShortCaptionPageViewProps {
  readonly page: CaptionPage;
}

const ShortCaptionPageView: React.FC<ShortCaptionPageViewProps> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = (page.startFrame + frame) / fps;
  const activeIndex = activeWordIndex(page.words, currentTime);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 260,
        paddingLeft: 48,
        paddingRight: 48,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(11, 15, 25, 0.86)",
          borderRadius: 20,
          padding: "16px 32px",
          boxShadow: "0 14px 36px rgba(0,0,0,0.55)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 16,
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
                fontSize: 52,
                fontWeight: 800,
                ...(isActive
                  ? {
                      color: "#38bdf8",
                      transform: "scale(1.06)",
                    }
                  : {
                      color: "#f8fafc",
                      opacity: 0.9,
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

/**
 * Composition verticale `9:16` (`1080×1920`) pour YouTube Shorts / TikTok / Reels,
 * générée automatiquement à partir du même `montage.md` / `episode.json`.
 */
export const ShortComposition: React.FC<ShortProps> = ({
  title,
  timeline,
  episode,
  hasMusic = true,
  musicSrc = "rushs/funk-244706.mp3",
  showCaptions = true,
}) => {
  const compiled = episode !== undefined ? compileShort(episode) : { title, timeline };
  const activeTimeline = compiled.timeline;
  const activeTitle = compiled.title;

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.colors.background }}>
      <AbsoluteFill>
        {activeTimeline.shots.map((shot) => (
          <Sequence
            key={`short-shot-${shot.takeId}-${shot.startFrame}`}
            from={shot.startFrame}
            durationInFrames={shot.durationInFrames}
            premountFor={THEME.fps}
          >
            <ShortShotView shot={shot} />
          </Sequence>
        ))}
      </AbsoluteFill>

      <AbsoluteFill>
        {activeTimeline.brolls.map((cue, index) => (
          <Sequence
            key={`short-broll-${cue.takeId}-${cue.startFrame}-${index}`}
            from={cue.startFrame}
            durationInFrames={cue.durationInFrames}
            premountFor={THEME.fps}
          >
            <ShortBrollItem cue={cue} />
          </Sequence>
        ))}
      </AbsoluteFill>

      {activeTitle.trim().length > 0 ? (
        <AbsoluteFill
          style={{
            justifyContent: "flex-start",
            alignItems: "center",
            paddingTop: 96,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              border: `2px solid ${THEME.colors.accent}`,
              borderRadius: 999,
              padding: "12px 32px",
              boxShadow: "0 10px 28px rgba(0,0,0,0.45)",
              fontFamily: THEME.fonts.heading,
              fontSize: 32,
              fontWeight: 800,
              color: THEME.colors.primary,
              letterSpacing: 0.4,
            }}
          >
            {activeTitle}
          </div>
        </AbsoluteFill>
      ) : null}

      <KeywordLayer texts={activeTimeline.texts} keywords={activeTimeline.keywords} />

      {showCaptions ? (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          {activeTimeline.captions.map((page, index) => (
            <Sequence
              key={`short-caption-${page.startFrame}-${index}`}
              from={page.startFrame}
              durationInFrames={page.durationInFrames}
            >
              <ShortCaptionPageView page={page} />
            </Sequence>
          ))}
        </AbsoluteFill>
      ) : null}

      {hasMusic ? (
        <MusicLayer
          shots={activeTimeline.shots}
          {...(musicSrc !== undefined ? { src: musicSrc } : {})}
        />
      ) : null}

      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 68%, rgba(0,0,0,0.34) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
