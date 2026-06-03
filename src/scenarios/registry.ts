import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadScenarioFile } from "../core/scenario.js";
import type { Scenario } from "../core/types.js";

export type RegisteredScenario = Scenario & {
  directory: string;
  scenarioFile: string;
};

function packageRootFrom(start: string): string {
  let current = start;

  while (true) {
    if (fs.pathExistsSync(path.join(current, "package.json"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Could not find package root from ${start}`);
    }
    current = parent;
  }
}

export function getPackageRoot(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return packageRootFrom(moduleDir);
}

export function getScenariosDir(): string {
  return path.join(getPackageRoot(), "scenarios");
}

export async function listScenarios(scenariosDir = getScenariosDir()): Promise<RegisteredScenario[]> {
  if (!(await fs.pathExists(scenariosDir))) {
    return [];
  }

  const entries = await fs.readdir(scenariosDir, { withFileTypes: true });
  const scenarios = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const directory = path.join(scenariosDir, entry.name);
        const scenarioFile = path.join(directory, "scenario.json");
        const scenario = await loadScenarioFile(scenarioFile);
        return { ...scenario, directory, scenarioFile };
      })
  );

  return scenarios.sort((left, right) => left.id.localeCompare(right.id));
}

export async function getScenario(id: string, scenariosDir = getScenariosDir()): Promise<RegisteredScenario | undefined> {
  const scenarios = await listScenarios(scenariosDir);
  return scenarios.find((scenario) => scenario.id === id);
}
