import { accessSync, constants, existsSync } from "node:fs";
import { access, writeFile, unlink } from "node:fs/promises";
import { basename, isAbsolute, join, relative } from "node:path";

export interface LocalHealthStatus {
  ok: boolean;
  app: string;
  env: string;
  version: string;
  database: {
    ok: boolean;
    path: string;
  };
  directories: {
    imports: boolean;
    exports: boolean;
    backups: boolean;
    logs: boolean;
  };
}

type LocalHealthEnv = Record<string, string | undefined>;

const defaultEnv = {
  appName: "leasing-commission-system",
  appEnv: "local",
  databasePath: "local-data/db/dev.db",
  importDir: "local-data/imports",
  exportDir: "local-data/exports",
  backupDir: "local-data/backups",
  logDir: "local-data/logs"
};

export function buildHealthStatus(root = process.cwd(), env: LocalHealthEnv = process.env): LocalHealthStatus {
  const databasePath = env.LCS_DATABASE_PATH ?? defaultEnv.databasePath;
  const directories = {
    imports: isWritableDirectory(resolveLocalPath(root, env.LCS_IMPORT_DIR ?? defaultEnv.importDir)),
    exports: isWritableDirectory(resolveLocalPath(root, env.LCS_EXPORT_DIR ?? defaultEnv.exportDir)),
    backups: isWritableDirectory(resolveLocalPath(root, env.LCS_BACKUP_DIR ?? defaultEnv.backupDir)),
    logs: isWritableDirectory(resolveLocalPath(root, env.LCS_LOG_DIR ?? defaultEnv.logDir))
  };
  const resolvedDatabasePath = resolveLocalPath(root, databasePath);
  const databaseOk = existsSync(resolvedDatabasePath) && canRead(resolvedDatabasePath);

  return {
    ok: databaseOk && Object.values(directories).every(Boolean),
    app: env.LCS_APP_NAME ?? defaultEnv.appName,
    env: env.LCS_APP_ENV ?? defaultEnv.appEnv,
    version: "0.1.0",
    database: {
      ok: databaseOk,
      path: sanitizePath(root, resolvedDatabasePath)
    },
    directories
  };
}

export async function buildAsyncHealthStatus(root = process.cwd(), env: LocalHealthEnv = process.env): Promise<LocalHealthStatus> {
  const status = buildHealthStatus(root, env);
  const writableChecks = await Promise.all(
    [
      ["imports", env.LCS_IMPORT_DIR ?? defaultEnv.importDir],
      ["exports", env.LCS_EXPORT_DIR ?? defaultEnv.exportDir],
      ["backups", env.LCS_BACKUP_DIR ?? defaultEnv.backupDir],
      ["logs", env.LCS_LOG_DIR ?? defaultEnv.logDir]
    ].map(async ([key, directory]) => [key, await canWriteDirectory(resolveLocalPath(root, directory))] as const)
  );
  const directories = Object.fromEntries(writableChecks) as LocalHealthStatus["directories"];
  return {
    ...status,
    ok: status.database.ok && Object.values(directories).every(Boolean),
    directories
  };
}

function resolveLocalPath(root: string, value: string): string {
  return isAbsolute(value) ? value : join(root, value);
}

function sanitizePath(root: string, value: string): string {
  const relativePath = relative(root, value).replace(/\\/g, "/");
  if (!relativePath.startsWith("..") && !isAbsolute(relativePath)) {
    return relativePath;
  }
  return basename(value);
}

function canRead(path: string): boolean {
  try {
    accessSync(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function isWritableDirectory(path: string): boolean {
  try {
    accessSync(path, constants.W_OK);
    return existsSync(path);
  } catch {
    return false;
  }
}

async function canWriteDirectory(path: string): Promise<boolean> {
  if (!existsSync(path)) {
    return false;
  }
  const probe = join(path, ".lcs-health-write-test.tmp");
  try {
    await writeFile(probe, "ok");
    await unlink(probe);
    return true;
  } catch {
    return false;
  }
}
