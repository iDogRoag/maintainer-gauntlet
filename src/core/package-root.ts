import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function findPackageRootFrom(start: string): string {
  let current = start;

  while (true) {
    if (fs.pathExistsSync(path.join(current, "package.json"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Could not find package root from ${start}`);
    }
    current = parent;
  }
}

export function getPackageRoot(): string {
  return findPackageRootFrom(path.dirname(fileURLToPath(import.meta.url)));
}

export function getPackageBinPath(): string {
  return path.join(getPackageRoot(), "node_modules", ".bin");
}

export function withPackageBinPath(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return {
    ...env,
    PATH: `${getPackageBinPath()}${path.delimiter}${env.PATH ?? ""}`
  };
}
