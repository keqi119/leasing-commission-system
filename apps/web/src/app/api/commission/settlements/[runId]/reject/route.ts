import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth";
import { rejectSettlementRun } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permission = requirePermission(request, "commission:settlement:approve");
  if (!permission.ok) {
    return permission.response;
  }

  const { runId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { reason?: string };
  return NextResponse.json({
    data: await rejectSettlementRun(runId, {
      rejectedBy: permission.actor.userId,
      reason: body.reason ?? ""
    })
  });
}
