import { NextResponse } from "next/server";
import { buildAsyncHealthStatus } from "@/server/local-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await buildAsyncHealthStatus();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
