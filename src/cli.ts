#!/usr/bin/env -S npx tsx
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { segmentsFromSilences, DEFAULT_SEGMENT_OPTIONS } from "./cut/segments.js";
import type { Episode } from "./domain/episode.js";
import type { Segment } from "./domain/timeline.js";
import { ingestEpisode, readEpisode } from "./ingest/episode.js";
import { renderContactSheet } from "./export/contact-sheet.js";
import { DEFAULT_PREVIEW_OPTIONS, planPreview, renderPreview } from "./export/ffmpeg-preview.js";
import { serializeMontage } from "./montage/format.js";
import { probeMedia } from "./ingest/probe.js";
import { applyFramingPattern } from "./zoom/pattern.js";

const USAGE = `esop — assistant de montage « Et si on parlait »

  esop ingest <dossier-épisode> [--file <rush>]... [--out <dossier>]
      Transcrit les prises et détecte les silences → <out>/episode.json
  esop cut [--out <dossier>] [--min-gap 0.35] [--padding 0.12]
      Découpe en segments de parole, pose les cadrages → <out>/montage.md
  esop preview [--out <dossier>] [--width 960]
      Coupe brute ffmpeg avec cadrages simulés → <out>/preview.mp4
      et planche de vignettes toutes les 5 s → <out>/preview.png

Par défaut, <out> vaut episodes/<nom-de-l-épisode>.
`;

async function main(argv: readonly string[]): Promise<void> {
  const [command, ...rest] = argv;
  switch (command) {
    case "ingest":
      return ingest(rest);
    case "cut":
      return cut(rest);
    case "preview":
      return preview(rest);
    default:
      process.stdout.write(USAGE);
      process.exitCode = command === undefined || command === "help" ? 0 : 1;
  }
}

async function ingest(argv: readonly string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: { file: { type: "string", multiple: true }, out: { type: "string" } },
  });
  const dir = positionals[0];
  if (dir === undefined) throw new Error("dossier d'épisode manquant");
  const out = values.out ?? join("episodes", basename(resolve(dir)));
  await mkdir(out, { recursive: true });

  const previous = await readEpisode(join(out, "episode.json"));
  const episode = await ingestEpisode(dir, {
    ...(values.file === undefined ? {} : { files: values.file }),
    ...(previous === undefined ? {} : { previous }),
    log: (m) => process.stderr.write(`${m}\n`),
  });
  await writeEpisode(out, episode);
  process.stderr.write(`${episode.takes.length} prise(s) → ${join(out, "episode.json")}\n`);
}

async function cut(argv: readonly string[]): Promise<void> {
  const { values } = parseArgs({
    args: [...argv],
    options: { out: { type: "string" }, "min-gap": { type: "string" }, padding: { type: "string" } },
  });
  const out = values.out ?? (await onlyEpisodeDir());
  const episode = await readEpisode(join(out, "episode.json"));
  if (episode === undefined) throw new Error(`episode.json introuvable dans ${out} : lance d'abord esop ingest`);

  const minGap = Number(values["min-gap"] ?? DEFAULT_SEGMENT_OPTIONS.minGap);
  const padding = Number(values.padding ?? DEFAULT_SEGMENT_OPTIONS.padding);
  const segments: Segment[] = applyFramingPattern(
    episode.takes.flatMap((take) =>
      segmentsFromSilences(episode.silences[take.id] ?? [], take.words, {
        takeId: take.id,
        duration: take.duration,
        minGap,
        padding,
      }),
    ),
  );

  await writeEpisode(out, { ...episode, segments });
  const montage = serializeMontage(episode.name, episode.takes, segments);
  await writeFile(join(out, "montage.md"), montage, "utf8");
  const kept = segments.reduce((s, x) => s + x.end - x.start, 0);
  const total = episode.takes.reduce((s, t) => s + t.duration, 0);
  process.stderr.write(
    `${segments.length} segments, ${Math.round(kept)} s gardées sur ${Math.round(total)} s → ${join(out, "montage.md")}\n`,
  );
}

async function preview(argv: readonly string[]): Promise<void> {
  const { values } = parseArgs({
    args: [...argv],
    options: { out: { type: "string" }, width: { type: "string" } },
  });
  const out = values.out ?? (await onlyEpisodeDir());
  const episode = await readEpisode(join(out, "episode.json"));
  if (episode?.segments === undefined) throw new Error(`pas de segments dans ${out} : lance d'abord esop cut`);

  const sizes: Record<string, { width: number; height: number }> = {};
  for (const take of episode.takes) {
    const info = await probeMedia(take.file);
    sizes[take.id] = { width: info.width, height: info.height };
  }
  const jobs = planPreview(episode.takes, episode.segments, sizes, { width: Number(values.width ?? 960) });
  const output = join(out, "preview.mp4");
  await renderPreview(jobs, output, DEFAULT_PREVIEW_OPTIONS, (done, total) => {
    process.stderr.write(`\rextraction ${done}/${total}`);
  });
  process.stderr.write(`\n→ ${output}\n`);

  const kept = episode.segments.filter((s) => s.dropped !== true);
  const duration = kept.reduce((sum, s) => sum + s.end - s.start, 0);
  const sheet = join(out, "preview.png");
  await renderContactSheet(output, sheet, duration);
  process.stderr.write(`→ ${sheet}\n`);
}

async function writeEpisode(out: string, episode: Episode): Promise<void> {
  await writeFile(join(out, "episode.json"), `${JSON.stringify(episode, null, 2)}\n`, "utf8");
}

/** Sans --out, on prend l'unique épisode présent dans episodes/. */
async function onlyEpisodeDir(): Promise<string> {
  const names = await readdir("episodes").catch(() => [] as string[]);
  const first = names[0];
  if (names.length !== 1 || first === undefined) {
    throw new Error("précise --out : zéro ou plusieurs épisodes dans episodes/");
  }
  return join("episodes", first);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`erreur : ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
