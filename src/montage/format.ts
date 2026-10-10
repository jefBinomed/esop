import type { Framing, Segment, Take } from "../domain/timeline.js";
import { formatTimecode, parseTimecode } from "./timecode.js";

/**
 * Une ligne de `montage.md` : ce que l'utilisateur relit et corrige.
 * Les mots horodatés ne sont pas dans le fichier ; ils restent dans
 * `episode.json` et sont rattachés par (takeId, start, end).
 */
export interface MontageLine {
  readonly takeId: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly dropped: boolean;
  readonly framing?: Framing;
  /** Annotations `{clé: valeur}` conservées telles quelles pour les calques. */
  readonly annotations: readonly string[];
}

export interface MontageDoc {
  readonly title: string;
  readonly lines: readonly MontageLine[];
}

/**
 * Écrit `montage.md` : un titre, une section par chapitre dans l'ordre des
 * prises, une ligne par segment. Une ligne barrée est un segment coupé.
 */
export function serializeMontage(title: string, takes: readonly Take[], segments: readonly Segment[]): string {
  const takesById = new Map(takes.map((t) => [t.id, t]));
  const out: string[] = [`# ${title}`, ""];
  let currentChapter: string | undefined;

  for (const segment of segments) {
    const take = takesById.get(segment.takeId);
    if (take === undefined) throw new Error(`prise inconnue : ${segment.takeId}`);
    const chapter = `${String(take.chapterIndex).padStart(2, "0")} — ${take.chapter}`;
    if (chapter !== currentChapter) {
      if (currentChapter !== undefined) out.push("");
      out.push(`## ${chapter}`, "");
      currentChapter = chapter;
    }
    out.push(formatLine(segment));
  }
  return `${out.join("\n")}\n`;
}

function formatLine(segment: Segment): string {
  const parts = [`[${segment.takeId} ${formatTimecode(segment.start)}→${formatTimecode(segment.end)}]`];
  if (segment.framing !== undefined) parts.push(`(${segment.framing})`);
  for (const annotation of segment.annotations ?? []) parts.push(`{${annotation}}`);
  const text = segment.words.map((w) => w.text).join(" ");
  parts.push(segment.dropped === true ? `~~${text}~~` : text);
  return parts.join(" ");
}

const TITLE = /^#\s+(.+)$/;
const LINE = /^\[(\S+)\s+(\S+)→(\S+)\]\s*(.*)$/;
const FRAMING = /^\((large|serré)\)\s*/;
const ANNOTATION = /^\{([^}]*)\}\s*/;

/** Lit `montage.md`. Les titres de chapitre sont ignorés : ils se déduisent des prises. */
export function parseMontage(markdown: string): MontageDoc {
  let title = "";
  const lines: MontageLine[] = [];

  for (const raw of markdown.split("\n")) {
    const titleMatch = TITLE.exec(raw);
    if (titleMatch?.[1] !== undefined && title === "") {
      title = titleMatch[1].trim();
      continue;
    }
    const match = LINE.exec(raw);
    if (match === null) continue;
    const [, takeId, start, end, rest] = match;
    if (takeId === undefined || start === undefined || end === undefined || rest === undefined) continue;
    lines.push(parseRest(takeId, parseTimecode(start), parseTimecode(end), rest));
  }
  return { title, lines };
}

function parseRest(takeId: string, start: number, end: number, rest: string): MontageLine {
  let remaining = rest;
  let framing: Framing | undefined;
  const annotations: string[] = [];

  for (;;) {
    const f = FRAMING.exec(remaining);
    if (f?.[1] !== undefined) {
      framing = f[1] as Framing;
      remaining = remaining.slice(f[0].length);
      continue;
    }
    const a = ANNOTATION.exec(remaining);
    if (a?.[1] !== undefined) {
      annotations.push(a[1].trim());
      remaining = remaining.slice(a[0].length);
      continue;
    }
    break;
  }

  const text = remaining.trim();
  const dropped = text.startsWith("~~") && text.endsWith("~~") && text.length >= 4;
  const line: MontageLine = {
    takeId,
    start,
    end,
    text: dropped ? text.slice(2, -2) : text,
    dropped,
    annotations,
  };
  return framing === undefined ? line : { ...line, framing };
}

/**
 * Reconstruit les segments depuis un `montage.md` relu, en réassociant les
 * mots horodatés de chaque prise (ou du découpage précédent quand les bornes
 * sont inchangées).
 */
export function segmentsFromMontage(
  doc: MontageDoc,
  takes: readonly Take[],
  previous: readonly Segment[] = [],
): Segment[] {
  const takesById = new Map(takes.map((t) => [t.id, t]));
  const prevByKey = new Map(previous.map((s) => [`${s.takeId}:${s.start}:${s.end}`, s]));

  return doc.lines.map((line) => {
    const take = takesById.get(line.takeId);
    if (take === undefined) throw new Error(`prise inconnue : ${line.takeId}`);
    const prev = prevByKey.get(`${line.takeId}:${line.start}:${line.end}`);
    const words =
      prev?.words ??
      take.words.filter(
        (w) =>
          w.end >= line.start &&
          w.start <= line.end &&
          (w.start === w.end || Math.min(line.end, w.end) > Math.max(line.start, w.start)),
      );

    return {
      takeId: line.takeId,
      start: line.start,
      end: line.end,
      words,
      ...(line.dropped ? { dropped: true } : {}),
      ...(!line.dropped && line.framing !== undefined ? { framing: line.framing } : {}),
      ...(line.annotations.length > 0 ? { annotations: line.annotations } : {}),
    };
  });
}

/**
 * Reporte les coupes barrées (`~~...~~`) et les annotations `{...}` d'un
 * `montage.md` existant sur un nouveau découpage par timecode.
 */
export function mergeMontageEdits(segments: readonly Segment[], doc: MontageDoc): Segment[] {
  return segments.map((segment) => {
    const match = doc.lines.find(
      (line) =>
        line.takeId === segment.takeId &&
        Math.min(line.end, segment.end) > Math.max(line.start, segment.start),
    );
    if (match === undefined) return segment;
    return {
      ...segment,
      ...(match.dropped ? { dropped: true } : {}),
      ...(match.annotations.length > 0 ? { annotations: match.annotations } : {}),
    };
  });
}

