import { NextResponse } from "next/server";
import {
  importTypes,
  localImportContext,
  parseImportFileRows,
  previewImportRows,
  type ImportType,
  type RawImportRow
} from "../../../../../server/imports";
import { requirePermission } from "../../../../../server/auth";
import { buildImportContextFromDb } from "../../../../../server/offline-v1-db";

export const dynamic = "force-dynamic";

function isImportType(value: unknown): value is ImportType {
  return typeof value === "string" && importTypes.includes(value as ImportType);
}

export async function POST(request: Request) {
  const permission = requirePermission(request, "commission:period:read");
  if (!permission.ok) {
    return permission.response;
  }

  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const formData = await request.formData();
    const importType = formData.get("importType");
    const file = formData.get("file");

    if (!isImportType(importType) || !(file instanceof File)) {
      return NextResponse.json({ error: "importType and file are required" }, { status: 400 });
    }

    try {
      const rows = await parseImportFileRows({
        fileName: file.name,
        contentType: file.type,
        buffer: Buffer.from(await file.arrayBuffer())
      });
      const preview = await previewWithBestContext(importType, rows, file.name);
      return NextResponse.json({ data: preview });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Import file preview failed" },
        { status: 400 }
      );
    }
  }

  const body = (await request.json().catch(() => null)) as {
    importType?: unknown;
    rows?: RawImportRow[];
    fileName?: string;
  } | null;

  if (!body || !isImportType(body.importType) || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "importType and rows are required" }, { status: 400 });
  }

  const preview = await previewWithBestContext(body.importType, body.rows, body.fileName);
  return NextResponse.json({ data: preview });
}

async function previewWithBestContext(importType: ImportType, rows: RawImportRow[], fileName?: string) {
  const dbPreview = previewImportRows(importType, rows, await getPreviewContext(), { fileName });
  if (dbPreview.errorRows === 0) {
    return dbPreview;
  }
  const fallbackPreview = previewImportRows(importType, rows, localImportContext, { fileName });
  return fallbackPreview.errorRows < dbPreview.errorRows ? fallbackPreview : dbPreview;
}

async function getPreviewContext() {
  try {
    return await buildImportContextFromDb();
  } catch {
    return localImportContext;
  }
}
