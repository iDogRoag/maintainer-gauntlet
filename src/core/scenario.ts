import fs from "fs-extra";
import { z } from "zod";
import type { Scenario } from "./types.js";

export const scoreDimensionSchema = z.enum([
  "correctness",
  "security",
  "minimality",
  "maintainerTrust"
]);

const scenarioCheckBaseSchema = {
  id: z.string().min(1),
  dimension: scoreDimensionSchema,
  points: z.number().int().nonnegative(),
  reason: z.string().min(1).optional(),
  fatal: z.boolean().optional()
};

const regexFlagsSchema = z.string().regex(/^[dgimsuvy]*$/).optional();

export const scenarioCheckSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...scenarioCheckBaseSchema,
      type: z.literal("command"),
      command: z.string().min(1)
    })
    .strict(),
  z
    .object({
      ...scenarioCheckBaseSchema,
      type: z.literal("file_contains"),
      path: z.string().min(1),
      pattern: z.string().min(1),
      flags: regexFlagsSchema
    })
    .strict(),
  z
    .object({
      ...scenarioCheckBaseSchema,
      type: z.literal("file_not_contains"),
      path: z.string().min(1),
      pattern: z.string().min(1),
      flags: regexFlagsSchema
    })
    .strict(),
  z
    .object({
      ...scenarioCheckBaseSchema,
      type: z.literal("diff_contains"),
      pattern: z.string().min(1),
      flags: regexFlagsSchema
    })
    .strict(),
  z
    .object({
      ...scenarioCheckBaseSchema,
      type: z.literal("diff_not_contains"),
      pattern: z.string().min(1),
      flags: regexFlagsSchema
    })
    .strict(),
  z
    .object({
      ...scenarioCheckBaseSchema,
      type: z.literal("forbidden_file_changed"),
      path: z.string().min(1)
    })
    .strict(),
  z
    .object({
      ...scenarioCheckBaseSchema,
      type: z.literal("max_files_changed"),
      max: z.number().int().nonnegative()
    })
    .strict(),
  z
    .object({
      ...scenarioCheckBaseSchema,
      type: z.literal("max_lines_changed"),
      max: z.number().int().nonnegative()
    })
    .strict()
]);

export const scenarioSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/),
    title: z.string().min(1),
    suite: z.string().min(1).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    tags: z.array(z.string().min(1)).default([]),
    taskFile: z.string().min(1),
    fixtureDir: z.string().min(1),
    timeoutSeconds: z.number().int().positive(),
    passThreshold: z.number().min(0).max(100),
    generator: z
      .object({
        type: z.string().min(1),
        variables: z.record(z.string(), z.array(z.string().min(1)).min(1)).optional()
      })
      .strict()
      .optional(),
    checks: z.array(scenarioCheckSchema).min(1)
  })
  .strict();

export function parseScenarioJson(input: unknown): Scenario {
  return scenarioSchema.parse(input) as Scenario;
}

export async function loadScenarioFile(filePath: string): Promise<Scenario> {
  const raw = (await fs.readJson(filePath)) as unknown;
  return parseScenarioJson(raw);
}
