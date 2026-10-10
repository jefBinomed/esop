import type React from "react";
import { Composition, type CalculateMetadataFunction, staticFile } from "remotion";
import type { Episode } from "../src/domain/episode.js";
import { compileTimeline, type CompiledTimeline } from "../src/timeline/compile.js";
import { EpisodeComposition, type EpisodeProps } from "./Episode.js";
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
};

const DEFAULT_PROPS: EpisodeProps = {
  timeline: EMPTY_TIMELINE,
  hasMusic: false,
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

/** Racine Remotion déclarant la composition `Episode`. */
export const RemotionRoot: React.FC = () => {
  return (
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
  );
};
