import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(readFileSync(join(root, "dist/manifest.json"), "utf8"));
const releaseDir = join(root, "release");
const zipPath = join(releaseDir, `${manifest.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${manifest.version}.zip`);

mkdirSync(releaseDir, { recursive: true });
rmSync(zipPath, { force: true });
execFileSync("zip", ["-r", zipPath, "."], {
  cwd: join(root, "dist"),
  stdio: "inherit"
});

console.log(`Created ${zipPath}`);
