import { canExportSettlement } from "@lcs/commission-engine";
import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth";
import { buildPayoutWorkbook } from "@/server/export";
import { acceptanceScenarioSettlement } from "@/server/sample";

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
  const status = body.status ?? "APPROVED";

  if (!canExportSettlement(status)) {
    return NextResponse.json(
      { error: "Only boss-approved settlements can be exported" },
      { status: 409 }
    );
  }

  const workbook = await buildPayoutWorkbook(
    body.settlement ?? acceptanceScenarioSettlement,
    {
      approvalStatus: status,
      approvedBy: body.approvedBy ?? "老板",
      approvedAt: body.approvedAt ?? new Date().toISOString(),
      departmentName: body.departmentName ?? "租赁销售部"
    }
  );
  const fileName = `${settlementRunId}-payout.xlsx`;

  return new Response(new Uint8Array(workbook), {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${fileName}"`
    }
  });
}
