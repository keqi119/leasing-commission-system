import { getSqliteClient } from "@lcs/database";
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
    table: string;
    readPermission: CommissionPermission;
    writePermission: CommissionPermission;
  }
> = {
  periods: {
    table: "CommissionPeriod",
    readPermission: "commission:period:read",
    writePermission: "commission:period:manage"
  },
  targets: {
    table: "CommissionTarget",
    readPermission: "commission:period:read",
    writePermission: "commission:target:manage"
  },
  rules: {
    table: "CommissionRuleSet",
    readPermission: "commission:period:read",
    writePermission: "commission:rule:manage"
  },
  orders: {
    table: "LeaseOrderLedger",
    readPermission: "commission:order:read:department",
    writePermission: "commission:order:create"
  },
  revenue: {
    table: "RevenueReceiptLedger",
    readPermission: "commission:order:read:department",
    writePermission: "commission:revenue:submit"
  },
  "external-profit": {
    table: "ExternalProfitReceipt",
    readPermission: "commission:order:read:department",
    writePermission: "commission:external-profit:submit"
  },
  deposits: {
    table: "DepositLedger",
    readPermission: "commission:deposit:manage:self",
    writePermission: "commission:deposit:manage:self"
  },
  receivables: {
    table: "ReceivableSnapshot",
    readPermission: "commission:receivable:read",
    writePermission: "commission:receivable:read"
  },
  "vehicle-events": {
    table: "VehicleStatusEvent",
    readPermission: "commission:period:read",
    writePermission: "commission:target-adjustment:request"
  },
  "target-adjustments": {
    table: "TargetAdjustmentRequest",
    readPermission: "commission:period:read",
    writePermission: "commission:target-adjustment:request"
  },
  settlements: {
    table: "CommissionSettlementRun",
    readPermission: "commission:period:read",
    writePermission: "commission:settlement:calculate"
  },
  approvals: {
    table: "CommissionApprovalLog",
    readPermission: "commission:period:read",
    writePermission: "commission:settlement:approve"
  },
  exports: {
    table: "CommissionExportRecord",
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

  const db = await getSqliteClient();
  const rows = await db.$queryRawUnsafe(`SELECT * FROM ${config.table} LIMIT 100`);

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

  const body = (await request.json()) as Record<string, unknown>;
  const row: Record<string, unknown> = { id: `${resource}-${Date.now()}`, ...body };
  const columns = Object.keys(row);
  const placeholders = columns.map(() => "?").join(", ");
  const db = await getSqliteClient();
  await db.$executeRawUnsafe(
    `INSERT INTO ${config.table} (${columns.join(", ")}) VALUES (${placeholders})`,
    ...columns.map((column) => row[column])
  );

  return NextResponse.json({ data: row }, { status: 201 });
}
