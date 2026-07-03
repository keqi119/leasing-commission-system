export type FinanceReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export type TargetAdjustmentStatus = "PENDING" | "APPROVED" | "REJECTED";

export type DepositRefundStatus =
  | "HELD"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "DISPUTED";

export type SettlementStatus =
  | "DRAFT"
  | "CALCULATED"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "EXPORTED"
  | "CLOSED";

export type PayoutStage = "CURRENT" | "QUARTERLY" | "YEAR_END" | "OTHER";

export type RevenueKind = "OWNED_RENT" | "HISTORICAL_RECEIVABLE";

export interface CommissionTierRuleInput {
  id: string;
  minAchievementRateBps: number;
  maxAchievementRateBps: number | null;
  commissionRateBps: number;
  sortOrder: number;
}

export interface PayoutRuleInput {
  payoutStage: PayoutStage;
  payoutRatioBps: number;
  sortOrder: number;
}

export interface RevenueReceiptInput {
  id: string;
  salesUserId: string;
  receiptAmountCents: number;
  financeReviewStatus: FinanceReviewStatus;
  isCommissionable: boolean;
  revenueKind: RevenueKind;
}

export interface ExternalProfitReceiptInput {
  id: string;
  salesUserId: string;
  profitAmountCents: number;
  financeReviewStatus: FinanceReviewStatus;
  isCommissionable: boolean;
}

export interface DepositInput {
  id: string;
  salesUserId: string;
  depositAmountCents: number;
  refundStatus: DepositRefundStatus;
}

export interface TargetAdjustmentInput {
  id: string;
  status: TargetAdjustmentStatus;
  originalTargetAmountCents: number;
  adjustedTargetAmountCents: number;
}

export interface SettlementEmployeeInput {
  userId: string;
  name: string;
  roleInSettlement: string;
}

export interface CommissionSettlementInput {
  periodCode: string;
  departmentId: string;
  targetAmountCents: number;
  revenueReceipts: RevenueReceiptInput[];
  externalProfitReceipts: ExternalProfitReceiptInput[];
  deposits: DepositInput[];
  targetAdjustments: TargetAdjustmentInput[];
  tiers: CommissionTierRuleInput[];
  payoutRules: PayoutRuleInput[];
  employees: SettlementEmployeeInput[];
  frozenAmountByUserId?: Record<string, number>;
  adjustmentAmountByUserId?: Record<string, number>;
}

export interface PayoutBreakdown {
  currentPayoutCents: number;
  quarterlyDeferredCents: number;
  yearEndDeferredCents: number;
  otherDeferredCents: number;
  futurePayoutCents: number;
  frozenAmountCents: number;
  adjustmentAmountCents: number;
  finalCurrentPayableCents: number;
}

export interface ContributionRate {
  userId: string;
  contributionAmountCents: number;
  confirmedContributionAmountCents: number;
  contributionRateBps: number;
}

export interface SettlementLineResult extends ContributionRate, PayoutBreakdown {
  employeeName: string;
  roleInSettlement: string;
  grossCommissionCents: number;
  remark: string;
}

export interface SettlementSnapshotResult {
  periodCode: string;
  departmentId: string;
  targetAmountCents: number;
  confirmedRevenueAmountCents: number;
  ownedVehicleRevenueAmountCents: number;
  externalProfitAmountCents: number;
  historicalReceivableRecoveredAmountCents: number;
  achievementRateBps: number;
  appliedCommissionRateBps: number;
  departmentCommissionPoolCents: number;
  depositRiskCount: number;
  lines: SettlementLineResult[];
}
