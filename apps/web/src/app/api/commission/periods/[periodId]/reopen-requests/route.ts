import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth";
import { createPeriodReopenRequest } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ periodId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const permission = requirePermission(request, "commission:settlement:calculate");
  if (!permission.ok) {
    return permission.response;
  }

  const { periodId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { reason?: string };
  const requestRecord = await createPeriodReopenRequest({
    periodId,
    requestedBy: permission.actor.userId,
    reason: body.reason ?? ""
  });

  return NextResponse.json({ data: requestRecord }, { status: 201 });
}
