import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  acceptanceApprovalMeta,
  acceptanceDepartmentName,
  acceptanceScenarioInput,
  calculateCommissionSettlement,
  expectedAcceptanceSummary
} from "../../commission-engine/src/index";

const ids = {
  department: "acc-dept-leasing-sales",
  boss: "acc-boss",
  hr: "acc-hr",
  finance: "acc-finance",
  asset: "acc-asset",
  salesA: "A",
  salesB: "B",
  salesC: "C",
  vehicleOwnedA: "acc-vehicle-owned-a",
  vehicleOwnedB: "acc-vehicle-owned-b",
  vehicleExternalC: "acc-vehicle-external-c",
  period: "acc-period-2026-04",
  ruleSet: "acc-rule-set-2026-04",
  settlementRun: "acc-settlement-run-2026-04-001"
} as const;

const seedDir = dirname(fileURLToPath(import.meta.url));
const databasePath = join(seedDir, "dev.db");
const date = (value: string) => `${value}T00:00:00.000Z`;
const now = "2026-05-06T09:00:00.000Z";

export function buildAcceptanceSeedPlan() {
  const settlement = calculateCommissionSettlement(acceptanceScenarioInput);

  return {
    ids,
    databasePath,
    summary: expectedAcceptanceSummary,
    department: {
      id: ids.department,
      name: acceptanceDepartmentName
    },
    employees: [
      { id: ids.boss, name: "老板", role: "BOSS" },
      { id: ids.hr, name: "HR", role: "HR" },
      { id: ids.finance, name: "财务", role: "FINANCE" },
      { id: ids.asset, name: "资管", role: "ASSET_MANAGER" },
      { id: ids.salesA, name: "销售 A", role: "SALES" },
      { id: ids.salesB, name: "销售 B", role: "SALES" },
      { id: ids.salesC, name: "销售 C", role: "SALES" }
    ],
    vehicles: [
      {
        id: ids.vehicleOwnedA,
        plateNo: "沪A-H02A",
        vehicleSourceType: "OWNED",
        monthlyTargetAmountCents: 30000000
      },
      {
        id: ids.vehicleOwnedB,
        plateNo: "沪A-H02B",
        vehicleSourceType: "OWNED",
        monthlyTargetAmountCents: 10000000
      },
      {
        id: ids.vehicleExternalC,
        plateNo: "沪A-H02C",
        vehicleSourceType: "EXTERNAL",
        monthlyTargetAmountCents: 0
      }
    ],
    period: {
      id: ids.period,
      periodCode: "2026-04",
      targetAmountCents: settlement.targetAmountCents,
      status: "PENDING_BOSS_APPROVAL"
    },
    targets: {
      departmentTarget: {
        id: "acc-target-department-2026-04",
        targetAmountCents: 51900000,
        sourceType: "MANUAL"
      },
      approvedAdjustmentTarget: {
        id: "acc-target-approved-adjustment",
        targetAmountCents: -1900000,
        sourceType: "ADJUSTED"
      }
    },
    rules: {
      tiers: acceptanceScenarioInput.tiers,
      payoutRules: acceptanceScenarioInput.payoutRules
    },
    orders: {
      approvedOwnedOrders: ["ACC-202604-A-OWNED", "ACC-202604-B-OWNED"],
      externalOrder: "ACC-202604-C-EXTERNAL",
      unpaidOrder: "ACC-202604-A-UNPAID"
    },
    revenueReceipts: {
      approvedOwnedRentTotalCents: settlement.ownedVehicleRevenueAmountCents,
      historicalRecoveredCents: settlement.historicalReceivableRecoveredAmountCents,
      pendingUnpaidReceiptCents: 9990000
    },
    externalProfit: {
      approvedProfitCents: settlement.externalProfitAmountCents,
      pendingProfitCents: 2000000,
      accountingBasis: "PROFIT_RECEIPT_ONLY"
    },
    deposits: {
      heldCents: 5000000,
      disputedCents: 3000000,
      participatesInRevenue: false,
      participatesInCommission: false
    },
    counterexamples: {
      unpaidOrder: {
        orderNo: "ACC-202604-A-UNPAID",
        participatesInCommission: false
      },
      deposit: {
        id: "acc-deposit-disputed-b",
        participatesInRevenue: false,
        participatesInCommission: false
      },
      pendingTargetAdjustment: {
        id: "acc-target-adjustment-pending",
        affectsTarget: false
      },
      approvedTargetAdjustment: {
        id: "acc-target-adjustment-approved",
        affectsTarget: true
      },
      externalOrderBasis: "PROFIT_RECEIPT_ONLY"
    },
    settlementRun: {
      id: ids.settlementRun,
      runNo: "2026-04-RUN-001",
      status: "APPROVED",
      approvedBy: acceptanceApprovalMeta.approvedBy,
      approvedAt: acceptanceApprovalMeta.approvedAt
    }
  } as const;
}

function sqlValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  return `'${value.replace(/'/g, "''")}'`;
}

function insert(db: { run(sql: string): void }, table: string, row: Record<string, string | number | boolean | null | undefined>) {
  const columns = Object.keys(row);
  db.run(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns
      .map((column) => sqlValue(row[column]))
      .join(", ")})`
  );
}

function createSchema(db: { run(sql: string): void }) {
  db.run(`
    CREATE TABLE Department (id TEXT PRIMARY KEY, name TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE Employee (id TEXT PRIMARY KEY, name TEXT NOT NULL, departmentId TEXT NOT NULL, role TEXT NOT NULL, loginName TEXT, passwordHash TEXT, isCommissionable INTEGER NOT NULL, employmentStatus TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE Vehicle (id TEXT PRIMARY KEY, plateNo TEXT NOT NULL, vin TEXT, brand TEXT NOT NULL, model TEXT NOT NULL, vehicleSourceType TEXT NOT NULL, ownerType TEXT NOT NULL, status TEXT NOT NULL, monthlyTargetAmountCents INTEGER NOT NULL, remark TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE CommissionPeriod (id TEXT PRIMARY KEY, periodCode TEXT NOT NULL, departmentId TEXT NOT NULL, startDate TEXT NOT NULL, endDate TEXT NOT NULL, status TEXT NOT NULL, createdBy TEXT NOT NULL, createdAt TEXT NOT NULL, financeLockedAt TEXT, hrCalculatedAt TEXT, bossApprovedAt TEXT, closedAt TEXT, remark TEXT);
    CREATE TABLE CommissionTarget (id TEXT PRIMARY KEY, periodId TEXT NOT NULL, departmentId TEXT NOT NULL, vehicleId TEXT, targetAmountCents INTEGER NOT NULL, sourceType TEXT NOT NULL, isIncluded INTEGER NOT NULL, remark TEXT, createdBy TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE CommissionRuleSet (id TEXT PRIMARY KEY, name TEXT NOT NULL, departmentId TEXT NOT NULL, effectiveFrom TEXT NOT NULL, effectiveTo TEXT, status TEXT NOT NULL, createdBy TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE CommissionTierRule (id TEXT PRIMARY KEY, ruleSetId TEXT NOT NULL, minAchievementRateBps INTEGER NOT NULL, maxAchievementRateBps INTEGER, commissionRateBps INTEGER NOT NULL, sortOrder INTEGER NOT NULL);
    CREATE TABLE CommissionPayoutRule (id TEXT PRIMARY KEY, ruleSetId TEXT NOT NULL, payoutStage TEXT NOT NULL, payoutRatioBps INTEGER NOT NULL, conditionRemark TEXT, sortOrder INTEGER NOT NULL);
    CREATE TABLE LeaseOrderLedger (id TEXT PRIMARY KEY, orderNo TEXT NOT NULL, periodId TEXT NOT NULL, departmentId TEXT NOT NULL, salesUserId TEXT NOT NULL, customerName TEXT NOT NULL, vehicleId TEXT NOT NULL, vehicleSourceType TEXT NOT NULL, billingMode TEXT NOT NULL, rentalStartDate TEXT NOT NULL, rentalEndDate TEXT NOT NULL, receivableRentAmountCents INTEGER NOT NULL, orderStatus TEXT NOT NULL, submittedAt TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE RevenueReceiptLedger (id TEXT PRIMARY KEY, orderId TEXT NOT NULL, periodId TEXT NOT NULL, salesUserId TEXT NOT NULL, receiptAmountCents INTEGER NOT NULL, receiptDate TEXT NOT NULL, companyAccount TEXT NOT NULL, receiptProofUrl TEXT, financeReviewStatus TEXT NOT NULL, isCommissionable INTEGER NOT NULL, revenueKind TEXT NOT NULL, financeReviewedBy TEXT, financeReviewedAt TEXT, remark TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE ExternalProfitReceipt (id TEXT PRIMARY KEY, orderId TEXT NOT NULL, periodId TEXT NOT NULL, salesUserId TEXT NOT NULL, profitAmountCents INTEGER NOT NULL, remitDate TEXT NOT NULL, companyAccount TEXT NOT NULL, receiptProofUrl TEXT, financeReviewStatus TEXT NOT NULL, isCommissionable INTEGER NOT NULL, financeReviewedBy TEXT, financeReviewedAt TEXT, remark TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE DepositLedger (id TEXT PRIMARY KEY, orderId TEXT NOT NULL, periodId TEXT NOT NULL, salesUserId TEXT NOT NULL, depositAmountCents INTEGER NOT NULL, holderUserId TEXT NOT NULL, receivedDate TEXT NOT NULL, refundAmountCents INTEGER NOT NULL, refundDate TEXT, refundStatus TEXT NOT NULL, remark TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE ReceivableSnapshot (id TEXT PRIMARY KEY, periodId TEXT NOT NULL, orderId TEXT NOT NULL, salesUserId TEXT NOT NULL, receivableAmountCents INTEGER NOT NULL, receivedAmountCents INTEGER NOT NULL, outstandingAmountCents INTEGER NOT NULL, overdueDays INTEGER NOT NULL, status TEXT NOT NULL, createdBy TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE VehicleStatusEvent (id TEXT PRIMARY KEY, vehicleId TEXT NOT NULL, periodId TEXT, eventType TEXT NOT NULL, startDate TEXT NOT NULL, endDate TEXT, reason TEXT NOT NULL, createdBy TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE TargetAdjustmentRequest (id TEXT PRIMARY KEY, periodId TEXT NOT NULL, vehicleId TEXT NOT NULL, requestedBy TEXT NOT NULL, reasonType TEXT NOT NULL, originalTargetAmountCents INTEGER NOT NULL, adjustedTargetAmountCents INTEGER NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL, approvedBy TEXT, approvedAt TEXT, approvalRemark TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE CommissionSettlementRun (id TEXT PRIMARY KEY, periodId TEXT NOT NULL, departmentId TEXT NOT NULL, runNo TEXT NOT NULL, status TEXT NOT NULL, targetAmountCents INTEGER NOT NULL, confirmedRevenueAmountCents INTEGER NOT NULL, ownedVehicleRevenueAmountCents INTEGER NOT NULL, externalProfitAmountCents INTEGER NOT NULL, historicalReceivableRecoveredAmountCents INTEGER NOT NULL, achievementRateBps INTEGER NOT NULL, appliedCommissionRateBps INTEGER NOT NULL, departmentCommissionPoolCents INTEGER NOT NULL, calculatedBy TEXT NOT NULL, calculatedAt TEXT NOT NULL, submittedBy TEXT, submittedAt TEXT, approvedBy TEXT, approvedAt TEXT, rejectedBy TEXT, rejectedAt TEXT, rejectionReason TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE CommissionSettlementLine (id TEXT PRIMARY KEY, settlementRunId TEXT NOT NULL, userId TEXT NOT NULL, roleInSettlement TEXT NOT NULL, confirmedContributionAmountCents INTEGER NOT NULL, contributionRateBps INTEGER NOT NULL, grossCommissionCents INTEGER NOT NULL, currentPayoutCents INTEGER NOT NULL, quarterlyDeferredCents INTEGER NOT NULL, yearEndDeferredCents INTEGER NOT NULL, otherDeferredCents INTEGER NOT NULL, futurePayoutCents INTEGER NOT NULL, frozenAmountCents INTEGER NOT NULL, adjustmentAmountCents INTEGER NOT NULL, finalCurrentPayableCents INTEGER NOT NULL, remark TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE CommissionApprovalLog (id TEXT PRIMARY KEY, targetType TEXT NOT NULL, targetId TEXT NOT NULL, action TEXT NOT NULL, operatorId TEXT NOT NULL, operatorRole TEXT NOT NULL, comment TEXT, createdAt TEXT NOT NULL);
    CREATE TABLE CommissionExportRecord (id TEXT PRIMARY KEY, settlementRunId TEXT NOT NULL, exportType TEXT NOT NULL, fileName TEXT NOT NULL, fileUrl TEXT NOT NULL, exportedBy TEXT NOT NULL, exportedAt TEXT NOT NULL);
    CREATE TABLE ImportBatch (id TEXT PRIMARY KEY, importType TEXT NOT NULL, fileName TEXT NOT NULL, fileHash TEXT NOT NULL, status TEXT NOT NULL, dryRun INTEGER NOT NULL, totalRows INTEGER NOT NULL, validRows INTEGER NOT NULL, errorRows INTEGER NOT NULL, createdBy TEXT NOT NULL, createdAt TEXT NOT NULL, committedBy TEXT, committedAt TEXT, remark TEXT);
    CREATE TABLE ImportBatchRow (id TEXT PRIMARY KEY, batchId TEXT NOT NULL, rowNumber INTEGER NOT NULL, rawJson TEXT NOT NULL, normalizedJson TEXT, status TEXT NOT NULL, errorCode TEXT, errorMessage TEXT, createdAt TEXT NOT NULL);
  `);
}

export async function seedAcceptance() {
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const plan = buildAcceptanceSeedPlan();
  const settlement = calculateCommissionSettlement(acceptanceScenarioInput);

  createSchema(db);

  insert(db, "Department", { ...plan.department, createdAt: now, updatedAt: now });
  for (const employee of plan.employees) {
    insert(db, "Employee", {
      id: employee.id,
      name: employee.name,
      departmentId: plan.ids.department,
      role: employee.role,
      loginName: employee.id,
      passwordHash: null,
      isCommissionable: employee.role === "SALES",
      employmentStatus: "ACTIVE",
      createdAt: now,
      updatedAt: now
    });
  }
  for (const vehicle of [
    [plan.ids.vehicleOwnedA, "沪A-H02A", "LCSH02OWNEDA", "自有车A", "OWNED", 30000000],
    [plan.ids.vehicleOwnedB, "沪A-H02B", "LCSH02OWNEDB", "自有车B", "OWNED", 10000000],
    [plan.ids.vehicleExternalC, "沪A-H02C", "LCSH02EXTERNALC", "外调车C", "EXTERNAL", 0]
  ] as const) {
    insert(db, "Vehicle", {
      id: vehicle[0],
      plateNo: vehicle[1],
      vin: vehicle[2],
      brand: "验收",
      model: vehicle[3],
      vehicleSourceType: vehicle[4],
      ownerType: vehicle[4] === "OWNED" ? "COMPANY" : "THIRD_PARTY",
      status: "ACTIVE",
      monthlyTargetAmountCents: vehicle[5],
      remark: null,
      createdAt: now,
      updatedAt: now
    });
  }
  insert(db, "CommissionPeriod", {
    id: plan.ids.period,
    periodCode: "2026-04",
    departmentId: plan.ids.department,
    startDate: date("2026-04-01"),
    endDate: date("2026-04-30"),
    status: "PENDING_BOSS_APPROVAL",
    createdBy: plan.ids.boss,
    createdAt: now,
    financeLockedAt: date("2026-05-02"),
    hrCalculatedAt: date("2026-05-04"),
    bossApprovedAt: null,
    closedAt: null,
    remark: "H02 acceptance seed"
  });
  insert(db, "CommissionTarget", {
    id: "acc-target-department-2026-04",
    periodId: plan.ids.period,
    departmentId: plan.ids.department,
    vehicleId: null,
    targetAmountCents: 51900000,
    sourceType: "MANUAL",
    isIncluded: true,
    remark: null,
    createdBy: plan.ids.boss,
    createdAt: now
  });
  insert(db, "CommissionTarget", {
    id: "acc-target-approved-adjustment",
    periodId: plan.ids.period,
    departmentId: plan.ids.department,
    vehicleId: plan.ids.vehicleOwnedB,
    targetAmountCents: -1900000,
    sourceType: "ADJUSTED",
    isIncluded: true,
    remark: null,
    createdBy: plan.ids.boss,
    createdAt: now
  });
  insert(db, "CommissionRuleSet", {
    id: plan.ids.ruleSet,
    name: "H02 acceptance tier and payout rules",
    departmentId: plan.ids.department,
    effectiveFrom: date("2026-04-01"),
    effectiveTo: null,
    status: "ACTIVE",
    createdBy: plan.ids.boss,
    createdAt: now
  });
  for (const tier of acceptanceScenarioInput.tiers) {
    insert(db, "CommissionTierRule", {
      id: `acc-${tier.id}`,
      ruleSetId: plan.ids.ruleSet,
      minAchievementRateBps: tier.minAchievementRateBps,
      maxAchievementRateBps: tier.maxAchievementRateBps,
      commissionRateBps: tier.commissionRateBps,
      sortOrder: tier.sortOrder
    });
  }
  for (const rule of acceptanceScenarioInput.payoutRules) {
    insert(db, "CommissionPayoutRule", {
      id: `acc-payout-${rule.payoutStage.toLowerCase()}`,
      ruleSetId: plan.ids.ruleSet,
      payoutStage: rule.payoutStage,
      payoutRatioBps: rule.payoutRatioBps,
      conditionRemark: "H02 acceptance payout split",
      sortOrder: rule.sortOrder
    });
  }

  const orders = [
    ["ACC-202604-A-OWNED", plan.ids.salesA, plan.ids.vehicleOwnedA, "OWNED", 30000000, "COMPLETED"],
    ["ACC-202604-B-OWNED", plan.ids.salesB, plan.ids.vehicleOwnedB, "OWNED", 10000000, "COMPLETED"],
    ["ACC-202604-C-EXTERNAL", plan.ids.salesC, plan.ids.vehicleExternalC, "EXTERNAL", 0, "COMPLETED"],
    ["ACC-202604-A-UNPAID", plan.ids.salesA, plan.ids.vehicleOwnedA, "OWNED", 9990000, "ACTIVE"]
  ] as const;
  for (const [orderNo, salesUserId, vehicleId, vehicleSourceType, amount, status] of orders) {
    insert(db, "LeaseOrderLedger", {
      id: `acc-order-${orderNo.toLowerCase()}`,
      orderNo,
      periodId: plan.ids.period,
      departmentId: plan.ids.department,
      salesUserId,
      customerName: `验收客户-${orderNo}`,
      vehicleId,
      vehicleSourceType,
      billingMode: "MONTHLY",
      rentalStartDate: date("2026-04-01"),
      rentalEndDate: date("2026-04-30"),
      receivableRentAmountCents: amount,
      orderStatus: status,
      submittedAt: date("2026-04-01"),
      createdAt: now,
      updatedAt: now
    });
  }

  for (const receipt of [
    ["acc-revenue-owned-a", "acc-order-acc-202604-a-owned", plan.ids.salesA, 30000000, "OWNED_RENT", "APPROVED"],
    ["acc-revenue-owned-b", "acc-order-acc-202604-b-owned", plan.ids.salesB, 10000000, "OWNED_RENT", "APPROVED"],
    ["acc-revenue-history-b", "acc-order-acc-202604-b-owned", plan.ids.salesB, 3900000, "HISTORICAL_RECEIVABLE", "APPROVED"],
    ["acc-revenue-unpaid-a", "acc-order-acc-202604-a-unpaid", plan.ids.salesA, 9990000, "OWNED_RENT", "PENDING"]
  ] as const) {
    insert(db, "RevenueReceiptLedger", {
      id: receipt[0],
      orderId: receipt[1],
      periodId: plan.ids.period,
      salesUserId: receipt[2],
      receiptAmountCents: receipt[3],
      receiptDate: date("2026-04-20"),
      companyAccount: "公司验收账户",
      receiptProofUrl: null,
      financeReviewStatus: receipt[5],
      isCommissionable: true,
      revenueKind: receipt[4],
      financeReviewedBy: receipt[5] === "APPROVED" ? plan.ids.finance : null,
      financeReviewedAt: receipt[5] === "APPROVED" ? date("2026-05-02") : null,
      remark: null,
      createdAt: now,
      updatedAt: now
    });
  }

  for (const receipt of [
    ["acc-external-profit-c", 8000000, "APPROVED"],
    ["acc-external-profit-pending-c", 2000000, "PENDING"]
  ] as const) {
    insert(db, "ExternalProfitReceipt", {
      id: receipt[0],
      orderId: "acc-order-acc-202604-c-external",
      periodId: plan.ids.period,
      salesUserId: plan.ids.salesC,
      profitAmountCents: receipt[1],
      remitDate: date("2026-04-22"),
      companyAccount: "公司验收账户",
      receiptProofUrl: null,
      financeReviewStatus: receipt[2],
      isCommissionable: true,
      financeReviewedBy: receipt[2] === "APPROVED" ? plan.ids.finance : null,
      financeReviewedAt: receipt[2] === "APPROVED" ? date("2026-05-02") : null,
      remark: "Only remitted profit is recorded for external order",
      createdAt: now,
      updatedAt: now
    });
  }

  for (const deposit of [
    ["acc-deposit-held-a", "acc-order-acc-202604-a-owned", plan.ids.salesA, 5000000, "HELD"],
    ["acc-deposit-disputed-b", "acc-order-acc-202604-b-owned", plan.ids.salesB, 3000000, "DISPUTED"]
  ] as const) {
    insert(db, "DepositLedger", {
      id: deposit[0],
      orderId: deposit[1],
      periodId: plan.ids.period,
      salesUserId: deposit[2],
      depositAmountCents: deposit[3],
      holderUserId: deposit[2],
      receivedDate: date("2026-04-01"),
      refundAmountCents: 0,
      refundDate: null,
      refundStatus: deposit[4],
      remark: "Deposit is not commissionable",
      createdAt: now,
      updatedAt: now
    });
  }

  insert(db, "ReceivableSnapshot", {
    id: "acc-receivable-unpaid-a",
    periodId: plan.ids.period,
    orderId: "acc-order-acc-202604-a-unpaid",
    salesUserId: plan.ids.salesA,
    receivableAmountCents: 9990000,
    receivedAmountCents: 0,
    outstandingAmountCents: 9990000,
    overdueDays: 10,
    status: "OPEN",
    createdBy: plan.ids.finance,
    createdAt: now
  });
  insert(db, "ReceivableSnapshot", {
    id: "acc-receivable-history-b-cleared",
    periodId: plan.ids.period,
    orderId: "acc-order-acc-202604-b-owned",
    salesUserId: plan.ids.salesB,
    receivableAmountCents: 3900000,
    receivedAmountCents: 3900000,
    outstandingAmountCents: 0,
    overdueDays: 0,
    status: "CLEARED",
    createdBy: plan.ids.finance,
    createdAt: now
  });
  insert(db, "VehicleStatusEvent", {
    id: "acc-vehicle-event-repair-b",
    vehicleId: plan.ids.vehicleOwnedB,
    periodId: plan.ids.period,
    eventType: "REPAIR",
    startDate: date("2026-04-10"),
    endDate: date("2026-04-12"),
    reason: "H02 acceptance repair event",
    createdBy: plan.ids.asset,
    createdAt: now
  });
  for (const adjustment of [
    ["acc-target-adjustment-pending", plan.ids.vehicleOwnedA, "PENDING", null, null],
    ["acc-target-adjustment-approved", plan.ids.vehicleOwnedB, "APPROVED", plan.ids.boss, date("2026-05-03")]
  ] as const) {
    insert(db, "TargetAdjustmentRequest", {
      id: adjustment[0],
      periodId: plan.ids.period,
      vehicleId: adjustment[1],
      requestedBy: plan.ids.asset,
      reasonType: "REPAIR",
      originalTargetAmountCents: 51900000,
      adjustedTargetAmountCents: 50000000,
      reason: "H02 acceptance target adjustment",
      status: adjustment[2],
      approvedBy: adjustment[3],
      approvedAt: adjustment[4],
      approvalRemark: adjustment[2] === "APPROVED" ? "Approved for acceptance counterexample" : null,
      createdAt: now,
      updatedAt: now
    });
  }

  insert(db, "CommissionSettlementRun", {
    id: plan.ids.settlementRun,
    periodId: plan.ids.period,
    departmentId: plan.ids.department,
    runNo: plan.settlementRun.runNo,
    status: "APPROVED",
    targetAmountCents: settlement.targetAmountCents,
    confirmedRevenueAmountCents: settlement.confirmedRevenueAmountCents,
    ownedVehicleRevenueAmountCents: settlement.ownedVehicleRevenueAmountCents,
    externalProfitAmountCents: settlement.externalProfitAmountCents,
    historicalReceivableRecoveredAmountCents: settlement.historicalReceivableRecoveredAmountCents,
    achievementRateBps: settlement.achievementRateBps,
    appliedCommissionRateBps: settlement.appliedCommissionRateBps,
    departmentCommissionPoolCents: settlement.departmentCommissionPoolCents,
    calculatedBy: plan.ids.hr,
    calculatedAt: date("2026-05-04"),
    submittedBy: plan.ids.hr,
    submittedAt: date("2026-05-05"),
    approvedBy: plan.ids.boss,
    approvedAt: acceptanceApprovalMeta.approvedAt,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now
  });
  for (const line of settlement.lines) {
    insert(db, "CommissionSettlementLine", {
      id: `acc-settlement-line-${line.userId.toLowerCase()}`,
      settlementRunId: plan.ids.settlementRun,
      userId: line.userId,
      roleInSettlement: line.roleInSettlement,
      confirmedContributionAmountCents: line.confirmedContributionAmountCents,
      contributionRateBps: line.contributionRateBps,
      grossCommissionCents: line.grossCommissionCents,
      currentPayoutCents: line.currentPayoutCents,
      quarterlyDeferredCents: line.quarterlyDeferredCents,
      yearEndDeferredCents: line.yearEndDeferredCents,
      otherDeferredCents: line.otherDeferredCents,
      futurePayoutCents: line.futurePayoutCents,
      frozenAmountCents: line.frozenAmountCents,
      adjustmentAmountCents: line.adjustmentAmountCents,
      finalCurrentPayableCents: line.finalCurrentPayableCents,
      remark: line.remark,
      createdAt: now,
      updatedAt: now
    });
  }
  for (const log of [
    ["acc-approval-submit-settlement", "SUBMIT", plan.ids.hr, "HR"],
    ["acc-approval-approve-settlement", "APPROVE", plan.ids.boss, "BOSS"]
  ] as const) {
    insert(db, "CommissionApprovalLog", {
      id: log[0],
      targetType: "SETTLEMENT_RUN",
      targetId: plan.ids.settlementRun,
      action: log[1],
      operatorId: log[2],
      operatorRole: log[3],
      comment: "H02 acceptance settlement workflow",
      createdAt: now
    });
  }

  mkdirSync(seedDir, { recursive: true });
  writeFileSync(databasePath, Buffer.from(db.export()));
  db.close();
  return plan;
}

if (process.argv[1]?.includes("seed.acceptance")) {
  seedAcceptance()
    .then((plan) => {
      console.log(
        `Acceptance seed generated at ${plan.databasePath} for ${plan.period.periodCode}: ${plan.summary.confirmedRevenueAmountCents} cents`
      );
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
