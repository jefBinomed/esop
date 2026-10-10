#!/usr/bin/env -S npx tsx
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { segmentsFromSilences, DEFAULT_SEGMENT_OPTIONS } from "./cut/segments.js";
import type { Episode } from "./domain/episode.js";
import type { Segment, Take } from "./domain/timeline.js";
import { ingestEpisode, readEpisode } from "./ingest/episode.js";
import { renderContactSheet } from "./export/contact-sheet.js";
import { DEFAULT_PREVIEW_OPTIONS, planPreview, renderPreview } from "./export/ffmpeg-preview.js";
import {
  mergeMontageEdits,
  parseMontage,
  segmentsFromMontage,
  serializeMontage,
  type MontageDoc,
} from "./montage/format.js";
import { probeMedia } from "./ingest/probe.js";
import { evaluateTakes } from "./takes/evaluate.js";
import { parseSelectedTakes, serializeTakes } from "./takes/format.js";
import { applyScriptAnnotations, parseScript, type EpisodeScript } from "./takes/script.js";
import { applyFramingPattern } from "./zoom/pattern.js";

const USAGE = `esop — assistant de montage « Et si on parlait »

  esop ingest <dossier-épisode> [--file <rush>]... [--out <dossier>]
      Transcrit les prises et détecte les silences → <out>/episode.json
  esop takes [--out <dossier>]
      Évalue les prises par chapitre (durée, hésitations, script.md) → <out>/takes.md
  esop cut [--out <dossier>] [--min-gap 0.35] [--padding 0.12]
      Découpe les prises retenues en segments, pose cadrages et annotations → <out>/montage.md
  esop preview [--out <dossier>] [--width 960]
      Coupe brute ffmpeg avec cadrages simulés → <out>/preview.mp4
      et planche de vignettes toutes les 5 s → <out>/preview.png

Par défaut, <out> vaut episodes/<nom-de-l-épisode>.
`;

export async function runCli(argv: readonly string[]): Promise<void> {
  const [command, ...rest] = argv;
  switch (command) {
    case "ingest":
      return ingest(rest);
    case "takes":
      return takes(rest);
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

async function takes(argv: readonly string[]): Promise<void> {
  const { values } = parseArgs({
    args: [...argv],
    options: { out: { type: "string" } },
  });
  const out = values.out ?? (await onlyEpisodeDir());
  const episode = await readEpisode(join(out, "episode.json"));
  if (episode === undefined) throw new Error(`episode.json introuvable dans ${out} : lance d'abord esop ingest`);

  const script = await readScript(out, episode.sourceDir);
  const evaluations = evaluateTakes(episode.takes, episode.silences, script);
  const takesPath = join(out, "takes.md");
  await writeFile(takesPath, serializeTakes(episode.name, evaluations, script), "utf8");
  const recommended = evaluations.filter((e) => e.recommended).length;
  process.stderr.write(
    `${evaluations.length} prise(s) évaluée(s), ${recommended} recommandée(s) → ${takesPath}\n`,
  );
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
  const selectedIds = await readSelectedTakes(join(out, "takes.md"));
  const script = await readScript(out, episode.sourceDir);
  const chaptersByIndex = new Map(script?.chapters.map((c) => [c.index, c.title]) ?? []);
  const activeTakes: Take[] = episode.takes
    .filter((t) => selectedIds === undefined || selectedIds.size === 0 || selectedIds.has(t.id))
    .map((t) => {
      const title = chaptersByIndex.get(t.chapterIndex);
      return title === undefined ? t : { ...t, chapter: title };
    });

  const montagePath = join(out, "montage.md");
  const existingMontage = await readMontage(montagePath);
  const rawSegments = activeTakes.flatMap((take) =>
    segmentsFromSilences(episode.silences[take.id] ?? [], take.words, {
      takeId: take.id,
      duration: take.duration,
      minGap,
      padding,
    }),
  );
  const merged = existingMontage === undefined ? rawSegments : mergeMontageEdits(rawSegments, existingMontage);
  const annotated = script === undefined ? merged : applyScriptAnnotations(merged, activeTakes, script);
  const segments: Segment[] = applyFramingPattern(annotated);

  await writeEpisode(out, { ...episode, takes: activeTakes, segments });
  const title = script?.title && script.title.length > 0 ? script.title : episode.name;
  const montage = serializeMontage(title, activeTakes, segments);
  await writeFile(montagePath, montage, "utf8");
  const kept = segments.filter((x) => x.dropped !== true).reduce((s, x) => s + x.end - x.start, 0);
  const total = activeTakes.reduce((s, t) => s + t.duration, 0);
  process.stderr.write(
    `${segments.length} segments, ${Math.round(kept)} s gardées sur ${Math.round(total)} s → ${montagePath}\n`,
  );
}

async function preview(argv: readonly string[]): Promise<void> {
  const { values } = parseArgs({
    args: [...argv],
    options: { out: { type: "string" }, width: { type: "string" } },
  });
  const out = values.out ?? (await onlyEpisodeDir());
  const episode = await readEpisode(join(out, "episode.json"));
  if (episode === undefined) throw new Error(`episode.json introuvable dans ${out} : lance d'abord esop ingest`);

  const montageDoc = await readMontage(join(out, "montage.md"));
  const segments =
    montageDoc !== undefined
      ? applyFramingPattern(segmentsFromMontage(montageDoc, episode.takes, episode.segments))
      : episode.segments;
  if (segments === undefined) throw new Error(`pas de segments dans ${out} : lance d'abord esop cut`);
  await writeEpisode(out, { ...episode, segments });

  const sizes: Record<string, { width: number; height: number }> = {};
  for (const take of episode.takes) {
    const info = await probeMedia(take.file);
    sizes[take.id] = { width: info.width, height: info.height };
  }
  const jobs = planPreview(episode.takes, segments, sizes, { width: Number(values.width ?? 960) });
  const output = join(out, "preview.mp4");
  await renderPreview(jobs, output, DEFAULT_PREVIEW_OPTIONS, (done, total) => {
    process.stderr.write(`\rextraction ${done}/${total}`);
  });
  process.stderr.write(`\n→ ${output}\n`);

  const kept = segments.filter((s) => s.dropped !== true);
  const duration = kept.reduce((sum, s) => sum + s.end - s.start, 0);
  const sheet = join(out, "preview.png");
  await renderContactSheet(output, sheet, duration);
  process.stderr.write(`→ ${sheet}\n`);
}

async function readMontage(path: string): Promise<MontageDoc | undefined> {
  try {
    return parseMontage(await readFile(path, "utf8"));
  } catch {
    return undefined;
  }
}

async function readSelectedTakes(path: string): Promise<Set<string> | undefined> {
  try {
    return parseSelectedTakes(await readFile(path, "utf8"));
  } catch {
    return undefined;
  }
}

async function readScript(outDir: string, sourceDir: string): Promise<EpisodeScript | undefined> {
  for (const candidate of [join(outDir, "script.md"), join(sourceDir, "script.md")]) {
    try {
      return parseScript(await readFile(candidate, "utf8"));
    } catch {
      // ignore
    }
  }
  return undefined;
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

if (process.argv[1] !== undefined && resolve(process.argv[1]).endsWith("cli.ts")) {
  runCli(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(`erreur : ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
