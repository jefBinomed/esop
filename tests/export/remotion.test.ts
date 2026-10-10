import { lstat, mkdir, mkdtemp, readlink, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Episode } from "../../src/domain/episode.js";
import {
  preparePublicDir,
  remotionRenderArgs,
  remotionStudioArgs,
} from "../../src/export/remotion.js";

describe("export/remotion", () => {
  it("crée des liens symboliques dans publicDir vers episode.json, rushs et Ressources (idempotent)", async () => {
    const root = await mkdtemp(join(tmpdir(), "esop-remotion-test-"));
    try {
      const sourceParent = join(root, "Desktop", "EtSiOnParlait");
      const sourceDir = join(sourceParent, "conclusion");
      const resourcesDir = join(sourceParent, "Ressources");
      const episodeDir = join(root, "episodes", "conclusion");
      const publicDir = join(root, "public");

      await mkdir(sourceDir, { recursive: true });
      await mkdir(resourcesDir, { recursive: true });
      await mkdir(episodeDir, { recursive: true });
      await writeFile(join(episodeDir, "episode.json"), "{}", "utf8");

      const episode: Episode = {
        name: "conclusion",
        sourceDir,
        takes: [],
        silences: {},
      };

      // Premier appel + second appel pour vérifier l'idempotence
      await preparePublicDir(publicDir, episodeDir, episode);
      await preparePublicDir(publicDir, episodeDir, episode);

      const epLink = join(publicDir, "episode.json");
      const rushsLink = join(publicDir, "rushs");
      const resLink = join(publicDir, "resources");

      expect((await lstat(epLink)).isSymbolicLink()).toBe(true);
      expect((await lstat(rushsLink)).isSymbolicLink()).toBe(true);
      expect((await lstat(resLink)).isSymbolicLink()).toBe(true);

      expect(await readlink(epLink)).toBe(resolve(episodeDir, "episode.json"));
      expect(await readlink(rushsLink)).toBe(resolve(sourceDir));
      expect(await readlink(resLink)).toBe(resolve(resourcesDir));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("omet le lien resources si le dossier Ressources n'existe pas", async () => {
    const root = await mkdtemp(join(tmpdir(), "esop-remotion-nores-"));
    try {
      const sourceDir = join(root, "isolated", "ep");
      const episodeDir = join(root, "episodes", "ep");
      const publicDir = join(root, "public");

      await mkdir(sourceDir, { recursive: true });
      await mkdir(episodeDir, { recursive: true });
      await writeFile(join(episodeDir, "episode.json"), "{}", "utf8");

      const episode: Episode = {
        name: "ep",
        sourceDir,
        takes: [],
        silences: {},
      };

      await preparePublicDir(publicDir, episodeDir, episode);

      expect((await lstat(join(publicDir, "episode.json"))).isSymbolicLink()).toBe(true);
      expect((await lstat(join(publicDir, "rushs"))).isSymbolicLink()).toBe(true);
      await expect(lstat(join(publicDir, "resources"))).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("construit les arguments CLI de remotion render et remotion studio", () => {
    expect(remotionRenderArgs("remotion/index.ts", "episodes/ep/final.mp4", "public")).toEqual([
      "remotion",
      "render",
      "remotion/index.ts",
      "Episode",
      "episodes/ep/final.mp4",
      "--public-dir=public",
    ]);

    expect(remotionRenderArgs("remotion/index.ts", "episodes/ep/final.mp4", "public", 0.5)).toEqual([
      "remotion",
      "render",
      "remotion/index.ts",
      "Episode",
      "episodes/ep/final.mp4",
      "--public-dir=public",
      "--scale=0.5",
    ]);

    expect(remotionStudioArgs("remotion/index.ts", "public")).toEqual([
      "remotion",
      "studio",
      "remotion/index.ts",
      "--public-dir=public",
    ]);
  });
});
