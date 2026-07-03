import { getPrisma } from "@lcs/database";
import type { CommissionPermission } from "@lcs/shared";
import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ resource: string }>;
};

const resourceConfig: Record<
  string,
  {
    model: string;
    readPermission: CommissionPermission;
    writePermission: CommissionPermission;
  }
> = {
  periods: {
    model: "commissionPeriod",
    readPermission: "commission:period:read",
    writePermission: "commission:period:manage"
  },
  targets: {
    model: "commissionTarget",
    readPermission: "commission:period:read",
    writePermission: "commission:target:manage"
  },
  rules: {
    model: "commissionRuleSet",
    readPermission: "commission:period:read",
    writePermission: "commission:rule:manage"
  },
  orders: {
    model: "leaseOrderLedger",
    readPermission: "commission:order:read:department",
    writePermission: "commission:order:create"
  },
  revenue: {
    model: "revenueReceiptLedger",
    readPermission: "commission:order:read:department",
    writePermission: "commission:revenue:submit"
  },
  "external-profit": {
    model: "externalProfitReceipt",
    readPermission: "commission:order:read:department",
    writePermission: "commission:external-profit:submit"
  },
  deposits: {
    model: "depositLedger",
    readPermission: "commission:deposit:manage:self",
    writePermission: "commission:deposit:manage:self"
  },
  receivables: {
    model: "receivableSnapshot",
    readPermission: "commission:receivable:read",
    writePermission: "commission:receivable:read"
  },
  "vehicle-events": {
    model: "vehicleStatusEvent",
    readPermission: "commission:period:read",
    writePermission: "commission:target-adjustment:request"
  },
  "target-adjustments": {
    model: "targetAdjustmentRequest",
    readPermission: "commission:period:read",
    writePermission: "commission:target-adjustment:request"
  },
  settlements: {
    model: "commissionSettlementRun",
    readPermission: "commission:period:read",
    writePermission: "commission:settlement:calculate"
  },
  approvals: {
    model: "commissionApprovalLog",
    readPermission: "commission:period:read",
    writePermission: "commission:settlement:approve"
  },
  exports: {
    model: "commissionExportRecord",
    readPermission: "commission:settlement:export",
    writePermission: "commission:settlement:export"
  }
};

export async function GET(request: Request, context: RouteContext) {
  const { resource } = await context.params;
  const config = resourceConfig[resource];

  if (!config) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const permission = requirePermission(request, config.readPermission);
  if (!permission.ok) {
    return permission.response;
  }

  const prisma = getPrisma() as unknown as Record<string, { findMany: Function }>;
  const rows = await prisma[config.model].findMany({ take: 100 });

  return NextResponse.json({ data: rows });
}

export async function POST(request: Request, context: RouteContext) {
  const { resource } = await context.params;
  const config = resourceConfig[resource];

  if (!config) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const permission = requirePermission(request, config.writePermission);
  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();
  const prisma = getPrisma() as unknown as Record<string, { create: Function }>;
  const row = await prisma[config.model].create({ data: body });

  return NextResponse.json({ data: row }, { status: 201 });
}

