import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth";
import { createSampleTrialRunWorkflowStore, getSettlementRunDiff } from "@/server/trial-run-workflow";

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
  const store = createSampleTrialRunWorkflowStore();
  const run = store.settlementRuns.find((candidate) => candidate.id === runId);
  const previous = run?.basedOnRunId ? store.settlementRuns.find((candidate) => candidate.id === run.basedOnRunId) : undefined;
  if (!run || !previous) {
    return NextResponse.json({ error: "Settlement diff is not available for this run" }, { status: 404 });
  }

  return NextResponse.json({ data: getSettlementRunDiff(previous, run) });
}
