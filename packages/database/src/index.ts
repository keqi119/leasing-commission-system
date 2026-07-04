import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;
let sqliteClientPromise: Promise<SqliteRawClient> | null = null;

type SqlJsStatement = {
  bind(values: unknown[]): boolean;
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  free(): void;
};

type SqlJsDatabase = {
  prepare(query: string): SqlJsStatement;
  run(query: string, values?: unknown[]): void;
  export(): Uint8Array;
};

export interface SqliteRawClient {
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<number>;
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
  $transaction: <T>(callback: (tx: SqliteRawClient) => Promise<T>) => Promise<T>;
}

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }

  return prisma;
}

export type { PrismaClient } from "@prisma/client";

export function getSqliteClient(): Promise<SqliteRawClient> {
  sqliteClientPromise ??= createSqliteClient();
  return sqliteClientPromise;
}

async function createSqliteClient(): Promise<SqliteRawClient> {
  // @ts-ignore sql.js is declared inside this package but may be consumed through source exports.
  const initSqlJs = (await import("sql.js")).default;
  const require = createRequire(join(process.cwd(), "package.json"));
  const wasmPath = join(dirname(require.resolve("sql.js")), "sql-wasm.wasm");
  const SQL = await initSqlJs({ locateFile: () => wasmPath });
  const databasePath = resolveDatabasePath();
  if (!existsSync(databasePath)) {
    throw new Error(`SQLite database not found: ${databasePath}. Run pnpm seed:acceptance first.`);
  }
  const database = new SQL.Database(readFileSync(databasePath)) as SqlJsDatabase;
  let transactionDepth = 0;

  function persist() {
    writeFileSync(databasePath, Buffer.from(database.export()));
  }

  const client: SqliteRawClient = {
    async $executeRawUnsafe(query, ...values) {
      database.run(query, values);
      if (transactionDepth === 0) {
        persist();
      }
      return 0;
    },
    async $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T> {
      const statement = database.prepare(query);
      try {
        statement.bind(values);
        const rows: Record<string, unknown>[] = [];
        while (statement.step()) {
          rows.push(statement.getAsObject());
        }
        return rows as T;
      } finally {
        statement.free();
      }
    },
    async $transaction<T>(callback: (tx: SqliteRawClient) => Promise<T>): Promise<T> {
      const outermost = transactionDepth === 0;
      if (outermost) {
        database.run("BEGIN TRANSACTION");
      }
      transactionDepth += 1;
      try {
        const result = await callback(client);
        transactionDepth -= 1;
        if (outermost) {
          database.run("COMMIT");
          persist();
        }
        return result;
      } catch (error) {
        transactionDepth -= 1;
        if (outermost) {
          database.run("ROLLBACK");
          persist();
        }
        throw error;
      }
    }
  };

  return client;
}

function resolveDatabasePath(): string {
  const candidates = [
    join(process.cwd(), "packages/database/prisma/dev.db"),
    join(process.cwd(), "../../packages/database/prisma/dev.db")
  ];
  const databasePath = candidates.find((candidate) => existsSync(candidate));
  if (!databasePath) {
    throw new Error(`SQLite database not found. Tried: ${candidates.join(", ")}. Run pnpm seed:acceptance first.`);
  }
  return databasePath;
}
