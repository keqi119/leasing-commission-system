import { NextResponse } from "next/server";
import { workflowErrorResponse } from "@/server/api-error-response";
import { requirePermission } from "@/server/auth";
import { approveCommissionAdjustment } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permission = requirePermission(request, "commission:settlement:approve");
  if (!permission.ok) {
    return permission.response;
  }

  const { id } = await context.params;
  try {
    return NextResponse.json({ data: await approveCommissionAdjustment(id, { approvedBy: permission.actor.userId }) });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
