import { NextResponse } from "next/server";
import { requirePermission } from "../../../../../server/auth";
import { localImportBatches } from "../../../../../server/imports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const permission = requirePermission(request, "commission:period:read");
  if (!permission.ok) {
    return permission.response;
  }

  return NextResponse.json({
    data: localImportBatches.map((batch) => ({
      batchId: batch.batchId,
      importType: batch.importType,
      fileName: batch.fileName,
      fileHash: batch.fileHash,
      status: batch.status,
      dryRun: batch.dryRun,
      totalRows: batch.totalRows,
      validRows: batch.validRows,
      errorRows: batch.errorRows
    }))
  });
}
