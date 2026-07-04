import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
const forbiddenTerms = [
  ["fleet", "-", "ops"].join(""),
  ["auto", "-", "subscription", "-", "platform"].join(""),
  ["电动车", "订阅"].join(""),
  ["车队", "运营"].join(""),
  ["D:", "\\", "OneDrive", "\\", "文档", "\\", "leasing-commission-system"].join(""),
  ["D:/", "OneDrive", "/", "文档", "/", "leasing-commission-system"].join("")
];
const allowedFiles = new Set([
  "docs/project-isolation.md",
  "docs/commission/lcs-p1-h02-acceptance-plan.md",
  "docs/commission/lcs-p1-h05-real-period-trial-run-plan.md"
]);
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "coverage"
]);
const ignoredFiles = new Set(["pnpm-lock.yaml"]);

interface Violation {
  file: string;
  term: string;
}

function toRepoPath(path: string): string {
  return relative(repoRoot, path).replace(/\\/g, "/");
}

function scanFile(path: string): Violation[] {
  const repoPath = toRepoPath(path);

  if (allowedFiles.has(repoPath) || ignoredFiles.has(repoPath)) {
    return [];
  }

  const content = readFileSync(path, "utf8");

  return forbiddenTerms
    .filter((term) => content.includes(term))
    .map((term) => ({ file: repoPath, term }));
}

function scanDirectory(path: string): Violation[] {
  const violations: Violation[] = [];

  for (const entry of readdirSync(path)) {
    if (ignoredDirectories.has(entry)) {
      continue;
    }

    const fullPath = join(path, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      violations.push(...scanDirectory(fullPath));
      continue;
    }

    if (stat.isFile()) {
      violations.push(...scanFile(fullPath));
    }
  }

  return violations;
}

export function checkProjectIsolation(): Violation[] {
  if (!existsSync(join(repoRoot, "package.json"))) {
    throw new Error(`Cannot locate repository root at ${repoRoot}`);
  }

  return scanDirectory(repoRoot);
}

if (process.argv[1]?.includes("check-project-isolation")) {
  const violations = checkProjectIsolation();

  if (violations.length > 0) {
    console.error("Project isolation check failed:");
    for (const violation of violations) {
      console.error(`- ${violation.file}: ${violation.term}`);
    }
    process.exit(1);
  }

  console.log("Project isolation check passed");
}
