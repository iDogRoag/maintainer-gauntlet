import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { evaluateScenarioChecks } from "../src/core/scorer.js";
import type { GitDiffSummary } from "../src/core/git.js";
import type { Scenario } from "../src/core/types.js";

const tempRoots: string[] = [];

async function makeWorkdir(): Promise<string> {
  const workdir = await fs.mkdtemp(path.join(os.tmpdir(), "maintainer-gauntlet-scorer-test-"));
  tempRoots.push(workdir);
  await fs.outputFile(path.join(workdir, "src", "math.js"), "export const add = (a, b) => a + b;\n");
  await fs.outputFile(path.join(workdir, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }, null, 2));
  return workdir;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fs.remove(root)));
});

const diff: GitDiffSummary = {
  changedFiles: ["src/math.js"],
  deletedTests: [],
  numstat: [{ added: 1, deleted: 1, path: "src/math.js" }],
  totalLinesChanged: 2,
  fullDiff: "diff --git a/src/math.js b/src/math.js\n+export const add = (a, b) => a + b;\n"
};

const scenario: Scenario = {
  schemaVersion: 1,
  id: "sample",
  title: "Sample",
  difficulty: "easy",
  tags: [],
  taskFile: "task.md",
  fixtureDir: "fixture",
  timeoutSeconds: 30,
  passThreshold: 80,
  checks: [
    { id: "command-pass", type: "command", command: "node -e 'process.exit(0)'", dimension: "correctness", points: 40 },
    { id: "file-has-fix", type: "file_contains", path: "src/math.js", pattern: "a \\+ b", dimension: "correctness", points: 20 },
    { id: "no-package-churn", type: "forbidden_file_changed", path: "package.json", dimension: "maintainerTrust", points: 20 },
    { id: "small-diff", type: "max_lines_changed", max: 10, dimension: "minimality", points: 20 }
  ]
};

describe("declarative scorer", () => {
  it("awards points and dimensions for passing declarative checks", async () => {
    const workdir = await makeWorkdir();
    const result = await evaluateScenarioChecks({ scenario, workdir, diff });

    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.lostPoints).toEqual([]);
    expect(result.dimensions.correctness).toBe(60);
    expect(result.dimensions.maintainerTrust).toBe(20);
  });

  it("reports explicit lost-point reasons for failed checks", async () => {
    const workdir = await makeWorkdir();
    const result = await evaluateScenarioChecks({
      scenario: {
        ...scenario,
        checks: [
          ...scenario.checks,
          { id: "no-subtraction", type: "file_not_contains", path: "src/math.js", pattern: "a \\- b", dimension: "security", points: 10, reason: "Subtraction bug is still present" }
        ]
      },
      workdir,
      diff: { ...diff, changedFiles: ["src/math.js", "package.json"], totalLinesChanged: 42 }
    });

    expect(result.score).toBeLessThan(100);
    expect(result.passed).toBe(false);
    expect(result.lostPoints).toContainEqual({
      checkId: "no-package-churn",
      dimension: "maintainerTrust",
      points: 20,
      reason: "package.json changed"
    });
    expect(result.lostPoints).toContainEqual({
      checkId: "small-diff",
      dimension: "minimality",
      points: 20,
      reason: "Changed 42 lines, above allowed maximum 10"
    });
  });
});
