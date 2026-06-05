export type ScoreDimension = "correctness" | "security" | "minimality" | "maintainerTrust";

export type ScenarioSeed = number;

export type ScenarioDifficulty = "easy" | "medium" | "hard";

export type ScenarioGenerator = {
  type: string;
  variables?: Record<string, string[]>;
};

type ScenarioCheckBase = {
  id: string;
  dimension: ScoreDimension;
  points: number;
  reason?: string;
  fatal?: boolean;
};

export type CommandCheck = ScenarioCheckBase & {
  type: "command";
  command: string;
};

export type FileContainsCheck = ScenarioCheckBase & {
  type: "file_contains" | "file_not_contains";
  path: string;
  pattern: string;
  flags?: string;
};

export type DiffContainsCheck = ScenarioCheckBase & {
  type: "diff_contains" | "diff_not_contains";
  pattern: string;
  flags?: string;
};

export type ForbiddenFileChangedCheck = ScenarioCheckBase & {
  type: "forbidden_file_changed";
  path: string;
};

export type MaxFilesChangedCheck = ScenarioCheckBase & {
  type: "max_files_changed";
  max: number;
};

export type MaxLinesChangedCheck = ScenarioCheckBase & {
  type: "max_lines_changed";
  max: number;
};

export type ScenarioCheck =
  | CommandCheck
  | FileContainsCheck
  | DiffContainsCheck
  | ForbiddenFileChangedCheck
  | MaxFilesChangedCheck
  | MaxLinesChangedCheck;

export type Scenario = {
  schemaVersion: 1;
  id: string;
  title: string;
  suite?: string;
  difficulty: ScenarioDifficulty;
  tags: string[];
  taskFile: string;
  fixtureDir: string;
  timeoutSeconds: number;
  passThreshold: number;
  generator?: ScenarioGenerator;
  checks: ScenarioCheck[];
};

export type CheckResult = {
  checkId: string;
  passed: boolean;
  dimension: ScoreDimension;
  points: number;
  pointsAwarded: number;
  reason?: string;
};

export type LostPointReason = {
  checkId: string;
  dimension: ScoreDimension;
  points: number;
  reason: string;
};

export type ScenarioResult = {
  scenario: string;
  score: number;
  passed: boolean;
  dimensions: Record<ScoreDimension, number>;
  lostPoints: LostPointReason[];
  workdir?: string;
  changedFiles: string[];
  timedOut: boolean;
  agentExitCode?: number;
};

export type RunReport = {
  version: 1;
  tool: "maintainer-gauntlet";
  seed: ScenarioSeed;
  agentCommand: string;
  startedAt: string;
  finishedAt: string;
  summary: {
    score: number;
    passed: boolean;
    scenariosRun: number;
    scenariosPassed: number;
  };
  results: ScenarioResult[];
};
