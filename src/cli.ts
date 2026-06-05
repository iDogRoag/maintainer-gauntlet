#!/usr/bin/env node
import { Command } from "commander";
import { pathToFileURL } from "node:url";
import { registerListCommand } from "./commands/list.js";
import { registerRunCommand } from "./commands/run.js";

export function createCli(): Command {
  const program = new Command();

  program
    .name("maintainer-gauntlet")
    .description("Replay realistic maintainer traps against AI coding agents.")
    .version("0.1.0");

  registerListCommand(program);
  registerRunCommand(program);

  return program;
}

export async function runCli(argv = process.argv): Promise<void> {
  await createCli().parseAsync(argv);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  });
}
