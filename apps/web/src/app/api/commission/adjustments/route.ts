import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth";
import { createCommissionAdjustment, listAdjustments } from "@/server/trial-run-db-workflow";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const permission = requirePermission(request, "commission:period:read");
  if (!permission.ok) {
    return permission.response;
  }

  return NextResponse.json({ data: { adjustments: await listAdjustments() } });
}

export async function POST(request: Request) {
  const permission = requirePermission(request, "commission:settlement:calculate");
  if (!permission.ok) {
    return permission.response;
  }

  const body = (await request.json().catch(() => ({}))) as {
    periodId?: string;
    periodCode?: string;
    userId?: string;
    adjustmentType?: "DATA_CORRECTION" | "BOSS_DECISION" | "RECEIVABLE_FREEZE" | "DEPOSIT_RISK" | "SPECIAL_REWARD" | "SPECIAL_DEDUCTION" | "ROUNDING_CORRECTION" | "OTHER";
    amountCents?: number;
    direction?: "ADD" | "DEDUCT";
    reason?: string;
    evidenceUrl?: string;
    settlementRunId?: string;
  };
  const adjustment = await createCommissionAdjustment({
    periodId: body.periodId,
    periodCode: body.periodCode,
    userId: body.userId ?? "",
    adjustmentType: body.adjustmentType ?? "OTHER",
    amountCents: body.amountCents ?? 0,
    direction: body.direction ?? "ADD",
    reason: body.reason ?? "",
    evidenceUrl: body.evidenceUrl,
    settlementRunId: body.settlementRunId,
    requestedBy: permission.actor.userId
  });

  return NextResponse.json({ data: adjustment }, { status: 201 });
}
