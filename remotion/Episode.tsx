import type React from "react";
import { AbsoluteFill } from "remotion";
import type { Episode } from "../src/domain/episode.js";
import { compileTimeline, type CompiledTimeline } from "../src/timeline/compile.js";
import { BrollLayer } from "./layers/Broll.js";
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
};

/**
 * Composition principale d'un épisode : empile les plans de parole (`TalkLayer`),
 * le B-roll (`BrollLayer`), les cartes de chapitre (`ChapterLayer`), les textes
 * et mots-clés (`KeywordLayer`), la musique avec ducking (`MusicLayer`) et un
 * vignettage léger pour la signature visuelle.
 */
export const EpisodeComposition: React.FC<EpisodeProps> = ({
  timeline,
  episode,
  hasMusic = false,
  musicSrc,
}) => {
  const activeTimeline = episode !== undefined ? compileTimeline(episode) : timeline;

  return (
    <AbsoluteFill style={{ backgroundColor: THEME.colors.background }}>
      <TalkLayer shots={activeTimeline.shots} />
      <BrollLayer brolls={activeTimeline.brolls} />
      <ChapterLayer chapters={activeTimeline.chapters} />
      <KeywordLayer texts={activeTimeline.texts} keywords={activeTimeline.keywords} />
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
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 68%, rgba(0,0,0,0.32) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
