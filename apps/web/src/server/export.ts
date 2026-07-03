import ExcelJS from "exceljs";
import type { SettlementSnapshotResult } from "@lcs/commission-engine";
import {
  buildSettlementDisplayRows,
  type SettlementDisplayMeta
} from "./settlement-presenter";

export type ExportMeta = SettlementDisplayMeta;

export const payoutExportHeaders = [
  "考核周期",
  "部门",
  "员工姓名",
  "岗位角色",
  "个人贡献收入",
  "贡献率",
  "部门目标",
  "部门实收",
  "自有车租金收入",
  "外调利润回款",
  "历史欠款本月回收",
  "达成率",
  "适用提成比例",
  "个人提成总额",
  "当期应发金额",
  "季度待发金额",
  "年终待发金额",
  "其他待发金额",
  "冻结金额",
  "调整金额",
  "最终当期应发",
  "后续待发合计",
  "审批状态",
  "审批人",
  "审批时间",
  "备注"
] as const;

export async function buildPayoutWorkbook(
  settlement: SettlementSnapshotResult,
  meta: ExportMeta
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("奖金发放明细");
  worksheet.addRow([...payoutExportHeaders]);

  for (const row of buildSettlementDisplayRows(settlement, meta)) {
    worksheet.addRow([
      row.periodCode,
      row.departmentName,
      row.employeeName,
      row.roleInSettlement,
      row.personalContributionYuan,
      row.contributionRateText,
      row.departmentTargetYuan,
      row.departmentConfirmedRevenueYuan,
      row.ownedVehicleRevenueYuan,
      row.externalProfitYuan,
      row.historicalRecoveredYuan,
      row.achievementRateText,
      row.appliedCommissionRateText,
      row.grossCommissionYuan,
      row.currentPayoutYuan,
      row.quarterlyDeferredYuan,
      row.yearEndDeferredYuan,
      row.otherDeferredYuan,
      row.frozenAmountYuan,
      row.adjustmentAmountYuan,
      row.finalCurrentPayableYuan,
      row.futurePayoutYuan,
      row.approvalStatus,
      row.approvedBy,
      row.approvedAt,
      row.remark
    ]);
  }

  worksheet.getRow(1).font = { bold: true };
  worksheet.columns.forEach((column) => {
    column.width = 18;
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
