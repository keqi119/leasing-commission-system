import { NextResponse } from "next/server";
import { workflowErrorResponse } from "@/server/api-error-response";
import { requirePermission } from "@/server/auth";
import { generateTrialRunReport } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const permission = requirePermission(request, "commission:settlement:calculate");
  if (!permission.ok) {
    return permission.response;
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    gitCommit?: string;
    result?: "PASS" | "PASS_WITH_LIMITATIONS" | "FAIL";
    residualRiskSummary?: string;
  };
  try {
    const report = await generateTrialRunReport(id, {
      gitCommit: body.gitCommit ?? "local",
      acceptedBy: permission.actor.userId,
      result: body.result,
      residualRiskSummary: body.residualRiskSummary
    });

    return NextResponse.json({ data: report }, { status: 201 });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
