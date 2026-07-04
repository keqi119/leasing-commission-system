import { readFileSync } from "node:fs";
import { NextResponse } from "next/server";
import { workflowErrorResponse } from "@/server/api-error-response";
import { requirePermission } from "@/server/auth";
import { exportSettlementWorkbookToLocalFile } from "@/server/offline-v1-db";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ settlementRunId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const permission = requirePermission(request, "commission:settlement:export");
  if (!permission.ok) {
    return permission.response;
  }

  const { settlementRunId } = await context.params;
  try {
    const exportRecord = await exportSettlementWorkbookToLocalFile(settlementRunId, {
      exportedBy: permission.actor.userId
    });
    return new Response(new Uint8Array(readFileSync(exportRecord.filePath)), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${exportRecord.fileName}"`,
        "x-lcs-export-run-no": exportRecord.runNo,
        "x-lcs-export-file-url": exportRecord.fileUrl
      }
    });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
