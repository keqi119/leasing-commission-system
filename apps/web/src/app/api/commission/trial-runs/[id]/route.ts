import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth";
import { getTrialRun } from "@/server/trial-run-db-workflow";

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
  const detail = await getTrialRun(id);
  if (!detail) {
    return NextResponse.json({ error: "Trial run not found" }, { status: 404 });
  }

  return NextResponse.json({ data: detail });
}
