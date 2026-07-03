import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth";
import { createSampleTrialRunWorkflowStore } from "@/server/trial-run-workflow";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const permission = requirePermission(request, "commission:period:read");
  if (!permission.ok) {
    return permission.response;
  }

  const store = createSampleTrialRunWorkflowStore();
  return NextResponse.json({
    data: {
      trialRuns: store.trialRuns,
      issues: store.issues,
      reports: store.reports,
      settlementRuns: store.settlementRuns.map((run) => ({
        id: run.id,
        runNo: run.runNo,
        status: run.status,
        periodCode: run.periodCode,
        basedOnRunId: run.basedOnRunId,
        rejectionReason: run.rejectionReason
      })),
      exports: store.exports
    }
  });
}
