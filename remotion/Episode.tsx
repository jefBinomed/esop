import type React from "react";
import { AbsoluteFill } from "remotion";
import type { Episode } from "../src/domain/episode.js";
import { compileTimeline, type CompiledTimeline } from "../src/timeline/compile.js";
import { BrollLayer } from "./layers/Broll.js";
import { CaptionsLayer } from "./layers/Captions.js";
import { ChapterLayer } from "./layers/Chapter.js";
import { KeywordLayer } from "./layers/Keyword.js";
import { MusicLayer } from "./layers/Music.js";
import { TalkLayer } from "./layers/Talk.js";
import { THEME } from "./theme.js";

export type EpisodeProps = {
  readonly timeline: CompiledTimeline;
  readonly episode?: Episode;
  readonly hasMusic?: boolean;
  readonly musicSrc?: string;
  readonly showCaptions?: boolean;
};

/**
 * Composition principale d'un épisode : empile les plans de parole (`TalkLayer`),
 * le B-roll (`BrollLayer`), les sous-titres mot à mot (`CaptionsLayer`), les
 * cartes de chapitre (`ChapterLayer`), les textes et mots-clés (`KeywordLayer`),
 * la musique avec ducking (`MusicLayer`) et un vignettage léger pour la
 * signature visuelle.
 */
export const EpisodeComposition: React.FC<EpisodeProps> = ({
  timeline,
  episode,
  hasMusic = true,
  musicSrc = "rushs/funk-244706.mp3",
  showCaptions = true,
}) => {
  const activeTimeline = episode !== undefined ? compileTimeline(episode) : timeline;

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.colors.background }}>
      <AbsoluteFill style={{ zIndex: 5 }}>
        <ChapterLayer chapters={activeTimeline.chapters} />
      </AbsoluteFill>
      <AbsoluteFill style={{ zIndex: 2 }}>
        <BrollLayer brolls={activeTimeline.brolls} />
      </AbsoluteFill>
      <AbsoluteFill style={{ zIndex: 4 }}>
        <KeywordLayer texts={activeTimeline.texts} keywords={activeTimeline.keywords} />
      </AbsoluteFill>
      {showCaptions ? (
        <AbsoluteFill style={{ zIndex: 3, pointerEvents: "none" }}>
          <CaptionsLayer captions={activeTimeline.captions} />
        </AbsoluteFill>
      ) : null}
      {hasMusic ? (
        <MusicLayer
          shots={activeTimeline.shots}
          {...(musicSrc !== undefined ? { src: musicSrc } : {})}
        />
      ) : null}
      <AbsoluteFill style={{ zIndex: 1 }}>
        <TalkLayer shots={activeTimeline.shots} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          zIndex: 6,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 68%, rgba(0,0,0,0.32) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
