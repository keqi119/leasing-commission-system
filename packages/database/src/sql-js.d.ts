declare module "sql.js" {
  interface SqlJsDatabaseConstructor {
    new (data?: Buffer | Uint8Array): unknown;
  }

  interface SqlJsModule {
    Database: SqlJsDatabaseConstructor;
  }

  export default function initSqlJs(options?: { locateFile?: (file: string) => string }): Promise<SqlJsModule>;
}
