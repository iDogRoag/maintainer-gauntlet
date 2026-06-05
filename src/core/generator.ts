import fs from "fs-extra";
import path from "node:path";
import type { Scenario } from "./types.js";

export type SeededTemplateResult = {
  replacements: Record<string, string>;
};

function hashSeed(seed: number, key: string): number {
  let hash = seed >>> 0;
  for (const character of key) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  return hash;
}

export function chooseSeededValue(values: string[], seed: number, key: string): string {
  if (values.length === 0) {
    throw new Error(`No values configured for ${key}`);
  }
  return values[hashSeed(seed, key) % values.length];
}

async function listFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "node_modules") {
          return [];
        }
        return listFiles(entryPath);
      }
      return [entryPath];
    })
  );
  return nested.flat();
}

export async function applySeededTemplateVariables(workdir: string, scenario: Scenario, seed: number): Promise<SeededTemplateResult> {
  if (!scenario.generator || scenario.generator.type !== "template") {
    return { replacements: {} };
  }

  const variables = scenario.generator.variables ?? {};
  const replacements = Object.fromEntries(
    Object.entries(variables).map(([key, values]) => [key, chooseSeededValue(values, seed, key)])
  );

  const files = await listFiles(workdir);
  await Promise.all(
    files.map(async (file) => {
      const original = await fs.readFile(file, "utf8");
      const updated = Object.entries(replacements).reduce(
        (content, [key, value]) => content.split(`{{${key}}}`).join(value),
        original
      );
      if (updated !== original) {
        await fs.writeFile(file, updated);
      }
    })
  );

  return { replacements };
}
