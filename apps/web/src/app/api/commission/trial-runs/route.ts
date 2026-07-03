import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth";
import { createTrialRun, listTrialRuns } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const permission = requirePermission(request, "commission:period:read");
  if (!permission.ok) {
    return permission.response;
  }

  return NextResponse.json({ data: { trialRuns: await listTrialRuns() } });
}

export async function POST(request: Request) {
  const permission = requirePermission(request, "commission:settlement:calculate");
  if (!permission.ok) {
    return permission.response;
  }

  const body = (await request.json().catch(() => ({}))) as {
    periodId?: string;
    periodCode?: string;
    name?: string;
  };
  const trialRun = await createTrialRun({
    periodId: body.periodId,
    periodCode: body.periodCode,
    name: body.name ?? `${body.periodCode ?? body.periodId} trial run`,
    startedBy: permission.actor.userId
  });

  return NextResponse.json({ data: trialRun }, { status: 201 });
}
