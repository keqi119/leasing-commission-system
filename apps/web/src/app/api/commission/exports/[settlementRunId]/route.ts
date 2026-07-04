import { canExportSettlement } from "@lcs/commission-engine";
import { NextResponse } from "next/server";
import { workflowErrorResponse } from "@/server/api-error-response";
import { requirePermission } from "@/server/auth";
import { DbWorkflowError } from "@/server/db-workflow-errors";
import { buildPayoutWorkbook } from "@/server/export";
import { acceptanceScenarioSettlement } from "@/server/sample";
import { exportApprovedSettlementRun, getSettlementRun } from "@/server/trial-run-db-workflow";

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
  const body = await request.json().catch(() => ({}));
  const dbRun = await getSettlementRun(settlementRunId).catch(() => null);
  const status = dbRun?.status ?? body.status ?? "APPROVED";

  if (!canExportSettlement(status)) {
    return workflowErrorResponse(new DbWorkflowError("SETTLEMENT_RUN_NOT_EXPORTABLE", {
      runNo: dbRun?.runNo ?? settlementRunId,
      status
    }));
  }

  const exportRecord = dbRun
    ? await exportApprovedSettlementRun(settlementRunId, { exportedBy: permission.actor.userId }).catch((error) => error)
    : null;
  if (exportRecord instanceof Error) {
    return workflowErrorResponse(exportRecord);
  }
  const workbook = await buildPayoutWorkbook(dbRun?.snapshot ?? body.settlement ?? acceptanceScenarioSettlement, {
    approvalStatus: status,
    approvedBy: dbRun?.approvedBy ?? body.approvedBy ?? "boss",
    approvedAt: dbRun?.approvedAt ?? body.approvedAt ?? new Date().toISOString(),
    departmentName: dbRun?.departmentName ?? body.departmentName ?? "leasing sales"
  });
  const fileName = exportRecord?.fileName ?? `${settlementRunId}-payout.xlsx`;

  return new Response(new Uint8Array(workbook), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${fileName}"`
    }
  });
}
