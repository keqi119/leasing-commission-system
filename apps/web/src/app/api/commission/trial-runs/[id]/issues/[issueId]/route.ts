import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth";
import { resolveTrialRunIssue, updateTrialRunIssueStatus } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ issueId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permission = requirePermission(request, "commission:settlement:calculate");
  if (!permission.ok) {
    return permission.response;
  }

  const { issueId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    status?: "OPEN" | "FIXING" | "RESOLVED" | "ACCEPTED_RISK";
    resolution?: string;
  };
  const issue =
    body.status === "RESOLVED"
      ? await resolveTrialRunIssue(issueId, {
          resolvedBy: permission.actor.userId,
          resolution: body.resolution ?? "Resolved."
        })
      : await updateTrialRunIssueStatus(issueId, {
          status: body.status ?? "FIXING",
          operatorId: permission.actor.userId,
          resolution: body.resolution
        });

  return NextResponse.json({ data: issue });
}
