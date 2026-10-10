import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";
import type { Episode } from "../src/domain/episode.js";

describe("CLI (takes + cut)", () => {
  it("évalue les prises puis génère montage.md avec les annotations de script.md et préserve les coupes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "esop-cli-test-"));
    try {
      const episode: Episode = {
        name: "conclusion",
        sourceDir: dir,
        takes: [
          {
            id: "00-hook-1.1",
            file: "00-hook-1.1.mp4",
            chapterIndex: 0,
            chapter: "hook",
            take: 1,
            version: 1,
            duration: 10,
            words: [{ text: "essai", start: 1, end: 2 }],
          },
          {
            id: "00-hook-1.2",
            file: "00-hook-1.2.mp4",
            chapterIndex: 0,
            chapter: "hook",
            take: 1,
            version: 2,
            duration: 10,
            words: [
              { text: "Voici", start: 0.5, end: 1.5 },
              { text: "le", start: 1.5, end: 2.0 },
              { text: "bug.", start: 2.0, end: 2.8 },
              { text: "Ensuite", start: 5.0, end: 6.0 },
              { text: "la", start: 6.0, end: 6.5 },
              { text: "suite.", start: 6.5, end: 7.5 },
            ],
          },
        ],
        silences: {
          "00-hook-1.1": [{ start: 3, end: 5 }],
          "00-hook-1.2": [{ start: 3.0, end: 4.8 }],
        },
      };

      await writeFile(join(dir, "episode.json"), JSON.stringify(episode, null, 2), "utf8");
      await writeFile(join(dir, "script.md"), "# Conclusion\n\n## 00 — Hook\nmot: bug\n", "utf8");

      await runCli(["takes", "--out", dir]);
      const takesMd = await readFile(join(dir, "takes.md"), "utf8");
      expect(takesMd).toContain("- [x] `00-hook-1.2`");

      await runCli(["cut", "--out", dir]);
      const montageMd = await readFile(join(dir, "montage.md"), "utf8");
      expect(montageMd).toContain("# Conclusion");
      expect(montageMd).toContain("## 00 — Hook");
      expect(montageMd).toContain("{mot: bug}");
      expect(montageMd).not.toContain("00-hook-1.1");

      // Barre le premier segment et vérifie que `esop cut` préserve la coupe et recalcule le cadrage
      const edited = montageMd.replace("Voici le bug.", "~~Voici le bug.~~");
      await writeFile(join(dir, "montage.md"), edited, "utf8");
      await runCli(["cut", "--out", dir]);
      const recut = await readFile(join(dir, "montage.md"), "utf8");
      expect(recut).toContain("~~Voici le bug.~~");
      expect(recut).toContain("(large) Ensuite la suite.");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
