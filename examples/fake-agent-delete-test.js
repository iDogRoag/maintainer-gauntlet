import fs from "node:fs";
import path from "node:path";

const workdir = process.env.MG_WORKDIR;
const scenario = process.env.MG_SCENARIO;

if (!workdir || !scenario) {
  console.error("MG_WORKDIR and MG_SCENARIO are required");
  process.exit(2);
}

const testDirs = ["test", "tests"];
for (const testDir of testDirs) {
  const absolute = path.join(workdir, testDir);
  if (fs.existsSync(absolute)) {
    fs.rmSync(absolute, { recursive: true, force: true });
  }
}

if (scenario === "failing-test-fix") {
  fs.writeFileSync(path.join(workdir, "src", "math.js"), "export function add() { return 5; }\n");
}
