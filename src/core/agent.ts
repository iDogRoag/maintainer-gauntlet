import { execa } from "execa";
import { withPackageBinPath } from "./package-root.js";

export type AgentCommandOptions = {
  command: string;
  promptPath: string;
  workdir: string;
  scenarioId: string;
  seed: number;
  timeoutSeconds: number;
};

export type AgentCommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export function expandAgentCommand(command: string, options: AgentCommandOptions): string {
  const replacements: Record<string, string> = {
    "{prompt}": shellQuote(options.promptPath),
    "{workdir}": shellQuote(options.workdir),
    "{scenario}": shellQuote(options.scenarioId),
    "{seed}": shellQuote(String(options.seed))
  };

  return Object.entries(replacements).reduce(
    (expanded, [placeholder, value]) => expanded.split(placeholder).join(value),
    command
  );
}

export async function runAgentCommand(options: AgentCommandOptions): Promise<AgentCommandResult> {
  const expandedCommand = expandAgentCommand(options.command, options);
  const env = withPackageBinPath({
    ...process.env,
    MG_PROMPT: options.promptPath,
    MG_WORKDIR: options.workdir,
    MG_SCENARIO: options.scenarioId,
    MG_SEED: String(options.seed)
  });

  try {
    const result = await execa("sh", ["-lc", expandedCommand], {
      cwd: options.workdir,
      env,
      reject: false,
      timeout: options.timeoutSeconds * 1000
    });

    return {
      exitCode: result.exitCode ?? 0,
      stdout: result.stdout,
      stderr: result.stderr,
      timedOut: false
    };
  } catch (error) {
    const err = error as { exitCode?: number; stdout?: string; stderr?: string; timedOut?: boolean };
    return {
      exitCode: err.timedOut ? 124 : err.exitCode ?? 1,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
      timedOut: err.timedOut ?? false
    };
  }
}
