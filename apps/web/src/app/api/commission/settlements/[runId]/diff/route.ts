import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth";
import { getSettlementRunDiffForLatest } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const permission = requirePermission(request, "commission:period:read");
  if (!permission.ok) {
    return permission.response;
  }

  const { runId } = await context.params;
  const diff = await getSettlementRunDiffForLatest(runId);
  if (!diff) {
    return NextResponse.json({ error: "Settlement diff is not available for this run" }, { status: 404 });
  }

  return NextResponse.json({ data: diff });
}
