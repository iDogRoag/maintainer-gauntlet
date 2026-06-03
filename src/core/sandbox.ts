import fs from "fs-extra";
import os from "node:os";
import path from "node:path";

export type TemporaryWorkspaceOptions = {
  scenarioId: string;
  fixtureDir: string;
  keepWorkdir?: boolean;
};

export type TemporaryWorkspace = {
  workdir: string;
  keepWorkdir: boolean;
  cleanup: () => Promise<void>;
};

function safeScenarioPrefix(scenarioId: string): string {
  return scenarioId.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function createTemporaryWorkspace(options: TemporaryWorkspaceOptions): Promise<TemporaryWorkspace> {
  const keepWorkdir = options.keepWorkdir ?? false;
  const prefix = path.join(os.tmpdir(), `maintainer-gauntlet-${safeScenarioPrefix(options.scenarioId)}-`);
  const workdir = await fs.mkdtemp(prefix);

  await fs.copy(options.fixtureDir, workdir, {
    dereference: true,
    filter: (source) => !source.split(path.sep).includes("node_modules")
  });

  return {
    workdir,
    keepWorkdir,
    cleanup: async () => {
      if (!keepWorkdir) {
        await fs.remove(workdir);
      }
    }
  };
}
