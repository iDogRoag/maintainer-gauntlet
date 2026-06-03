import { execa } from "execa";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cli = ["--import", "tsx", "src/cli.ts"] as const;
const fakeAgentPass = fileURLToPath(new URL("../examples/fake-agent-pass.js", import.meta.url));

describe("run command", () => {
  it("runs a scenario end-to-end with a fake passing agent and JSON report", async () => {
    const result = await execa(
      process.execPath,
      [
        ...cli,
        "run",
        "failing-test-fix",
        "--agent",
        `node ${fakeAgentPass}`,
        "--seed",
        "123",
        "--json",
        "--fail-under",
        "80"
      ],
      { cwd: new URL("..", import.meta.url), reject: false }
    );

    expect(result.exitCode).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.version).toBe(1);
    expect(report.tool).toBe("maintainer-gauntlet");
    expect(report.seed).toBe(123);
    expect(report.summary.passed).toBe(true);
    expect(report.results[0].scenario).toBe("failing-test-fix");
    expect(report.results[0].lostPoints).toEqual([]);
  }, 30_000);
});
