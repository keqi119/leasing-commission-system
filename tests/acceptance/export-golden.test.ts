import ExcelJS from "exceljs";
import { describe, expect, test } from "vitest";
import { calculateCommissionSettlement } from "../../packages/commission-engine/src/index";
import {
  acceptanceApprovalMeta,
  acceptanceScenarioInput
} from "../../packages/commission-engine/src/acceptance-fixture";
import { buildPayoutWorkbook } from "../../apps/web/src/server/export";
import { buildSettlementDisplayRows } from "../../apps/web/src/server/settlement-presenter";

describe("LCS-P1-H02 HR export golden validation", () => {
  test("keeps page display values, API calculation values, and exported xlsx values identical", async () => {
    const apiSettlement = calculateCommissionSettlement(acceptanceScenarioInput);
    const displayRows = buildSettlementDisplayRows(apiSettlement, acceptanceApprovalMeta);
    const workbookBuffer = await buildPayoutWorkbook(apiSettlement, acceptanceApprovalMeta);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(workbookBuffer);
    const worksheet = workbook.getWorksheet("奖金发放明细");

    expect(worksheet).toBeDefined();
    const headers = worksheet!.getRow(1).values.slice(1);
    expect(headers).toEqual(
      expect.arrayContaining([
        "考核周期",
        "部门",
        "员工姓名",
        "个人贡献收入",
        "贡献率",
        "部门目标",
        "部门实收",
        "达成率",
        "适用提成比例",
        "个人提成总额",
        "当期应发金额",
        "季度待发金额",
        "年终待发金额",
        "后续待发合计",
        "审批状态",
        "审批人",
        "审批时间"
      ])
    );

    for (const displayRow of displayRows) {
      const xlsxRow = worksheet!
        .getRows(2, worksheet!.rowCount - 1)!
        .find((row) => row.getCell(3).value === displayRow.employeeName);

      expect(xlsxRow, `missing export row for ${displayRow.employeeName}`).toBeDefined();
      expect(xlsxRow!.getCell(1).value).toBe(displayRow.periodCode);
      expect(xlsxRow!.getCell(2).value).toBe(displayRow.departmentName);
      expect(xlsxRow!.getCell(5).value).toBe(displayRow.personalContributionYuan);
      expect(xlsxRow!.getCell(6).value).toBe(displayRow.contributionRateText);
      expect(xlsxRow!.getCell(7).value).toBe(displayRow.departmentTargetYuan);
      expect(xlsxRow!.getCell(8).value).toBe(displayRow.departmentConfirmedRevenueYuan);
      expect(xlsxRow!.getCell(12).value).toBe(displayRow.achievementRateText);
      expect(xlsxRow!.getCell(13).value).toBe(displayRow.appliedCommissionRateText);
      expect(xlsxRow!.getCell(14).value).toBe(displayRow.grossCommissionYuan);
      expect(xlsxRow!.getCell(15).value).toBe(displayRow.currentPayoutYuan);
      expect(xlsxRow!.getCell(16).value).toBe(displayRow.quarterlyDeferredYuan);
      expect(xlsxRow!.getCell(17).value).toBe(displayRow.yearEndDeferredYuan);
      expect(xlsxRow!.getCell(22).value).toBe(displayRow.futurePayoutYuan);
      expect(xlsxRow!.getCell(23).value).toBe(displayRow.approvalStatus);
      expect(xlsxRow!.getCell(24).value).toBe(displayRow.approvedBy);
      expect(xlsxRow!.getCell(25).value).toBe(displayRow.approvedAt);
    }
  });
});
