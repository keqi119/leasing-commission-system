import { NextResponse } from "next/server";
import { getActorFromRequest } from "@/server/auth";
import {
  approveOfflineTargetAdjustment,
  createOfflineRecord,
  listOfflineRecords,
  reviewOfflineFinanceRecord,
  type OfflineResource
} from "@/server/offline-v1-db";

const resources = new Set<OfflineResource>([
  "employees",
  "vehicles",
  "periods",
  "targets",
  "rules",
  "orders",
  "revenue",
  "external-profit",
  "deposits",
  "vehicle-events",
  "target-adjustments",
  "import-batches"
]);

export async function GET(_request: Request, context: { params: Promise<{ resource: string }> }) {
  const resource = parseResource((await context.params).resource);
  if (!resource) {
    return NextResponse.json({ error: "未知数据对象" }, { status: 404 });
  }
  const result = await listOfflineRecords(resource);
  return NextResponse.json(result);
}

export async function POST(request: Request, context: { params: Promise<{ resource: string }> }) {
  const resource = parseResource((await context.params).resource);
  if (!resource || resource === "import-batches") {
    return NextResponse.json({ error: "未知或不可新增的数据对象" }, { status: 404 });
  }
  const actor = getActorFromRequest(request);
  if (!actor) {
    return NextResponse.json({ error: "请先在页面右上角选择本地试用角色" }, { status: 401 });
  }
  try {
    const input = await request.json();
    const record = await createOfflineRecord(resource, input, actor);
    const rows = (await listOfflineRecords(resource)).rows;
    return NextResponse.json({ record, rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ resource: string }> }) {
  const resource = parseResource((await context.params).resource);
  if (!resource) {
    return NextResponse.json({ error: "未知数据对象" }, { status: 404 });
  }
  const actor = getActorFromRequest(request);
  if (!actor) {
    return NextResponse.json({ error: "请先在页面右上角选择本地试用角色" }, { status: 401 });
  }
  try {
    const input = await request.json();
    const id = String(input.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "缺少记录 ID" }, { status: 400 });
    }
    let record: Record<string, unknown>;
    if ((resource === "revenue" || resource === "external-profit") && input.action === "finance-review") {
      record = await reviewOfflineFinanceRecord(resource, id, {
        status: input.status,
        reviewedBy: actor.userId,
        remark: input.remark
      });
    } else if (resource === "target-adjustments" && input.action === "target-adjustment-review") {
      record = await approveOfflineTargetAdjustment(id, {
        status: input.status,
        approvedBy: actor.userId,
        approvalRemark: input.remark
      });
    } else {
      return NextResponse.json({ error: "当前操作不支持" }, { status: 400 });
    }
    const rows = (await listOfflineRecords(resource)).rows;
    return NextResponse.json({ record, rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "处理失败" }, { status: 400 });
  }
}

function parseResource(value: string): OfflineResource | null {
  return resources.has(value as OfflineResource) ? (value as OfflineResource) : null;
}
