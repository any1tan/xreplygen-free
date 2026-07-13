import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const targets = ["src", "public/manifest.json", "package.json", "vite.config.ts"];
const forbidden = [
  { label: "first-party managed API", pattern: /xreplygen\.any1tan\.com\/api/i },
  { label: "identity permission", pattern: /"identity"/i },
  { label: "subscription or entitlement code", pattern: /\b(entitlement|subscription|billing)\b/i },
  { label: "payment provider code", pattern: /\b(paypal|creem|paysway)\b/i },
  { label: "environment-variable access", pattern: /process\.env/i },
  { label: "private-key block", pattern: /-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE) KEY-----/ },
  { label: "common live credential", pattern: /\b(?:sk-[A-Za-z0-9_-]{12,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-)/ }
];

const files = targets.flatMap((target) => collect(join(root, target)));
const failures = [];

for (const file of files) {
  if (!/\.(?:ts|html|css|json)$/i.test(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(text)) failures.push(`${relative(root, file)}: ${rule.label}`);
  }
}

if (failures.length > 0) {
  console.error("Public-release guard failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Public-release guard passed for ${files.length} source files.`);

function collect(path) {
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => collect(join(path, entry.name)));
}
