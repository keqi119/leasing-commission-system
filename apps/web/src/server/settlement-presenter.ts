import type { SettlementSnapshotResult } from "@lcs/commission-engine";
import { formatBps } from "./sample";

export interface SettlementDisplayMeta {
  approvalStatus: string;
  approvedBy: string;
  approvedAt: string;
  departmentName: string;
}

export interface SettlementDisplayRow {
  periodCode: string;
  departmentName: string;
  employeeName: string;
  roleInSettlement: string;
  personalContributionYuan: number;
  contributionRateText: string;
  departmentTargetYuan: number;
  departmentConfirmedRevenueYuan: number;
  ownedVehicleRevenueYuan: number;
  externalProfitYuan: number;
  historicalRecoveredYuan: number;
  achievementRateText: string;
  appliedCommissionRateText: string;
  grossCommissionYuan: number;
  currentPayoutYuan: number;
  quarterlyDeferredYuan: number;
  yearEndDeferredYuan: number;
  otherDeferredYuan: number;
  frozenAmountYuan: number;
  adjustmentAmountYuan: number;
  finalCurrentPayableYuan: number;
  futurePayoutYuan: number;
  approvalStatus: string;
  approvedBy: string;
  approvedAt: string;
  remark: string;
}

function centsToYuan(cents: number): number {
  return cents / 100;
}

export function buildSettlementDisplayRows(
  settlement: SettlementSnapshotResult,
  meta: SettlementDisplayMeta
): SettlementDisplayRow[] {
  return settlement.lines.map((line) => ({
    periodCode: settlement.periodCode,
    departmentName: meta.departmentName,
    employeeName: line.employeeName,
    roleInSettlement: line.roleInSettlement,
    personalContributionYuan: centsToYuan(line.confirmedContributionAmountCents),
    contributionRateText: formatBps(line.contributionRateBps),
    departmentTargetYuan: centsToYuan(settlement.targetAmountCents),
    departmentConfirmedRevenueYuan: centsToYuan(settlement.confirmedRevenueAmountCents),
    ownedVehicleRevenueYuan: centsToYuan(settlement.ownedVehicleRevenueAmountCents),
    externalProfitYuan: centsToYuan(settlement.externalProfitAmountCents),
    historicalRecoveredYuan: centsToYuan(
      settlement.historicalReceivableRecoveredAmountCents
    ),
    achievementRateText: formatBps(settlement.achievementRateBps),
    appliedCommissionRateText: formatBps(settlement.appliedCommissionRateBps),
    grossCommissionYuan: centsToYuan(line.grossCommissionCents),
    currentPayoutYuan: centsToYuan(line.currentPayoutCents),
    quarterlyDeferredYuan: centsToYuan(line.quarterlyDeferredCents),
    yearEndDeferredYuan: centsToYuan(line.yearEndDeferredCents),
    otherDeferredYuan: centsToYuan(line.otherDeferredCents),
    frozenAmountYuan: centsToYuan(line.frozenAmountCents),
    adjustmentAmountYuan: centsToYuan(line.adjustmentAmountCents),
    finalCurrentPayableYuan: centsToYuan(line.finalCurrentPayableCents),
    futurePayoutYuan: centsToYuan(line.futurePayoutCents),
    approvalStatus: meta.approvalStatus,
    approvedBy: meta.approvedBy,
    approvedAt: meta.approvedAt,
    remark: line.remark
  }));
}
