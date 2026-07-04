import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { createLocalTrialPackage } from "../../scripts/create-local-trial-package";

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function listFiles(directory: string): string[] {
  const entries: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      entries.push(...listFiles(fullPath));
    } else {
      entries.push(fullPath.replace(/\\/g, "/"));
    }
  }
  return entries;
}

describe("LCS-P1-H07 local trial package", () => {
  test(".env.example contains local trial variables", () => {
    const env = read(".env.example");
    for (const key of [
      "LCS_APP_NAME",
      "LCS_APP_ENV",
      "LCS_APP_PORT",
      "LCS_DATABASE_PATH",
      "LCS_EXPORT_DIR",
      "LCS_IMPORT_DIR",
      "LCS_BACKUP_DIR",
      "LCS_LOG_DIR"
    ]) {
      expect(env).toContain(`${key}=`);
    }
  });

  test("Windows scripts and operating documents exist", () => {
    for (const file of [
      "scripts/windows/setup-local.ps1",
      "scripts/windows/start-local.ps1",
      "scripts/windows/stop-local.ps1",
      "scripts/windows/reset-acceptance-db.ps1",
      "scripts/windows/backup-db.ps1",
      "scripts/windows/restore-db.ps1",
      "scripts/windows/preflight-local.ps1",
      "scripts/windows/smoke-local.ps1",
      "docs/operations/windows-local-trial-guide.md",
      "docs/operations/environment-variables.md"
    ]) {
      expect(existsSync(join(root, file))).toBe(true);
    }
    expect(read("docs/operations/windows-local-trial-guide.md")).toContain("备份数据");
    expect(read("docs/operations/windows-local-trial-guide.md")).toContain("恢复数据");
  });

  test("release notes and README describe local trial usage", () => {
    const releaseNotes = read("docs/releases/lcs-mvp-local-trial-release-notes.md");
    expect(releaseNotes).toContain("0.1.0-local-trial");
    expect(releaseNotes).toContain("local-data/db/dev.db");
    expect(releaseNotes).toContain("已知限制");

    const readme = read("README.md");
    expect(readme).toContain(".\\scripts\\windows\\setup-local.ps1");
    expect(readme).toContain(".\\scripts\\windows\\start-local.ps1");
    expect(readme).toContain("pnpm test");
  });

  test("creates a local trial package without local data, databases, node_modules, or git metadata", async () => {
    const releaseRoot = join(tmpdir(), `lcs-local-package-${Date.now()}`);
    mkdirSync(releaseRoot, { recursive: true });

    const result = await createLocalTrialPackage({ repoRoot: root, releaseRoot, createZip: false });
    const files = listFiles(result.packageDir);
    const packageFiles = files.map((file) => file.slice(result.packageDir.length + 1));

    expect(existsSync(join(result.packageDir, "package.json"))).toBe(true);
    expect(existsSync(join(result.packageDir, "scripts", "windows", "setup-local.ps1"))).toBe(true);
    expect(packageFiles.some((file) => file.includes("local-data/"))).toBe(false);
    expect(packageFiles.some((file) => file.includes("node_modules/"))).toBe(false);
    expect(packageFiles.some((file) => file.includes(".git/"))).toBe(false);
    expect(packageFiles.some((file) => file.endsWith(".db"))).toBe(false);

    rmSync(releaseRoot, { recursive: true, force: true });
  });
});
