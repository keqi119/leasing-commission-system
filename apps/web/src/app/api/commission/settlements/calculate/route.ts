import {
  calculateCommissionSettlement,
  type CommissionSettlementInput
} from "@lcs/commission-engine";
import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth";
import { acceptanceScenarioInput } from "@/server/sample";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const permission = requirePermission(
    request,
    "commission:settlement:calculate"
  );
  if (!permission.ok) {
    return permission.response;
  }

  const body = (await request.json().catch(() => null)) as Partial<
    CommissionSettlementInput
  > | null;
  const input =
    body && typeof body.targetAmountCents === "number"
      ? (body as CommissionSettlementInput)
      : acceptanceScenarioInput;
  const settlement = calculateCommissionSettlement(input);

  return NextResponse.json({
    data: settlement,
    calculatedBy: permission.actor.userId,
    calculatedAt: new Date().toISOString()
  });
}
