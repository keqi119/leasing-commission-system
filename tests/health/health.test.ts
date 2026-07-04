import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { buildHealthStatus } from "../../apps/web/src/server/local-health";

describe("LCS-P1-H07 local health checks", () => {
  test("reports ok when the local database and data directories are available", () => {
    const root = join(tmpdir(), `lcs-health-${Date.now()}`);
    const dbPath = join(root, "local-data", "db", "dev.db");
    for (const directory of ["db", "imports", "exports", "backups", "logs"]) {
      mkdirSync(join(root, "local-data", directory), { recursive: true });
    }
    writeFileSync(dbPath, "sqlite-placeholder");

    const health = buildHealthStatus(root, {
      LCS_APP_NAME: "leasing-commission-system",
      LCS_APP_ENV: "local",
      LCS_DATABASE_PATH: "local-data/db/dev.db",
      LCS_IMPORT_DIR: "local-data/imports",
      LCS_EXPORT_DIR: "local-data/exports",
      LCS_BACKUP_DIR: "local-data/backups",
      LCS_LOG_DIR: "local-data/logs"
    });

    expect(health).toMatchObject({
      ok: true,
      app: "leasing-commission-system",
      env: "local",
      version: "0.1.0",
      database: {
        ok: true,
        path: "local-data/db/dev.db"
      },
      directories: {
        imports: true,
        exports: true,
        backups: true,
        logs: true
      }
    });

    rmSync(root, { recursive: true, force: true });
  });

  test("does not expose absolute database paths in the health payload", () => {
    const root = join(tmpdir(), `lcs-health-path-${Date.now()}`);
    const dbPath = join(root, "local-data", "db", "dev.db");
    mkdirSync(join(root, "local-data", "db"), { recursive: true });
    writeFileSync(dbPath, "sqlite-placeholder");

    const health = buildHealthStatus(root, {
      LCS_DATABASE_PATH: dbPath
    });

    expect(health.database.path).toBe("local-data/db/dev.db");
    expect(health.database.path).not.toContain(root);

    rmSync(root, { recursive: true, force: true });
  });
});
