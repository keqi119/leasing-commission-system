import { NextResponse } from "next/server";
import {
  buildTemplateCsv,
  buildTemplateWorkbook,
  getImportTemplates,
  importTypes,
  type ImportType
} from "../../../../../server/imports";

export const dynamic = "force-dynamic";

function isImportType(value: string | null): value is ImportType {
  return importTypes.includes(value as ImportType);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const importType = url.searchParams.get("type");
  const format = url.searchParams.get("format") ?? "json";

  if (!importType) {
    return NextResponse.json({ data: getImportTemplates() });
  }

  if (!isImportType(importType)) {
    return NextResponse.json({ error: "Unknown import template type" }, { status: 404 });
  }

  if (format === "csv") {
    return new Response(buildTemplateCsv(importType), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${importType}-template.csv"`
      }
    });
  }

  const workbook = await buildTemplateWorkbook(importType);
  return new Response(new Uint8Array(workbook), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${importType}-template.xlsx"`
    }
  });
}
