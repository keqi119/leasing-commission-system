import { canExportSettlement } from "@lcs/commission-engine";
import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth";
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
    return NextResponse.json({ error: "Only boss-approved settlements can be exported" }, { status: 409 });
  }

  const exportRecord = dbRun
    ? await exportApprovedSettlementRun(settlementRunId, { exportedBy: permission.actor.userId })
    : null;
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
