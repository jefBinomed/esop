import type { TakeEvaluation } from "./evaluate.js";
import type { EpisodeScript } from "./script.js";

/**
 * Écrit `takes.md` : par chapitre, chaque prise avec sa durée, ses pauses
 * d'hésitation, sa couverture du script, et une case cochée sur la prise
 * recommandée. L'utilisateur arbitre en déplaçant la coche `[x]`.
 */
export function serializeTakes(
  episodeName: string,
  evaluations: readonly TakeEvaluation[],
  script?: EpisodeScript,
): string {
  const title = script?.title && script.title.length > 0 ? script.title : episodeName;
  const out: string[] = [`# ${title} — choix des prises`, ""];
  let currentChapter: number | undefined;

  for (const ev of evaluations) {
    if (ev.chapterIndex !== currentChapter) {
      if (currentChapter !== undefined) out.push("");
      out.push(`## ${String(ev.chapterIndex).padStart(2, "0")} — ${ev.chapter}`, "");
      currentChapter = ev.chapterIndex;
    }
    const check = ev.recommended ? "x" : " ";
    const details = [
      `${ev.speechDuration} s parlées / ${ev.duration} s`,
      `${ev.hesitationCount} hésitation(s)`,
    ];
    if (ev.missingPoints.length > 0) {
      details.push(`manque : ${ev.missingPoints.join(", ")}`);
    }
    if (ev.recommended) {
      details.push("recommandée");
    }
    out.push(`- [${check}] \`${ev.takeId}\` — ${details.join(" · ")}`);
  }
  return `${out.join("\n")}\n`;
}

const SELECTED = /^-\s+\[[xX]\]\s+`([^`]+)`/;

/** Relit les identifiants des prises cochées `[x]` dans `takes.md`. */
export function parseSelectedTakes(markdown: string): Set<string> {
  const selected = new Set<string>();
  for (const raw of markdown.split("\n")) {
    const match = SELECTED.exec(raw.trim());
    if (match?.[1] !== undefined) selected.add(match[1]);
  }
  return selected;
}
