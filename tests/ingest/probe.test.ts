import { describe, expect, it } from "vitest";
import { mediaInfoFromProbe } from "../../src/ingest/probe.js";

const probe = {
  streams: [
    { codec_type: "data", r_frame_rate: "0/0" },
    { codec_type: "audio", codec_name: "aac", sample_rate: "48000", channels: 2, r_frame_rate: "0/0" },
    { codec_type: "video", codec_name: "hevc", width: 1920, height: 1080, r_frame_rate: "30/1" },
  ],
  format: { duration: "491.123456" },
};

describe("mediaInfoFromProbe", () => {
  it("extrait durée, dimensions et cadence du flux vidéo", () => {
    expect(mediaInfoFromProbe(probe)).toEqual({
      duration: 491.123,
      width: 1920,
      height: 1080,
      fps: 30,
      hasAudio: true,
    });
  });

  it("gère une cadence fractionnaire", () => {
    const p = { ...probe, streams: [{ codec_type: "video", width: 1, height: 1, r_frame_rate: "30000/1001" }] };
    expect(mediaInfoFromProbe(p).fps).toBeCloseTo(29.97, 2);
    expect(mediaInfoFromProbe(p).hasAudio).toBe(false);
  });

  it("refuse un média sans flux vidéo", () => {
    expect(() => mediaInfoFromProbe({ streams: [], format: { duration: "1" } })).toThrow(/vidéo/);
  });
});
