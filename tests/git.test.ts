import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  captureGitDiff,
  detectUnrelatedChangedFiles,
  initializeGitBaseline
} from "../src/core/git.js";

const tempRoots: string[] = [];

async function makeRepoFixture(): Promise<string> {
  const workdir = await fs.mkdtemp(path.join(os.tmpdir(), "maintainer-gauntlet-git-test-"));
  tempRoots.push(workdir);
  await fs.outputFile(path.join(workdir, "src", "math.ts"), "export const add = () => -1;\n");
  await fs.outputFile(path.join(workdir, "test", "math.test.ts"), "expect(add(2, 3)).toBe(5);\n");
  await fs.outputJson(path.join(workdir, "package.json"), { name: "fixture", private: true }, { spaces: 2 });
  return workdir;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fs.remove(root)));
});

describe("git diff capture", () => {
  it("records changed files, line stats, full diff, and deleted tests", async () => {
    const workdir = await makeRepoFixture();
    await initializeGitBaseline(workdir);

    await fs.outputFile(path.join(workdir, "src", "math.ts"), "export const add = (a, b) => a + b;\n");
    await fs.remove(path.join(workdir, "test", "math.test.ts"));

    const diff = await captureGitDiff(workdir);

    expect(diff.changedFiles).toEqual(["src/math.ts", "test/math.test.ts"]);
    expect(diff.deletedTests).toEqual(["test/math.test.ts"]);
    expect(diff.fullDiff).toContain("a + b");
    expect(diff.numstat.map((entry) => entry.path)).toContain("src/math.ts");
    expect(diff.totalLinesChanged).toBeGreaterThan(0);
  });

  it("detects changed files outside the allowed review scope", async () => {
    const unrelated = detectUnrelatedChangedFiles([
      "src/math.ts",
      "package.json",
      ".github/workflows/ci.yml"
    ], ["src/**", ".github/workflows/**"]);

    expect(unrelated).toEqual(["package.json"]);
  });
});
