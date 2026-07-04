import { OfflineCrudPanel } from "./OfflineCrudPanel";
import { getOfflineCrudConfig } from "./offline-crud-config";
import { getImportTemplates } from "@/server/imports";
import { listOfflineRecords, type OfflineResource } from "@/server/offline-v1-db";

export async function OfflineCrudPage({ resource }: { resource: OfflineResource }) {
  const config = getOfflineCrudConfig(resource);
  const importTemplates = getImportTemplates();
  const [rowsResult, employees, vehicles, periods, orders] = await Promise.all([
    safeList(resource),
    safeList("employees"),
    safeList("vehicles"),
    safeList("periods"),
    safeList("orders")
  ]);

  return (
    <OfflineCrudPanel
      config={config}
      initialRows={rowsResult.rows}
      references={{
        employees: employees.rows,
        vehicles: vehicles.rows,
        periods: periods.rows,
        orders: orders.rows
      }}
      importTemplates={importTemplates}
      initialError={rowsResult.error}
    />
  );
}

async function safeList(resource: OfflineResource): Promise<{ rows: Array<Record<string, unknown>>; error?: string }> {
  try {
    const result = await listOfflineRecords(resource);
    return { rows: result.rows };
  } catch (error) {
    return {
      rows: [],
      error: error instanceof Error ? `读取 ${resource} 失败：${error.message}` : `读取 ${resource} 失败`
    };
  }
}
