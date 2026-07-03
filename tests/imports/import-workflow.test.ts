import ExcelJS from "exceljs";
import { describe, expect, test } from "vitest";
import { calculateCommissionSettlement } from "../../packages/commission-engine/src/index";
import { acceptanceApprovalMeta } from "../../packages/commission-engine/src/acceptance-fixture";
import { buildPayoutWorkbook } from "../../apps/web/src/server/export";
import { buildSettlementDisplayRows } from "../../apps/web/src/server/settlement-presenter";
import {
  buildCommissionInputFromImportDraft,
  buildTemplateCsv,
  buildTemplateWorkbook,
  commitImportPreview,
  createDefaultImportContext,
  getImportTemplates,
  previewImportRows
} from "../../apps/web/src/server/imports";
import { GET as getTemplatesApi } from "../../apps/web/src/app/api/commission/imports/templates/route";

const context = createDefaultImportContext();

describe("LCS-P1-H03 import templates and workflow", () => {
  test("allows browser template downloads without custom auth headers", async () => {
    const response = await getTemplatesApi(
      new Request("http://localhost/api/commission/imports/templates?type=orders&format=csv")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(await response.text()).toContain(
      getImportTemplates().find((template) => template.importType === "orders")?.columns[2]
    );
  });

  test("downloads xlsx and csv import templates with business-friendly Chinese headers", async () => {
    const response = await getTemplatesApi(
      new Request("http://localhost/api/commission/imports/templates", {
        headers: { "x-lcs-role": "HR", "x-lcs-user-id": "hr-1" }
      })
    );
    const body = await response.json();
    const templates = getImportTemplates();

    expect(response.status).toBe(200);
    expect(body.data.map((template: { importType: string }) => template.importType)).toContain("orders");
    expect(templates.find((template) => template.importType === "orders")?.columns).toEqual([
      "考核周期",
      "部门",
      "订单号",
      "销售姓名",
      "客户名称",
      "车牌号",
      "车辆来源",
      "计费方式",
      "租赁开始日期",
      "租赁结束日期",
      "应收租金",
      "订单状态",
      "备注"
    ]);

    const externalProfitColumns = templates.find((template) => template.importType === "external-profit")?.columns;
    expect(externalProfitColumns).toEqual([
      "考核周期",
      "订单号",
      "销售姓名",
      "外调利润金额",
      "打回公司日期",
      "公司账户",
      "凭证链接",
      "是否参与提成",
      "备注"
    ]);
    expect(externalProfitColumns).not.toContain("外调收入");
    expect(externalProfitColumns).not.toContain("外调成本");

    const csv = buildTemplateCsv("orders");
    expect(csv.split("\n")[0]).toContain("订单号");
    const workbookBuffer = await buildTemplateWorkbook("orders");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(workbookBuffer);
    expect(workbook.getWorksheet("订单台账")?.getRow(1).values.slice(1)).toContain("应收租金");
  });

  test("previews a valid order template before committing it as a traceable batch", () => {
    const preview = previewImportRows(
      "orders",
      [
        {
          考核周期: "2026-04",
          部门: "租赁销售部",
          订单号: "TRIAL-202604-A-001",
          销售姓名: "销售 A",
          客户名称: "试运行客户 A",
          车牌号: "沪A-H03A",
          车辆来源: "自有",
          计费方式: "月租",
          租赁开始日期: "2026-04-01",
          租赁结束日期: "2026-04-30",
          应收租金: "300000",
          订单状态: "已完成",
          备注: "手工模板导入"
        }
      ],
      context
    );

    expect(preview.totalRows).toBe(1);
    expect(preview.validRows).toBe(1);
    expect(preview.errorRows).toBe(0);
    expect(preview.rows[0].normalizedJson).toMatchObject({
      orderNo: "TRIAL-202604-A-001",
      salesUserId: "A",
      receivableRentAmountCents: 30000000,
      dataSource: "IMPORT"
    });

    const originalOrderCount = context.orders.length;
    const committed = commitImportPreview(preview, context, { committedBy: "hr-1" });
    expect(committed.status).toBe("COMMITTED");
    expect(committed.writtenRows).toBe(1);
    expect(committed.affectedPeriods).toEqual(["2026-04"]);
    expect(committed.ledger.orders).toHaveLength(originalOrderCount + 1);
  });

  test("returns row-level business errors for missing fields, duplicate order numbers, negative amounts, and invalid dates", () => {
    const preview = previewImportRows(
      "orders",
      [
        {
          考核周期: "2026-04",
          部门: "租赁销售部",
          订单号: "ACC-202604-A-OWNED",
          销售姓名: "销售 A",
          客户名称: "重复订单客户",
          车牌号: "沪A-H03A",
          车辆来源: "自有",
          计费方式: "月租",
          租赁开始日期: "2026-04-01",
          租赁结束日期: "2026-04-30",
          应收租金: "1000",
          订单状态: "已完成"
        },
        {
          考核周期: "2026-04",
          部门: "租赁销售部",
          订单号: "TRIAL-NEGATIVE",
          销售姓名: "销售 A",
          客户名称: "负数客户",
          车牌号: "沪A-H03A",
          车辆来源: "自有",
          计费方式: "月租",
          租赁开始日期: "bad-date",
          租赁结束日期: "2026-04-30",
          应收租金: "-1",
          订单状态: "已完成"
        },
        {
          考核周期: "2026-04",
          部门: "租赁销售部",
          订单号: "TRIAL-MISSING-SALES",
          销售姓名: "",
          客户名称: "缺销售客户",
          车牌号: "沪A-H03A",
          车辆来源: "自有",
          计费方式: "月租",
          租赁开始日期: "2026-04-01",
          租赁结束日期: "2026-04-30",
          应收租金: "1000",
          订单状态: "已完成"
        }
      ],
      context
    );

    expect(preview.status).toBe("VALIDATION_FAILED");
    expect(preview.errorRows).toBe(3);
    expect(preview.rows.flatMap((row) => row.errors.map((error) => error.code))).toEqual(
      expect.arrayContaining([
        "DUPLICATE_ORDER_NO",
        "NEGATIVE_AMOUNT",
        "INVALID_DATE",
        "REQUIRED_FIELD_MISSING"
      ])
    );
    expect(() => commitImportPreview(preview, context, { committedBy: "hr-1" })).toThrow(
      "导入预览存在错误行，不能提交入库"
    );
  });

  test("validates dependent ledgers and locked periods before importing settlement-affecting rows", () => {
    const missingOrderRevenue = previewImportRows(
      "revenue",
      [
        {
          考核周期: "2026-04",
          订单号: "NOT-FOUND",
          销售姓名: "销售 A",
          收款金额: "1000",
          收款日期: "2026-04-20",
          公司账户: "公司账户",
          财务审核状态: "已审核",
          是否参与提成: "是"
        }
      ],
      context
    );
    expect(missingOrderRevenue.rows[0].errors.map((error) => error.code)).toContain("ORDER_NOT_FOUND");

    const closedPeriod = previewImportRows(
      "orders",
      [
        {
          考核周期: "2026-03",
          部门: "租赁销售部",
          订单号: "CLOSED-PERIOD-ORDER",
          销售姓名: "销售 A",
          客户名称: "关闭周期客户",
          车牌号: "沪A-H03A",
          车辆来源: "自有",
          计费方式: "月租",
          租赁开始日期: "2026-03-01",
          租赁结束日期: "2026-03-31",
          应收租金: "1000",
          订单状态: "已完成"
        }
      ],
      context
    );
    expect(closedPeriod.rows[0].errors.map((error) => error.code)).toContain("PERIOD_LOCKED_FOR_IMPORT");

    const financeLockedRevenue = previewImportRows(
      "revenue",
      [
        {
          考核周期: "2026-05",
          订单号: "MAY-ORDER-A",
          销售姓名: "销售 A",
          收款金额: "1000",
          收款日期: "2026-05-20",
          公司账户: "公司账户",
          财务审核状态: "已审核",
          是否参与提成: "是"
        }
      ],
      context
    );
    expect(financeLockedRevenue.rows[0].errors.map((error) => error.code)).toContain("FINANCE_LOCKED_PERIOD");
  });

  test("builds the 2026-04 trial settlement from imported rows without breaking external profit, deposit, or unpaid rules", async () => {
    const draft = createDefaultImportContext({ emptyLedgers: true });
    const orderPreview = previewImportRows(
      "orders",
      [
        { 考核周期: "2026-04", 部门: "租赁销售部", 订单号: "TRIAL-A", 销售姓名: "销售 A", 客户名称: "客户A", 车牌号: "沪A-H03A", 车辆来源: "自有", 计费方式: "月租", 租赁开始日期: "2026-04-01", 租赁结束日期: "2026-04-30", 应收租金: "300000", 订单状态: "已完成" },
        { 考核周期: "2026-04", 部门: "租赁销售部", 订单号: "TRIAL-B", 销售姓名: "销售 B", 客户名称: "客户B", 车牌号: "沪A-H03B", 车辆来源: "自有", 计费方式: "月租", 租赁开始日期: "2026-04-01", 租赁结束日期: "2026-04-30", 应收租金: "100000", 订单状态: "已完成" },
        { 考核周期: "2026-04", 部门: "租赁销售部", 订单号: "TRIAL-C-EXT", 销售姓名: "销售 C", 客户名称: "客户C", 车牌号: "沪A-H03C", 车辆来源: "外调", 计费方式: "月租", 租赁开始日期: "2026-04-01", 租赁结束日期: "2026-04-30", 应收租金: "0", 订单状态: "已完成" },
        { 考核周期: "2026-04", 部门: "租赁销售部", 订单号: "TRIAL-UNPAID", 销售姓名: "销售 A", 客户名称: "未收客户", 车牌号: "沪A-H03A", 车辆来源: "自有", 计费方式: "月租", 租赁开始日期: "2026-04-01", 租赁结束日期: "2026-04-30", 应收租金: "99900", 订单状态: "进行中" }
      ],
      draft
    );
    expect(orderPreview.errorRows).toBe(0);
    commitImportPreview(orderPreview, draft, { committedBy: "hr-1" });

    const importTypes = [
      previewImportRows(
        "revenue",
        [
          { 考核周期: "2026-04", 订单号: "TRIAL-A", 销售姓名: "销售 A", 收款金额: "300000", 收款日期: "2026-04-20", 公司账户: "公司账户", 财务审核状态: "已审核", 收入口径: "本期租金", 是否参与提成: "是" },
          { 考核周期: "2026-04", 订单号: "TRIAL-B", 销售姓名: "销售 B", 收款金额: "100000", 收款日期: "2026-04-20", 公司账户: "公司账户", 财务审核状态: "已审核", 收入口径: "本期租金", 是否参与提成: "是" },
          { 考核周期: "2026-04", 订单号: "TRIAL-B", 销售姓名: "销售 B", 收款金额: "39000", 收款日期: "2026-04-21", 公司账户: "公司账户", 财务审核状态: "已审核", 收入口径: "历史欠款本月回收", 是否参与提成: "是" }
        ],
        draft
      ),
      previewImportRows(
        "external-profit",
        [
          { 考核周期: "2026-04", 订单号: "TRIAL-C-EXT", 销售姓名: "销售 C", 外调利润金额: "80000", 打回公司日期: "2026-04-22", 公司账户: "公司账户", 凭证链接: "https://example.test/proof", 是否参与提成: "是", 备注: "只导利润" }
        ],
        draft
      ),
      previewImportRows(
        "deposits",
        [
          { 考核周期: "2026-04", 订单号: "TRIAL-A", 销售姓名: "销售 A", 押金金额: "50000", 暂管人: "销售 A", 收取日期: "2026-04-01", 退还金额: "0", 退还状态: "暂存", 备注: "不计提" },
          { 考核周期: "2026-04", 订单号: "TRIAL-B", 销售姓名: "销售 B", 押金金额: "30000", 暂管人: "销售 B", 收取日期: "2026-04-01", 退还金额: "0", 退还状态: "争议", 备注: "风险提示" }
        ],
        draft
      )
    ];

    for (const preview of importTypes) {
      expect(preview.errorRows).toBe(0);
      commitImportPreview(preview, draft, { committedBy: "hr-1" });
    }

    const input = buildCommissionInputFromImportDraft(draft, "2026-04");
    const settlement = calculateCommissionSettlement(input);
    expect(settlement.confirmedRevenueAmountCents).toBe(51900000);
    expect(settlement.externalProfitAmountCents).toBe(8000000);
    expect(settlement.depositRiskCount).toBe(1);
    expect(settlement.lines.map((line) => [line.userId, line.confirmedContributionAmountCents])).toEqual([
      ["A", 30000000],
      ["B", 13900000],
      ["C", 8000000]
    ]);

    const workbookBuffer = await buildPayoutWorkbook(settlement, acceptanceApprovalMeta);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(workbookBuffer);
    const worksheet = workbook.getWorksheet("奖金发放明细")!;
    const displayRows = buildSettlementDisplayRows(settlement, acceptanceApprovalMeta);
    expect(worksheet.getRow(2).getCell(15).value).toBe(displayRows[0].currentPayoutYuan);
    expect(worksheet.getRow(4).getCell(22).value).toBe(displayRows[2].futurePayoutYuan);
  });
});
