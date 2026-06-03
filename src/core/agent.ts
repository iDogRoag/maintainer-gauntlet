import { spawn } from "node:child_process";
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

function killProcessGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // Process already exited.
    }
  }
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

  return new Promise((resolve) => {
    const child = spawn("sh", ["-lc", expandedCommand], {
      cwd: options.workdir,
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let timedOut = false;
    let killTimer: NodeJS.Timeout | undefined;

    child.stdout?.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    const timeout = setTimeout(() => {
      timedOut = true;
      if (child.pid) {
        killProcessGroup(child.pid, "SIGTERM");
        killTimer = setTimeout(() => {
          if (child.pid) {
            killProcessGroup(child.pid, "SIGKILL");
          }
        }, 1000);
      }
    }, options.timeoutSeconds * 1000);

    child.on("error", (error) => {
      clearTimeout(timeout);
      if (killTimer) {
        clearTimeout(killTimer);
      }
      resolve({
        exitCode: 1,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: `${Buffer.concat(stderrChunks).toString("utf8")}${error.message}`,
        timedOut
      });
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (killTimer) {
        clearTimeout(killTimer);
      }
      resolve({
        exitCode: timedOut ? 124 : code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        timedOut
      });
    });
  });
}
