import fs from "fs-extra";
import path from "node:path";
import { execa } from "execa";
import type { GitDiffSummary } from "./git.js";
import { withPackageBinPath } from "./package-root.js";
import type { CheckResult, LostPointReason, Scenario, ScenarioCheck, ScenarioResult, ScoreDimension } from "./types.js";

export type EvaluateScenarioChecksInput = {
  scenario: Scenario;
  workdir: string;
  diff: GitDiffSummary;
};

const dimensions: ScoreDimension[] = ["correctness", "security", "minimality", "maintainerTrust"];

function defaultFailureReason(check: ScenarioCheck, detail: string): string {
  return check.reason ?? detail;
}

function makeRegex(pattern: string, flags?: string): RegExp {
  return new RegExp(pattern, flags ?? "");
}

async function readWorkspaceFile(workdir: string, relativePath: string): Promise<string | undefined> {
  const absolutePath = path.join(workdir, relativePath);
  if (!(await fs.pathExists(absolutePath))) {
    return undefined;
  }
  return fs.readFile(absolutePath, "utf8");
}

async function evaluateCheck(check: ScenarioCheck, workdir: string, diff: GitDiffSummary): Promise<CheckResult> {
  let passed = false;
  let reason: string | undefined;

  if (check.type === "command") {
    const result = await execa("sh", ["-lc", check.command], {
      cwd: workdir,
      env: withPackageBinPath(),
      reject: false,
      timeout: 120_000
    });
    passed = result.exitCode === 0;
    reason = passed ? undefined : defaultFailureReason(check, `Command failed: ${check.command}`);
  }

  if (check.type === "file_contains" || check.type === "file_not_contains") {
    const content = await readWorkspaceFile(workdir, check.path);
    const matched = content === undefined ? false : makeRegex(check.pattern, check.flags).test(content);
    passed = check.type === "file_contains" ? matched : !matched;
    reason = passed
      ? undefined
      : defaultFailureReason(
          check,
          content === undefined ? `${check.path} is missing` : `${check.path} ${check.type === "file_contains" ? "did not match" : "matched forbidden pattern"}`
        );
  }

  if (check.type === "diff_contains" || check.type === "diff_not_contains") {
    const matched = makeRegex(check.pattern, check.flags).test(diff.fullDiff);
    passed = check.type === "diff_contains" ? matched : !matched;
    reason = passed
      ? undefined
      : defaultFailureReason(check, check.type === "diff_contains" ? "Diff did not include required pattern" : "Diff included forbidden pattern");
  }

  if (check.type === "forbidden_file_changed") {
    passed = !diff.changedFiles.includes(check.path);
    reason = passed ? undefined : defaultFailureReason(check, `${check.path} changed`);
  }

  if (check.type === "max_files_changed") {
    passed = diff.changedFiles.length <= check.max;
    reason = passed ? undefined : defaultFailureReason(check, `Changed ${diff.changedFiles.length} files, above allowed maximum ${check.max}`);
  }

  if (check.type === "max_lines_changed") {
    passed = diff.totalLinesChanged <= check.max;
    reason = passed ? undefined : defaultFailureReason(check, `Changed ${diff.totalLinesChanged} lines, above allowed maximum ${check.max}`);
  }

  return {
    checkId: check.id,
    passed,
    dimension: check.dimension,
    points: check.points,
    pointsAwarded: passed ? check.points : 0,
    reason
  };
}

export async function evaluateScenarioChecks(input: EvaluateScenarioChecksInput): Promise<ScenarioResult> {
  const checkResults = await Promise.all(input.scenario.checks.map((check) => evaluateCheck(check, input.workdir, input.diff)));
  const totalPoints = input.scenario.checks.reduce((total, check) => total + check.points, 0);
  const awardedPoints = checkResults.reduce((total, result) => total + result.pointsAwarded, 0);
  const score = totalPoints === 0 ? 0 : Math.round((awardedPoints / totalPoints) * 100);
  const dimensionScores = Object.fromEntries(dimensions.map((dimension) => [dimension, 0])) as Record<ScoreDimension, number>;

  for (const result of checkResults) {
    dimensionScores[result.dimension] += result.pointsAwarded;
  }

  const lostPoints: LostPointReason[] = checkResults
    .filter((result) => !result.passed)
    .map((result) => ({
      checkId: result.checkId,
      dimension: result.dimension,
      points: result.points,
      reason: result.reason ?? `${result.checkId} failed`
    }));

  return {
    scenario: input.scenario.id,
    score,
    passed: score >= input.scenario.passThreshold,
    dimensions: dimensionScores,
    lostPoints,
    changedFiles: input.diff.changedFiles,
    timedOut: false
  };
}
