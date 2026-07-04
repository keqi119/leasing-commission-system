import ExcelJS from "exceljs";
import { describe, expect, test } from "vitest";
import { POST as previewImportApi } from "../../apps/web/src/app/api/commission/imports/preview/route";
import {
  buildTemplateWorkbook,
  getImportTemplates,
  parseImportFileRows
} from "../../apps/web/src/server/imports";

function rowFromTemplate(importType: "orders") {
  const template = getImportTemplates().find((candidate) => candidate.importType === importType);
  if (!template) {
    throw new Error(`template missing: ${importType}`);
  }

  const values: Record<string, string> = {
    考核周期: "2026-04",
    部门: "租赁销售部",
    订单号: "UPLOAD-202604-001",
    销售姓名: "销售 A",
    客户名称: "上传客户 A",
    车牌号: "沪A-H03A",
    车辆来源: "自有",
    计费方式: "月租",
    租赁开始日期: "2026-04-01",
    租赁结束日期: "2026-04-30",
    应收租金: "300000",
    订单状态: "已完成",
    备注: "页面上传预览"
  };

  return template.columns.map((column) => values[column] ?? "");
}

async function buildFilledOrderWorkbook() {
  const workbookBuffer = await buildTemplateWorkbook("orders");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(workbookBuffer);
  const template = getImportTemplates().find((candidate) => candidate.importType === "orders");
  const worksheet = workbook.getWorksheet(template!.worksheetName);
  rowFromTemplate("orders").forEach((value, index) => {
    worksheet!.getRow(2).getCell(index + 1).value = value;
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("commission import upload workflow", () => {
  test("parses uploaded xlsx template rows before preview validation", async () => {
    const workbookBuffer = await buildFilledOrderWorkbook();

    const rows = await parseImportFileRows({
      fileName: "orders-template.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: workbookBuffer
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      考核周期: "2026-04",
      订单号: "UPLOAD-202604-001",
      应收租金: "300000"
    });
  });

  test("preview API accepts multipart xlsx uploads from the browser", async () => {
    const workbookBuffer = await buildFilledOrderWorkbook();
    const formData = new FormData();
    formData.append("importType", "orders");
    formData.append(
      "file",
      new File([workbookBuffer], "orders-template.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      })
    );

    const response = await previewImportApi(
      new Request("http://localhost/api/commission/imports/preview", {
        method: "POST",
        headers: { "x-lcs-role": "HR", "x-lcs-user-id": "hr-1" },
        body: formData
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      importType: "orders",
      fileName: "orders-template.xlsx",
      totalRows: 1,
      validRows: 1,
      errorRows: 0
    });
    expect(body.data.rows[0].normalizedJson).toMatchObject({
      orderNo: "UPLOAD-202604-001",
      dataSource: "IMPORT"
    });
  });
});
