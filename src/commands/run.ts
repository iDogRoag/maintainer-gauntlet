import type { Command } from "commander";
import pc from "picocolors";
import { runScenarios } from "../core/run.js";
import { getScenario, listScenarios } from "../scenarios/registry.js";
import type { RunReport } from "../core/types.js";

function parseInteger(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number`);
  }
  return parsed;
}

function parseSeed(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  if (value === "random") {
    return Math.floor(Math.random() * 1_000_000_000);
  }
  return parseInteger(value, "--seed");
}

function printTextReport(report: RunReport): void {
  const status = report.summary.passed ? pc.green("PASS") : pc.red("FAIL");
  console.log(`${status} ${report.summary.score}/100 (${report.summary.scenariosPassed}/${report.summary.scenariosRun} scenarios passed)`);

  for (const result of report.results) {
    const resultStatus = result.passed ? pc.green("PASS") : pc.red("FAIL");
    console.log(`\n${resultStatus} ${result.scenario}: ${result.score}/100`);
    if (result.changedFiles.length > 0) {
      console.log(`Changed files: ${result.changedFiles.join(", ")}`);
    }
    if (result.workdir) {
      console.log(`Workspace kept at: ${result.workdir}`);
    }
    for (const lostPoint of result.lostPoints) {
      console.log(`- lost ${lostPoint.points} ${lostPoint.dimension}: ${lostPoint.reason}`);
    }
  }
}

export function registerRunCommand(program: Command): void {
  program
    .command("run")
    .description("Run one scenario or the full maintainer gauntlet.")
    .argument("<scenario>", "scenario id, or 'all'")
    .requiredOption("--agent <command>", "agent command to execute")
    .option("--suite <name>", "scenario suite to run when scenario is 'all'")
    .option("--seed <number|random>", "deterministic scenario seed", "0")
    .option("--json", "print JSON report", false)
    .option("--keep-workdir", "preserve temporary workspaces", false)
    .option("--timeout <seconds>", "override scenario timeout")
    .option("--fail-under <score>", "exit 1 when aggregate score is below this value", "80")
    .action(async (scenarioArg: string, options: Record<string, string | boolean | undefined>) => {
      const seed = parseSeed(options.seed as string | undefined);
      const failUnder = parseInteger(String(options.failUnder ?? "80"), "--fail-under");
      const timeoutSeconds = options.timeout ? parseInteger(String(options.timeout), "--timeout") : undefined;
      const allScenarios = await listScenarios();
      const scenarios =
        scenarioArg === "all"
          ? allScenarios.filter((scenario) => !options.suite || scenario.suite === options.suite)
          : [];

      if (scenarioArg !== "all") {
        const scenario = await getScenario(scenarioArg);
        if (scenario) {
          scenarios.push(scenario);
        }
      }

      if (scenarios.length === 0) {
        throw new Error(`No scenarios matched ${scenarioArg}`);
      }

      const report = await runScenarios(scenarios, {
        agentCommand: String(options.agent),
        seed,
        keepWorkdir: Boolean(options.keepWorkdir),
        timeoutSeconds,
        failUnder
      });

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        printTextReport(report);
      }

      if (report.results.some((result) => result.timedOut)) {
        process.exitCode = 124;
      } else if (!report.summary.passed || report.summary.score < failUnder) {
        process.exitCode = 1;
      }
    });
}
