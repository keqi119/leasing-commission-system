import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth";
import { createTrialRunIssue } from "@/server/trial-run-db-workflow";

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
    severity?: "BLOCKER" | "MAJOR" | "MINOR" | "INFO";
    category?: "IMPORT" | "ORDER" | "REVENUE" | "DEPOSIT" | "EXTERNAL_PROFIT" | "RECEIVABLE" | "TARGET" | "SETTLEMENT" | "EXPORT" | "PERMISSION";
    title?: string;
    description?: string;
    ownerRole?: string;
  };
  const issue = await createTrialRunIssue({
    trialRunId: id,
    severity: body.severity ?? "MAJOR",
    category: body.category ?? "SETTLEMENT",
    title: body.title ?? "Trial run issue",
    description: body.description ?? "",
    ownerRole: body.ownerRole ?? permission.actor.role,
    createdBy: permission.actor.userId
  });

  return NextResponse.json({ data: issue }, { status: 201 });
}
