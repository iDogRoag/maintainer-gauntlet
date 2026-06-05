import fs from "fs-extra";
import path from "node:path";
import { runAgentCommand } from "./agent.js";
import { captureGitDiff, initializeGitBaseline } from "./git.js";
import { applySeededTemplateVariables } from "./generator.js";
import { evaluateScenarioChecks } from "./scorer.js";
import { createTemporaryWorkspace } from "./sandbox.js";
import type { RegisteredScenario } from "../scenarios/registry.js";
import type { RunReport, ScenarioResult } from "./types.js";

export type RunScenarioOptions = {
  agentCommand: string;
  seed: number;
  keepWorkdir: boolean;
  timeoutSeconds?: number;
};

export type RunSuiteOptions = RunScenarioOptions & {
  failUnder: number;
};

async function writePromptFile(scenario: RegisteredScenario, workdir: string, seed: number): Promise<string> {
  const taskPath = path.join(scenario.directory, scenario.taskFile);
  const task = await fs.readFile(taskPath, "utf8");
  const promptDir = path.join(workdir, ".maintainer-gauntlet");
  const promptPath = path.join(promptDir, "task.md");
  await fs.ensureDir(promptDir);
  await fs.writeFile(promptPath, `${task.trim()}\n\nSeed: ${seed}\nScenario: ${scenario.id}\n`);
  return promptPath;
}

export async function runScenario(scenario: RegisteredScenario, options: RunScenarioOptions): Promise<ScenarioResult> {
  const fixtureDir = path.join(scenario.directory, scenario.fixtureDir);
  const workspace = await createTemporaryWorkspace({
    scenarioId: scenario.id,
    fixtureDir,
    keepWorkdir: options.keepWorkdir
  });

  try {
    await applySeededTemplateVariables(workspace.workdir, scenario, options.seed);
    const promptPath = await writePromptFile(scenario, workspace.workdir, options.seed);
    await initializeGitBaseline(workspace.workdir);

    const agentResult = await runAgentCommand({
      command: options.agentCommand,
      promptPath,
      workdir: workspace.workdir,
      scenarioId: scenario.id,
      seed: options.seed,
      timeoutSeconds: options.timeoutSeconds ?? scenario.timeoutSeconds
    });

    const diff = await captureGitDiff(workspace.workdir);
    const scored = await evaluateScenarioChecks({ scenario, workdir: workspace.workdir, diff });
    const timedOutLostPoint = agentResult.timedOut
      ? [
          {
            checkId: "agent-timeout",
            dimension: "maintainerTrust" as const,
            points: 100,
            reason: "Agent command timed out"
          }
        ]
      : [];
    const nonZeroExitLostPoint = !agentResult.timedOut && agentResult.exitCode !== 0
      ? [
          {
            checkId: "agent-exit-code",
            dimension: "maintainerTrust" as const,
            points: 100,
            reason: `Agent command exited with code ${agentResult.exitCode}`
          }
        ]
      : [];
    const agentFailed = agentResult.timedOut || agentResult.exitCode !== 0;

    return {
      ...scored,
      score: agentFailed ? 0 : scored.score,
      passed: agentFailed ? false : scored.passed,
      lostPoints: [...timedOutLostPoint, ...nonZeroExitLostPoint, ...scored.lostPoints],
      timedOut: agentResult.timedOut,
      agentExitCode: agentResult.exitCode,
      workdir: options.keepWorkdir ? workspace.workdir : undefined
    };
  } finally {
    await workspace.cleanup();
  }
}

export function buildRunReport(input: {
  seed: number;
  startedAt: string;
  finishedAt: string;
  results: ScenarioResult[];
}): RunReport {
  const scenariosRun = input.results.length;
  const scenariosPassed = input.results.filter((result) => result.passed).length;
  const score = scenariosRun === 0 ? 0 : Math.round(input.results.reduce((total, result) => total + result.score, 0) / scenariosRun);

  return {
    version: 1,
    tool: "maintainer-gauntlet",
    seed: input.seed,
    agentCommand: "redacted",
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    summary: {
      score,
      passed: scenariosRun > 0 && scenariosPassed === scenariosRun,
      scenariosRun,
      scenariosPassed
    },
    results: input.results
  };
}

export async function runScenarios(scenarios: RegisteredScenario[], options: RunSuiteOptions): Promise<RunReport> {
  const startedAt = new Date().toISOString();
  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    results.push(await runScenario(scenario, options));
  }

  return buildRunReport({
    seed: options.seed,
    startedAt,
    finishedAt: new Date().toISOString(),
    results
  });
}
