import { execa } from "execa";
import { describe, expect, it } from "vitest";

const cli = ["--import", "tsx", "src/cli.ts"] as const;

describe("cli", () => {
  it("prints help with the package name", async () => {
    const result = await execa(process.execPath, [...cli, "--help"], {
      cwd: new URL("..", import.meta.url),
      reject: false
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("maintainer-gauntlet");
    expect(result.stdout).toContain("Usage:");
  });

  it("lists bundled scenarios with their metadata", async () => {
    const result = await execa(process.execPath, [...cli, "list"], {
      cwd: new URL("..", import.meta.url),
      reject: false
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("failing-test-fix");
    expect(result.stdout).toContain("Fix the failing math test");
    expect(result.stdout).toContain("easy");
    expect(result.stdout).toContain("correctness, minimality");
  });
});
