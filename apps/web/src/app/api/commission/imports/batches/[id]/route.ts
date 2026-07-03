import { NextResponse } from "next/server";
import { requirePermission } from "../../../../../../server/auth";
import { localImportBatches } from "../../../../../../server/imports";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const permission = requirePermission(request, "commission:period:read");
  if (!permission.ok) {
    return permission.response;
  }

  const { id } = await context.params;
  const batch = localImportBatches.find((candidate) => candidate.batchId === id);

  if (!batch) {
    return NextResponse.json({ error: "Import batch not found" }, { status: 404 });
  }

  return NextResponse.json({ data: batch });
}
