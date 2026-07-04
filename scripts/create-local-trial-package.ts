import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

export interface CreateLocalTrialPackageOptions {
  repoRoot?: string;
  releaseRoot?: string;
  createZip?: boolean;
}

export interface CreateLocalTrialPackageResult {
  packageDir: string;
  zipPath: string;
}

const defaultPackageName = "leasing-commission-system-local-trial";
const includedEntries = [
  "apps",
  "packages",
  "scripts",
  "docs/operations",
  "docs/commission",
  ".env.example",
  "README.md",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "vitest.config.ts"
];

const excludedSegments = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "coverage",
  "local-data",
  "release"
]);

const excludedFilePatterns = [
  /\.db$/i,
  /\.db-journal$/i,
  /\.sqlite$/i,
  /\.sqlite3$/i,
  /\.backup$/i,
  /\.real\.(xlsx|csv)$/i,
  /\.sensitive\.(xlsx|csv)$/i,
  /\.env$/i
];

export async function createLocalTrialPackage(options: CreateLocalTrialPackageOptions = {}): Promise<CreateLocalTrialPackageResult> {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const releaseRoot = resolve(options.releaseRoot ?? join(repoRoot, "release"));
  const packageDir = join(releaseRoot, "local-trial");
  const zipPath = join(releaseRoot, `${defaultPackageName}.zip`);

  rmSync(packageDir, { recursive: true, force: true });
  mkdirSync(packageDir, { recursive: true });

  for (const entry of includedEntries) {
    const source = join(repoRoot, entry);
    if (!existsSync(source)) {
      continue;
    }
    cpSync(source, join(packageDir, entry), {
      recursive: true,
      filter: (sourcePath) => shouldInclude(repoRoot, sourcePath)
    });
  }

  if (options.createZip !== false) {
    rmSync(zipPath, { force: true });
    const result = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "Compress-Archive -Path 'local-trial' -DestinationPath 'leasing-commission-system-local-trial.zip' -Force"
      ],
      { cwd: releaseRoot, stdio: "inherit" }
    );
    if (result.status !== 0) {
      throw new Error("Failed to create local trial zip package.");
    }
  }

  return { packageDir, zipPath };
}

function shouldInclude(repoRoot: string, sourcePath: string): boolean {
  const relativePath = relative(repoRoot, sourcePath).replace(/\\/g, "/");
  const segments = relativePath.split("/");
  if (segments.some((segment) => excludedSegments.has(segment))) {
    return false;
  }
  return !excludedFilePatterns.some((pattern) => pattern.test(relativePath));
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/create-local-trial-package.ts")) {
  createLocalTrialPackage()
    .then((result) => {
      console.log(`Local trial package directory: ${result.packageDir}`);
      console.log(`Local trial package zip: ${result.zipPath}`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
