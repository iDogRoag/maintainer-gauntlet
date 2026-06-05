import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runAgentCommand } from "../src/core/agent.js";

const tempRoots: string[] = [];

async function makeWorkdir(): Promise<string> {
  const workdir = await fs.mkdtemp(path.join(os.tmpdir(), "maintainer-gauntlet-agent-test-"));
  tempRoots.push(workdir);
  return workdir;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fs.remove(root)));
});

describe("agent command runner", () => {
  it("runs the agent with MG_* environment variables and workspace cwd", async () => {
    const workdir = await makeWorkdir();
    const promptPath = path.join(workdir, "task.md");
    const scriptPath = path.join(workdir, "agent.cjs");
    await fs.writeFile(promptPath, "Fix the repo\n");
    await fs.writeFile(
      scriptPath,
      "const fs = require('fs'); fs.writeFileSync('agent-env.json', JSON.stringify({ prompt: process.env.MG_PROMPT, workdir: process.env.MG_WORKDIR, scenario: process.env.MG_SCENARIO, seed: process.env.MG_SEED, cwd: process.cwd() }));"
    );

    const result = await runAgentCommand({
      command: `node ${scriptPath}`,
      promptPath,
      workdir,
      scenarioId: "failing-test-fix",
      seed: 123,
      timeoutSeconds: 10
    });

    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    const captured = await fs.readJson(path.join(workdir, "agent-env.json"));
    expect(captured).toEqual({
      prompt: promptPath,
      workdir,
      scenario: "failing-test-fix",
      seed: "123",
      cwd: workdir
    });
  });

  it("supports quoted convenience placeholders", async () => {
    const workdir = await makeWorkdir();
    const promptPath = path.join(workdir, "task with spaces.md");
    await fs.writeFile(promptPath, "console.log('placeholder ok');\n");

    const result = await runAgentCommand({
      command: "node {prompt}",
      promptPath,
      workdir,
      scenarioId: "placeholder-scenario",
      seed: 7,
      timeoutSeconds: 10
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("placeholder ok");
  });
});
