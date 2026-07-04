import { NextResponse } from "next/server";
import { workflowErrorResponse } from "@/server/api-error-response";
import { requirePermission } from "@/server/auth";
import { submitSettlementRun } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permission = requirePermission(request, "commission:settlement:calculate");
  if (!permission.ok) {
    return permission.response;
  }

  const { runId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { excludePendingAdjustments?: boolean };
  try {
    return NextResponse.json({
      data: await submitSettlementRun(runId, {
        submittedBy: permission.actor.userId,
        excludePendingAdjustments: body.excludePendingAdjustments
      })
    });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
