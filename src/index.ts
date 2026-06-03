export type {
  CheckResult,
  LostPointReason,
  RunReport,
  Scenario,
  ScenarioCheck,
  ScenarioResult,
  ScenarioSeed,
  ScoreDimension
} from "./core/types.js";
export { captureGitDiff, detectUnrelatedChangedFiles, initializeGitBaseline } from "./core/git.js";
export { loadScenarioFile, parseScenarioJson, scenarioSchema } from "./core/scenario.js";
export { createTemporaryWorkspace } from "./core/sandbox.js";
