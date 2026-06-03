import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applySeededTemplateVariables, chooseSeededValue } from "../src/core/generator.js";
import type { Scenario } from "../src/core/types.js";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fs.remove(root)));
});

describe("seeded scenario generation", () => {
  it("chooses deterministic values from a seed", () => {
    expect(chooseSeededValue(["alpha", "beta", "gamma"], 123, "name")).toBe(
      chooseSeededValue(["alpha", "beta", "gamma"], 123, "name")
    );
  });

  it("applies template variables inside a workspace", async () => {
    const workdir = await fs.mkdtemp(path.join(os.tmpdir(), "maintainer-gauntlet-generator-test-"));
    tempRoots.push(workdir);
    await fs.outputFile(path.join(workdir, "README.md"), "Fix {{moduleName}} today\n");
    const scenario: Scenario = {
      schemaVersion: 1,
      id: "seeded",
      title: "Seeded",
      difficulty: "easy",
      tags: [],
      taskFile: "task.md",
      fixtureDir: "fixture",
      timeoutSeconds: 30,
      passThreshold: 80,
      generator: { type: "template", variables: { moduleName: ["parser"] } },
      checks: [{ id: "noop", type: "max_files_changed", max: 1, dimension: "minimality", points: 1 }]
    };

    await applySeededTemplateVariables(workdir, scenario, 42);

    await expect(fs.readFile(path.join(workdir, "README.md"), "utf8")).resolves.toContain("parser");
  });
});
