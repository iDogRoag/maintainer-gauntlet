import type { Command } from "commander";
import { listScenarios } from "../scenarios/registry.js";

export function registerListCommand(program: Command): void {
  program
    .command("list")
    .description("List bundled maintainer gauntlet scenarios.")
    .action(async () => {
      const scenarios = await listScenarios();

      if (scenarios.length === 0) {
        console.log("No scenarios found.");
        return;
      }

      for (const scenario of scenarios) {
        const tags = scenario.tags.length > 0 ? scenario.tags.join(", ") : "none";
        console.log(`${scenario.id} - ${scenario.title} (${scenario.difficulty}) [${tags}]`);
      }
    });
}
