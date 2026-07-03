import ExcelJS from "exceljs";
import type { SettlementSnapshotResult } from "@lcs/commission-engine";
import { formatBps } from "./sample";

export interface ExportMeta {
  approvalStatus: string;
  approvedBy: string;
  approvedAt: string;
  departmentName: string;
}

const headers = [
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
];

export async function buildPayoutWorkbook(
  settlement: SettlementSnapshotResult,
  meta: ExportMeta
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("奖金发放明细");
  worksheet.addRow(headers);

  for (const line of settlement.lines) {
    worksheet.addRow([
      settlement.periodCode,
      meta.departmentName,
      line.employeeName,
      line.roleInSettlement,
      line.confirmedContributionAmountCents / 100,
      formatBps(line.contributionRateBps),
      settlement.targetAmountCents / 100,
      settlement.confirmedRevenueAmountCents / 100,
      settlement.ownedVehicleRevenueAmountCents / 100,
      settlement.externalProfitAmountCents / 100,
      settlement.historicalReceivableRecoveredAmountCents / 100,
      formatBps(settlement.achievementRateBps),
      formatBps(settlement.appliedCommissionRateBps),
      line.grossCommissionCents / 100,
      line.currentPayoutCents / 100,
      line.quarterlyDeferredCents / 100,
      line.yearEndDeferredCents / 100,
      line.otherDeferredCents / 100,
      line.frozenAmountCents / 100,
      line.adjustmentAmountCents / 100,
      line.finalCurrentPayableCents / 100,
      line.futurePayoutCents / 100,
      meta.approvalStatus,
      meta.approvedBy,
      meta.approvedAt,
      line.remark
    ]);
  }

  worksheet.getRow(1).font = { bold: true };
  worksheet.columns.forEach((column) => {
    column.width = 18;
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

