import { NextResponse } from "next/server";
import {
  commitImportPreview,
  localImportBatches,
  localImportContext,
  type ImportPreviewResult
} from "../../../../../server/imports";
import { requirePermission } from "../../../../../server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const permission = requirePermission(request, "commission:settlement:calculate");
  if (!permission.ok) {
    return permission.response;
  }

  const body = (await request.json().catch(() => null)) as {
    batchId?: string;
    preview?: ImportPreviewResult;
  } | null;
  const preview =
    body?.preview ??
    localImportBatches.find((candidate) => candidate.batchId === body?.batchId);

  if (!preview) {
    return NextResponse.json({ error: "Import preview batch not found" }, { status: 404 });
  }

  try {
    const result = commitImportPreview(preview, localImportContext, {
      committedBy: permission.actor.userId
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import commit failed" },
      { status: 409 }
    );
  }
}
