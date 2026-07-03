import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth";
import { approvePeriodReopenRequest } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permission = requirePermission(request, "commission:settlement:approve");
  if (!permission.ok) {
    return permission.response;
  }

  const { requestId } = await context.params;
  return NextResponse.json({ data: await approvePeriodReopenRequest(requestId, { approvedBy: permission.actor.userId }) });
}
