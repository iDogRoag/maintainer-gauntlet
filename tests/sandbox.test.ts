import fs from "fs-extra";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createTemporaryWorkspace } from "../src/core/sandbox.js";

const fixtureDir = path.join(process.cwd(), "scenarios", "failing-test-fix", "fixture");
const preservedWorkdirs: string[] = [];

afterEach(async () => {
  await Promise.all(preservedWorkdirs.splice(0).map((workdir) => fs.remove(workdir)));
});

describe("temporary workspaces", () => {
  it("copies a scenario fixture into a fresh temporary workspace and cleans it up", async () => {
    const workspace = await createTemporaryWorkspace({
      scenarioId: "failing-test-fix",
      fixtureDir
    });

    expect(await fs.pathExists(path.join(workspace.workdir, "package.json"))).toBe(true);
    expect(await fs.pathExists(path.join(workspace.workdir, "src", "math.ts"))).toBe(true);

    await workspace.cleanup();

    expect(await fs.pathExists(workspace.workdir)).toBe(false);
  });

  it("preserves the workspace when keepWorkdir is true", async () => {
    const workspace = await createTemporaryWorkspace({
      scenarioId: "failing-test-fix",
      fixtureDir,
      keepWorkdir: true
    });
    preservedWorkdirs.push(workspace.workdir);

    await workspace.cleanup();

    expect(await fs.pathExists(workspace.workdir)).toBe(true);
  });
});
