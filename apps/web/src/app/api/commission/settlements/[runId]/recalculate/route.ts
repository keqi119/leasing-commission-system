import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth";
import { getSettlementRun, recalculateSettlementRun } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const permission = requirePermission(request, "commission:settlement:calculate");
  if (!permission.ok) {
    return permission.response;
  }

  const { runId } = await context.params;
  const previous = await getSettlementRun(runId);
  return NextResponse.json({
    data: await recalculateSettlementRun({
      periodCode: previous.periodCode,
      calculatedBy: permission.actor.userId,
      basedOnRunId: runId
    })
  });
}
