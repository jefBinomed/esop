import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface MediaInfo {
  readonly duration: number;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly hasAudio: boolean;
}

interface ProbeStream {
  readonly codec_type?: string;
  readonly width?: number;
  readonly height?: number;
  readonly r_frame_rate?: string;
}

interface ProbeOutput {
  readonly streams?: readonly ProbeStream[];
  readonly format?: { readonly duration?: string };
}

/** Lit les métadonnées utiles dans la sortie JSON de ffprobe. */
export function mediaInfoFromProbe(json: unknown): MediaInfo {
  const probe = json as ProbeOutput;
  const streams = probe.streams ?? [];
  const video = streams.find((s) => s.codec_type === "video");
  if (video?.width === undefined || video.height === undefined) {
    throw new TypeError("aucun flux vidéo dans la sortie ffprobe");
  }
  return {
    duration: Math.round(Number(probe.format?.duration ?? 0) * 1000) / 1000,
    width: video.width,
    height: video.height,
    fps: parseFrameRate(video.r_frame_rate ?? "0/0"),
    hasAudio: streams.some((s) => s.codec_type === "audio"),
  };
}

function parseFrameRate(rate: string): number {
  const [num, den] = rate.split("/").map(Number);
  if (num === undefined || den === undefined || den === 0) return 0;
  return num / den;
}

/** Lance ffprobe sur un fichier et renvoie ses métadonnées. */
export async function probeMedia(file: string): Promise<MediaInfo> {
  const { stdout } = await run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_type,width,height,r_frame_rate",
    "-of", "json",
    file,
  ]);
  return mediaInfoFromProbe(JSON.parse(stdout));
}
