import { NextResponse } from "next/server";
import {
  importTypes,
  localImportContext,
  previewImportRows,
  type ImportType,
  type RawImportRow
} from "../../../../../server/imports";
import { requirePermission } from "../../../../../server/auth";

export const dynamic = "force-dynamic";

function isImportType(value: unknown): value is ImportType {
  return typeof value === "string" && importTypes.includes(value as ImportType);
}

export async function POST(request: Request) {
  const permission = requirePermission(request, "commission:period:read");
  if (!permission.ok) {
    return permission.response;
  }

  const body = (await request.json().catch(() => null)) as {
    importType?: unknown;
    rows?: RawImportRow[];
    fileName?: string;
  } | null;

  if (!body || !isImportType(body.importType) || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "importType and rows are required" }, { status: 400 });
  }

  const preview = previewImportRows(body.importType, body.rows, localImportContext, {
    fileName: body.fileName
  });
  return NextResponse.json({ data: preview });
}
