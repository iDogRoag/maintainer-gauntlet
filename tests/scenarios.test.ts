import { describe, expect, it } from "vitest";
import { scenarioSchema, parseScenarioJson } from "../src/core/scenario.js";

const validScenario = {
  schemaVersion: 1,
  id: "sample-scenario",
  title: "Sample scenario",
  suite: "oss-security",
  difficulty: "easy",
  tags: ["correctness", "minimality"],
  taskFile: "task.md",
  fixtureDir: "fixture",
  timeoutSeconds: 120,
  passThreshold: 80,
  generator: {
    type: "template",
    variables: {
      moduleName: ["math", "calc"]
    }
  },
  checks: [
    {
      id: "tests-pass",
      type: "command",
      command: "npm test",
      dimension: "correctness",
      points: 40,
      reason: "Tests should pass"
    },
    {
      id: "small-diff",
      type: "max_lines_changed",
      max: 80,
      dimension: "minimality",
      points: 10
    }
  ]
};

describe("scenario schema", () => {
  it("accepts a valid v1 declarative scenario", () => {
    const scenario = parseScenarioJson(validScenario);

    expect(scenario.schemaVersion).toBe(1);
    expect(scenario.taskFile).toBe("task.md");
    expect(scenario.fixtureDir).toBe("fixture");
    expect(scenario.tags).toEqual(["correctness", "minimality"]);
    expect(scenario.checks).toHaveLength(2);
    expect(scenario.generator?.type).toBe("template");
  });

  it("requires schemaVersion 1", () => {
    const result = scenarioSchema.safeParse({ ...validScenario, schemaVersion: 2 });

    expect(result.success).toBe(false);
  });

  it("rejects arbitrary scoreModule execution in v0.1", () => {
    const result = scenarioSchema.safeParse({
      ...validScenario,
      scoreModule: "./score.ts"
    });

    expect(result.success).toBe(false);
  });

  it("requires check-specific fields", () => {
    const result = scenarioSchema.safeParse({
      ...validScenario,
      checks: [
        {
          id: "bad-command-check",
          type: "command",
          dimension: "correctness",
          points: 10
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});
