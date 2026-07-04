import { NextResponse } from "next/server";
import { workflowErrorResponse } from "@/server/api-error-response";
import { requirePermission } from "@/server/auth";
import { recalculateSettlementRun } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const permission = requirePermission(
    request,
    "commission:settlement:calculate"
  );
  if (!permission.ok) {
    return permission.response;
  }

  const body = (await request.json().catch(() => ({}))) as { periodCode?: string; basedOnRunId?: string };
  try {
    return NextResponse.json({
      data: await recalculateSettlementRun({
        periodCode: body.periodCode ?? "2026-04",
        basedOnRunId: body.basedOnRunId,
        calculatedBy: permission.actor.userId
      })
    });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
