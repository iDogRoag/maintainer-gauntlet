import { execa } from "execa";

export type GitNumstatEntry = {
  added: number | null;
  deleted: number | null;
  path: string;
};

export type GitDiffSummary = {
  changedFiles: string[];
  deletedTests: string[];
  numstat: GitNumstatEntry[];
  totalLinesChanged: number;
  fullDiff: string;
};

async function git(workdir: string, args: string[]): Promise<string> {
  const result = await execa("git", args, { cwd: workdir });
  return result.stdout;
}

export async function initializeGitBaseline(workdir: string): Promise<void> {
  await git(workdir, ["init", "--quiet"]);
  await git(workdir, ["config", "user.email", "maintainer-gauntlet@example.invalid"]);
  await git(workdir, ["config", "user.name", "Maintainer Gauntlet"]);
  await git(workdir, ["add", "."]);
  await git(workdir, ["commit", "--quiet", "-m", "baseline"]);
}

function parseNumstat(stdout: string): GitNumstatEntry[] {
  return stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [addedRaw, deletedRaw, ...pathParts] = line.split("\t");
      return {
        added: addedRaw === "-" ? null : Number(addedRaw),
        deleted: deletedRaw === "-" ? null : Number(deletedRaw),
        path: pathParts.join("\t")
      };
    });
}

function parseDeletedTests(stdout: string): string[] {
  return stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [status, ...pathParts] = line.split("\t");
      return { status, path: pathParts.join("\t") };
    })
    .filter((entry) => entry.status === "D" && /(^|\/)(test|tests)\//.test(entry.path))
    .map((entry) => entry.path);
}

export async function captureGitDiff(workdir: string): Promise<GitDiffSummary> {
  const [changedFilesRaw, nameStatusRaw, numstatRaw, fullDiff] = await Promise.all([
    git(workdir, ["diff", "--name-only"]),
    git(workdir, ["diff", "--name-status"]),
    git(workdir, ["diff", "--numstat"]),
    git(workdir, ["diff", "--no-ext-diff"])
  ]);

  const changedFiles = changedFilesRaw.split("\n").filter(Boolean);
  const numstat = parseNumstat(numstatRaw);
  const totalLinesChanged = numstat.reduce(
    (total, entry) => total + (entry.added ?? 0) + (entry.deleted ?? 0),
    0
  );

  return {
    changedFiles,
    deletedTests: parseDeletedTests(nameStatusRaw),
    numstat,
    totalLinesChanged,
    fullDiff
  };
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\u0000/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function matchesAllowedPattern(filePath: string, pattern: string): boolean {
  if (pattern.includes("*")) {
    return globToRegExp(pattern).test(filePath);
  }
  if (pattern.endsWith("/")) {
    return filePath.startsWith(pattern);
  }
  return filePath === pattern;
}

export function detectUnrelatedChangedFiles(changedFiles: string[], allowedPatterns: string[]): string[] {
  return changedFiles.filter((filePath) => !allowedPatterns.some((pattern) => matchesAllowedPattern(filePath, pattern)));
}
