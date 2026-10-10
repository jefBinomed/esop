import { spawn } from "node:child_process";
import { access, copyFile, mkdir, rm, symlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Episode } from "../domain/episode.js";

/**
 * Prépare le dossier `public/` de Remotion sans jamais dupliquer les rushs lourds :
 * - `public/episode.json` : copie du fichier JSON léger (requis car `serveHandler` de
 *   `@remotion/renderer` renvoie 404 si la feuille finale d'une URL est un symlink)
 * - `public/rushs` → symlink de dossier vers `episode.sourceDir`
 * - `public/resources` → symlink de dossier vers `resourcesDir` ou `<parent de sourceDir>/Ressources` (si présent)
 */
export async function preparePublicDir(
  publicDir: string,
  episodeDir: string,
  episode: Episode,
  resourcesDir?: string,
): Promise<void> {
  await mkdir(publicDir, { recursive: true });

  const episodeJsonTarget = resolve(episodeDir, "episode.json");
  const episodeJsonDest = join(publicDir, "episode.json");
  const rushsTarget = resolve(episode.sourceDir);
  const candidateResourcesList =
    resourcesDir !== undefined
      ? [resolve(resourcesDir)]
      : [
          resolve(episode.sourceDir, "../01-Ressources"),
          resolve(episode.sourceDir, "../Ressources"),
        ];

  await rm(episodeJsonDest, { force: true });
  await copyFile(episodeJsonTarget, episodeJsonDest);
  await replaceSymlink(rushsTarget, join(publicDir, "rushs"), "dir");

  const resourcesDest = join(publicDir, "resources");
  await rm(resourcesDest, { recursive: true, force: true });
  for (const candidate of candidateResourcesList) {
    if (await pathExists(candidate)) {
      await symlink(candidate, resourcesDest, "dir");
      break;
    }
  }
}

/** Arguments CLI destinés à `npx remotion render`. */
export function remotionRenderArgs(
  entryPoint: string,
  output: string,
  publicDir: string,
  scale?: number,
): string[] {
  return [
    "remotion",
    "render",
    entryPoint,
    "Episode",
    output,
    `--public-dir=${publicDir}`,
    ...(scale !== undefined ? [`--scale=${scale}`] : []),
  ];
}

/** Arguments CLI destinés à `npx remotion studio`. */
export function remotionStudioArgs(entryPoint: string, publicDir: string): string[] {
  return ["remotion", "studio", entryPoint, `--public-dir=${publicDir}`];
}

/** Exécute le rendu vidéo final via `npx remotion render`. */
export async function runRemotionRender(
  entryPoint: string,
  output: string,
  publicDir: string,
  scale?: number,
): Promise<void> {
  await runNpx(remotionRenderArgs(entryPoint, output, publicDir, scale));
}

/** Ouvre le studio interactif Remotion via `npx remotion studio`. */
export async function runRemotionStudio(entryPoint: string, publicDir: string): Promise<void> {
  await runNpx(remotionStudioArgs(entryPoint, publicDir));
}

async function replaceSymlink(
  target: string,
  linkPath: string,
  type: "file" | "dir",
): Promise<void> {
  await rm(linkPath, { recursive: true, force: true });
  await symlink(target, linkPath, type);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function runNpx(args: readonly string[]): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("npx", [...args], { stdio: "inherit" });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`npx ${args.join(" ")} a échoué avec le code ${String(code)}`));
      }
    });
  });
}
