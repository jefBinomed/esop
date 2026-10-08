/** Timecode lisible `mm:ss.mmm`, précis à la milliseconde pour l'aller-retour. */
export function formatTimecode(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const minutes = Math.floor(totalMs / 60_000);
  const rest = totalMs - minutes * 60_000;
  const secs = Math.floor(rest / 1000);
  const ms = rest - secs * 1000;
  return `${pad(minutes, 2)}:${pad(secs, 2)}.${pad(ms, 3)}`;
}

const TIMECODE = /^(\d+):(\d{2})\.(\d{3})$/;

export function parseTimecode(text: string): number {
  const match = TIMECODE.exec(text);
  if (match === null) throw new SyntaxError(`timecode invalide : « ${text} »`);
  const [, minutes, secs, ms] = match;
  return Number(minutes) * 60 + Number(secs) + Number(ms) / 1000;
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}
