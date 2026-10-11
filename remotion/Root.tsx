import type React from "react";
import { Composition, type CalculateMetadataFunction, staticFile } from "remotion";
import type { Episode } from "../src/domain/episode.js";
import { compileTimeline, type CompiledTimeline } from "../src/timeline/compile.js";
import { compileShort, SHORT_DIMENSIONS } from "../src/timeline/shorts.js";
import { EpisodeComposition, type EpisodeProps } from "./Episode.js";
import { OverviewComposition } from "./Overview.js";
import { ShortComposition, type ShortProps } from "./Short.js";
import { THEME } from "./theme.js";

const EMPTY_TIMELINE: CompiledTimeline = {
  fps: THEME.fps,
  width: THEME.width,
  height: THEME.height,
  duration: 2,
  durationInFrames: 2 * THEME.fps,
  chapters: [],
  shots: [],
  brolls: [],
  texts: [],
  keywords: [],
  captions: [],
};

const EMPTY_SHORT_TIMELINE: CompiledTimeline = {
  ...EMPTY_TIMELINE,
  width: SHORT_DIMENSIONS.width,
  height: SHORT_DIMENSIONS.height,
};

const DEFAULT_PROPS: EpisodeProps = {
  timeline: EMPTY_TIMELINE,
  hasMusic: true,
};

const DEFAULT_SHORT_PROPS: ShortProps = {
  title: "Short",
  timeline: EMPTY_SHORT_TIMELINE,
  hasMusic: true,
};

const calculateEpisodeMetadata: CalculateMetadataFunction<EpisodeProps> = async ({
  props,
  abortSignal,
}) => {
  try {
    const response = await fetch(staticFile("episode.json"), { signal: abortSignal });
    if (!response.ok) {
      return {
        durationInFrames: Math.max(1, props.timeline.durationInFrames),
        fps: props.timeline.fps,
        width: props.timeline.width,
        height: props.timeline.height,
        props,
      };
    }
    const episode = (await response.json()) as Episode;
    const timeline = compileTimeline(episode, {
      fps: THEME.fps,
      width: THEME.width,
      height: THEME.height,
    });
    return {
      durationInFrames: Math.max(1, timeline.durationInFrames),
      fps: timeline.fps,
      width: timeline.width,
      height: timeline.height,
      props: {
        ...props,
        timeline,
      },
    };
  } catch {
    return {
      durationInFrames: Math.max(1, props.timeline.durationInFrames),
      fps: props.timeline.fps,
      width: props.timeline.width,
      height: props.timeline.height,
      props,
    };
  }
};

const calculateShortMetadata: CalculateMetadataFunction<ShortProps> = async ({
  props,
  abortSignal,
}) => {
  try {
    const response = await fetch(staticFile("episode.json"), { signal: abortSignal });
    if (!response.ok) {
      return {
        durationInFrames: Math.max(1, props.timeline.durationInFrames),
        fps: props.timeline.fps,
        width: props.timeline.width,
        height: props.timeline.height,
        props,
      };
    }
    const episode = (await response.json()) as Episode;
    const compiled = compileShort(episode, { fps: THEME.fps });
    return {
      durationInFrames: Math.max(1, compiled.timeline.durationInFrames),
      fps: compiled.timeline.fps,
      width: compiled.timeline.width,
      height: compiled.timeline.height,
      props: {
        ...props,
        title: compiled.title,
        timeline: compiled.timeline,
      },
    };
  } catch {
    return {
      durationInFrames: Math.max(1, props.timeline.durationInFrames),
      fps: props.timeline.fps,
      width: props.timeline.width,
      height: props.timeline.height,
      props,
    };
  }
};

/** Racine Remotion déclarant les compositions `Episode` (16:9), `VueEnsemble` (cockpit de montage) et `Short` (9:16). */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Episode"
        component={EpisodeComposition}
        durationInFrames={EMPTY_TIMELINE.durationInFrames}
        fps={THEME.fps}
        width={THEME.width}
        height={THEME.height}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={calculateEpisodeMetadata}
      />
      <Composition
        id="VueEnsemble"
        component={OverviewComposition}
        durationInFrames={EMPTY_TIMELINE.durationInFrames}
        fps={THEME.fps}
        width={THEME.width}
        height={THEME.height}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={calculateEpisodeMetadata}
      />
      <Composition
        id="Short"
        component={ShortComposition}
        durationInFrames={EMPTY_SHORT_TIMELINE.durationInFrames}
        fps={SHORT_DIMENSIONS.fps}
        width={SHORT_DIMENSIONS.width}
        height={SHORT_DIMENSIONS.height}
        defaultProps={DEFAULT_SHORT_PROPS}
        calculateMetadata={calculateShortMetadata}
      />
    </>
  );
};
