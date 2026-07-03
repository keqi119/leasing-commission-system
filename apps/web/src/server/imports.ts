import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import {
  acceptanceDepartmentName,
  acceptanceScenarioInput,
  calculateAchievementRate,
  calculateCommissionSettlement,
  matchCommissionTier,
  type CommissionSettlementInput,
  type FinanceReviewStatus,
  type RevenueKind,
  type SettlementSnapshotResult
} from "@lcs/commission-engine";

export const importTypes = [
  "employees",
  "vehicles",
  "targets",
  "orders",
  "revenue",
  "external-profit",
  "deposits",
  "vehicle-events"
] as const;

export type ImportType = (typeof importTypes)[number];
export type ImportBatchStatus =
  | "UPLOADED"
  | "PREVIEWED"
  | "VALIDATION_FAILED"
  | "COMMITTED"
  | "FAILED"
  | "CANCELLED";
export type ImportRowStatus = "VALID" | "ERROR";

type JsonPrimitive = string | number | boolean | null;
export type ImportJson = Record<string, JsonPrimitive>;
export type RawImportRow = Record<string, unknown>;

export interface ImportTemplateDefinition {
  importType: ImportType;
  label: string;
  worksheetName: string;
  columns: string[];
  description: string;
  enumOptions?: Record<string, string[]>;
}

export interface ImportValidationError {
  code: string;
  message: string;
  field?: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  rawJson: RawImportRow;
  normalizedJson: ImportJson | null;
  status: ImportRowStatus;
  errors: ImportValidationError[];
}

export interface ImportPreviewResult {
  batchId: string;
  importType: ImportType;
  fileName: string;
  fileHash: string;
  status: ImportBatchStatus;
  dryRun: true;
  totalRows: number;
  validRows: number;
  errorRows: number;
  rows: ImportPreviewRow[];
  fieldMapping: Record<string, string>;
  riskWarnings: string[];
}

export interface ImportCommitResult {
  batchId: string;
  importType: ImportType;
  status: "COMMITTED";
  writtenRows: number;
  failedRows: number;
  affectedPeriods: string[];
  affectedDataTypes: ImportType[];
  committedBy: string;
  committedAt: string;
  ledger: ImportContext;
}

interface PeriodRef {
  periodCode: string;
  departmentName: string;
  departmentId: string;
  status: "OPEN" | "FINANCE_LOCKED" | "BOSS_APPROVED" | "CLOSED";
  targetAmountCents: number;
  financeLockedAt: string | null;
}

interface EmployeeRef {
  userId: string;
  name: string;
  roleInSettlement: string;
}

interface VehicleRef {
  vehicleId: string;
  plateNo: string;
  vehicleSourceType: "OWNED" | "EXTERNAL";
}

interface ImportedOrder {
  id: string;
  periodCode: string;
  departmentName: string;
  orderNo: string;
  salesUserId: string;
  salesName: string;
  customerName: string;
  plateNo: string;
  vehicleId: string;
  vehicleSourceType: "OWNED" | "EXTERNAL";
  billingMode: string;
  rentalStartDate: string;
  rentalEndDate: string;
  receivableRentAmountCents: number;
  orderStatus: string;
  remark: string;
  dataSource: "SEED" | "IMPORT" | "MANUAL";
}

interface ImportedRevenueReceipt {
  id: string;
  periodCode: string;
  orderNo: string;
  salesUserId: string;
  receiptAmountCents: number;
  receiptDate: string;
  companyAccount: string;
  financeReviewStatus: FinanceReviewStatus;
  revenueKind: RevenueKind;
  isCommissionable: boolean;
  remark: string;
  dataSource: "SEED" | "IMPORT" | "MANUAL";
}

interface ImportedExternalProfitReceipt {
  id: string;
  periodCode: string;
  orderNo: string;
  salesUserId: string;
  profitAmountCents: number;
  remitDate: string;
  companyAccount: string;
  receiptProofUrl: string;
  financeReviewStatus: FinanceReviewStatus;
  isCommissionable: boolean;
  remark: string;
  dataSource: "SEED" | "IMPORT" | "MANUAL";
}

interface ImportedDeposit {
  id: string;
  periodCode: string;
  orderNo: string;
  salesUserId: string;
  depositAmountCents: number;
  holderUserId: string;
  receivedDate: string;
  refundAmountCents: number;
  refundStatus: "HELD" | "PARTIALLY_REFUNDED" | "REFUNDED" | "DISPUTED";
  remark: string;
  dataSource: "SEED" | "IMPORT" | "MANUAL";
}

export interface ImportContext {
  periods: PeriodRef[];
  employees: EmployeeRef[];
  vehicles: VehicleRef[];
  orders: ImportedOrder[];
  revenueReceipts: ImportedRevenueReceipt[];
  externalProfitReceipts: ImportedExternalProfitReceipt[];
  deposits: ImportedDeposit[];
  batches: ImportPreviewResult[];
}

export interface TrialRunCheckReport {
  periodCode: string;
  departmentName: string;
  departmentTargetCents: number;
  orderReceivableCents: number;
  approvedRentRevenueCents: number;
  approvedExternalProfitCents: number;
  historicalRecoveredCents: number;
  depositTotalCents: number;
  abnormalDepositCount: number;
  unpaidOrderCount: number;
  pendingRevenueCount: number;
  commissionableRevenueCents: number;
  achievementRateBps: number;
  estimatedCommissionPoolCents: number;
  canStartHrCalculation: boolean;
  blockingReasons: string[];
  warnings: string[];
}

interface TemplateEnumOption {
  label: string;
  value: string;
  aliases?: string[];
}

type TemplateEnumOptions = Partial<Record<ImportType, Record<string, TemplateEnumOption[]>>>;

const yesNoOptions: TemplateEnumOption[] = [
  { label: "是", value: "true", aliases: ["YES", "TRUE", "1", "Y"] },
  { label: "否", value: "false", aliases: ["NO", "FALSE", "0", "N"] }
];

const vehicleSourceOptions: TemplateEnumOption[] = [
  { label: "自有", value: "OWNED", aliases: ["OWNED"] },
  { label: "外调", value: "EXTERNAL", aliases: ["EXTERNAL"] }
];

const templateEnumOptions: TemplateEnumOptions = {
  employees: {
    岗位角色: [
      { label: "老板", value: "BOSS", aliases: ["BOSS"] },
      { label: "销售", value: "SALES", aliases: ["SALES"] },
      { label: "销售经理", value: "SALES_MANAGER", aliases: ["SALES_MANAGER"] },
      { label: "财务", value: "FINANCE", aliases: ["FINANCE"] },
      { label: "资管", value: "ASSET_MANAGER", aliases: ["ASSET_MANAGER"] },
      { label: "HR", value: "HR" },
      { label: "管理员", value: "ADMIN", aliases: ["ADMIN"] }
    ],
    是否参与提成: yesNoOptions,
    在职状态: [
      { label: "在职", value: "ACTIVE", aliases: ["ACTIVE"] },
      { label: "停职", value: "SUSPENDED", aliases: ["SUSPENDED"] },
      { label: "离职", value: "LEFT", aliases: ["LEFT"] }
    ]
  },
  vehicles: {
    车辆来源: vehicleSourceOptions,
    权属类型: [
      { label: "公司", value: "COMPANY", aliases: ["COMPANY"] },
      { label: "第三方", value: "THIRD_PARTY", aliases: ["THIRD_PARTY"] },
      { label: "个人", value: "PERSONAL", aliases: ["PERSONAL"] }
    ],
    车辆状态: [
      { label: "正常", value: "ACTIVE", aliases: ["ACTIVE", "可运营"] },
      { label: "维修", value: "REPAIR", aliases: ["REPAIR"] },
      { label: "停运", value: "STOPPED", aliases: ["STOPPED"] },
      { label: "下线", value: "OFFLINE", aliases: ["OFFLINE"] }
    ]
  },
  targets: {
    指标来源: [
      { label: "手工录入", value: "MANUAL", aliases: ["MANUAL"] },
      { label: "邮件确认", value: "EMAIL_CONFIRMATION", aliases: ["EMAIL_CONFIRMATION"] },
      { label: "已审批调整", value: "ADJUSTED", aliases: ["ADJUSTED"] }
    ],
    是否纳入: yesNoOptions
  },
  orders: {
    车辆来源: vehicleSourceOptions,
    计费方式: [
      { label: "月租", value: "MONTHLY", aliases: ["MONTHLY"] },
      { label: "日租", value: "DAILY", aliases: ["DAILY"] },
      { label: "固定周期", value: "FIXED_TERM", aliases: ["FIXED_TERM", "固定期"] }
    ],
    订单状态: [
      { label: "草稿", value: "DRAFT", aliases: ["DRAFT"] },
      { label: "已提交", value: "SUBMITTED", aliases: ["SUBMITTED"] },
      { label: "进行中", value: "ACTIVE", aliases: ["ACTIVE"] },
      { label: "已完成", value: "COMPLETED", aliases: ["COMPLETED"] },
      { label: "已取消", value: "CANCELLED", aliases: ["CANCELLED"] }
    ]
  },
  revenue: {
    财务审核状态: [
      { label: "待审核", value: "PENDING", aliases: ["PENDING"] },
      { label: "已审核", value: "APPROVED", aliases: ["APPROVED"] },
      { label: "已驳回", value: "REJECTED", aliases: ["REJECTED"] }
    ],
    收入口径: [
      { label: "本期租金", value: "OWNED_RENT", aliases: ["OWNED_RENT"] },
      { label: "历史欠款本月回收", value: "HISTORICAL_RECEIVABLE", aliases: ["HISTORICAL_RECEIVABLE"] }
    ],
    是否参与提成: yesNoOptions
  },
  "external-profit": {
    是否参与提成: yesNoOptions
  },
  deposits: {
    退还状态: [
      { label: "暂存", value: "HELD", aliases: ["HELD"] },
      { label: "部分退还", value: "PARTIALLY_REFUNDED", aliases: ["PARTIALLY_REFUNDED"] },
      { label: "已退还", value: "REFUNDED", aliases: ["REFUNDED"] },
      { label: "争议", value: "DISPUTED", aliases: ["DISPUTED"] }
    ]
  },
  "vehicle-events": {
    状态类型: [
      { label: "维修", value: "REPAIR", aliases: ["REPAIR"] },
      { label: "停运", value: "STOPPED", aliases: ["STOPPED"] },
      { label: "下线", value: "OFFLINE", aliases: ["OFFLINE"] },
      { label: "上线", value: "ONLINE", aliases: ["ONLINE"] },
      { label: "其他", value: "OTHER", aliases: ["OTHER"] }
    ]
  }
};

const templates: ImportTemplateDefinition[] = [
  {
    importType: "employees",
    label: "员工档案导入模板",
    worksheetName: "员工档案",
    columns: ["部门", "员工姓名", "岗位角色", "是否参与提成", "在职状态", "备注"],
    description: "用于初始化销售、财务、资管、HR 等员工档案。"
  },
  {
    importType: "vehicles",
    label: "车辆档案导入模板",
    worksheetName: "车辆档案",
    columns: ["车牌号", "车架号", "品牌", "车型", "车辆来源", "权属类型", "车辆状态", "月度目标", "备注"],
    description: "用于维护自有车和外调车辆基础资料。"
  },
  {
    importType: "targets",
    label: "收入指标导入模板",
    worksheetName: "收入指标",
    columns: ["考核周期", "部门", "车牌号", "收入指标", "指标来源", "是否纳入", "备注"],
    description: "用于导入老板确认的周期目标或已审批调整目标。"
  },
  {
    importType: "orders",
    label: "订单台账导入模板",
    worksheetName: "订单台账",
    columns: ["考核周期", "部门", "订单号", "销售姓名", "客户名称", "车牌号", "车辆来源", "计费方式", "租赁开始日期", "租赁结束日期", "应收租金", "订单状态", "备注"],
    description: "用于销售批量导入订单归属和应收信息。"
  },
  {
    importType: "revenue",
    label: "租金收入导入模板",
    worksheetName: "租金收入",
    columns: ["考核周期", "订单号", "销售姓名", "收款金额", "收款日期", "公司账户", "凭证链接", "财务审核状态", "收入口径", "是否参与提成", "备注"],
    description: "仅记录进入公司账户的租金收入和历史欠款本月回收。"
  },
  {
    importType: "external-profit",
    label: "外调利润回款导入模板",
    worksheetName: "外调利润回款",
    columns: ["考核周期", "订单号", "销售姓名", "外调利润金额", "打回公司日期", "公司账户", "凭证链接", "是否参与提成", "备注"],
    description: "只导入销售打回公司的外调利润，不做外调收入成本核算。"
  },
  {
    importType: "deposits",
    label: "押金台账导入模板",
    worksheetName: "押金台账",
    columns: ["考核周期", "订单号", "销售姓名", "押金金额", "暂管人", "收取日期", "退还金额", "退还日期", "退还状态", "备注"],
    description: "押金只做登记和风险提示，不进入收入和提成。"
  },
  {
    importType: "vehicle-events",
    label: "车辆状态流水导入模板",
    worksheetName: "车辆状态流水",
    columns: ["考核周期", "车牌号", "状态类型", "开始日期", "结束日期", "原因", "备注"],
    description: "车辆状态流水只记录事实，不自动调整收入指标。"
  }
];

export const localImportBatches: ImportPreviewResult[] = [];
export const localImportContext = createDefaultImportContext();

export function getImportTemplates(): ImportTemplateDefinition[] {
  return templates.map((template) => ({
    ...template,
    columns: [...template.columns],
    enumOptions: getTemplateEnumLabels(template.importType)
  }));
}

export function buildTemplateCsv(importType: ImportType): string {
  const template = getTemplate(importType);
  return `${template.columns.map(escapeCsvCell).join(",")}\n`;
}

export async function buildTemplateWorkbook(importType: ImportType): Promise<Buffer> {
  const template = getTemplate(importType);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(template.worksheetName);
  worksheet.addRow(template.columns);
  worksheet.getRow(1).font = { bold: true };
  worksheet.columns.forEach((column) => {
    column.width = 18;
  });
  applyTemplateDropdowns(worksheet, template);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function getTemplateEnumLabels(importType: ImportType): Record<string, string[]> {
  const enumFields = templateEnumOptions[importType] ?? {};
  return Object.fromEntries(
    Object.entries(enumFields).map(([field, options]) => [field, options.map((option) => option.label)])
  );
}

function applyTemplateDropdowns(worksheet: ExcelJS.Worksheet, template: ImportTemplateDefinition) {
  const enumFields = templateEnumOptions[template.importType] ?? {};
  const headerColumns = new Map(template.columns.map((column, index) => [column, index + 1]));

  for (const [field, options] of Object.entries(enumFields)) {
    const columnIndex = headerColumns.get(field);
    if (!columnIndex) {
      continue;
    }

    const formula = `"${options.map((option) => option.label).join(",")}"`;
    for (let rowNumber = 2; rowNumber <= 1000; rowNumber += 1) {
      worksheet.getCell(rowNumber, columnIndex).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [formula],
        showErrorMessage: true,
        errorTitle: "填写范围错误",
        error: `${field}只能选择：${options.map((option) => option.label).join("、")}`
      };
    }
  }
}

export function createDefaultImportContext(options: { emptyLedgers?: boolean } = {}): ImportContext {
  const periods: PeriodRef[] = [
    {
      periodCode: "2026-04",
      departmentName: acceptanceDepartmentName,
      departmentId: acceptanceScenarioInput.departmentId,
      status: "OPEN",
      targetAmountCents: 51900000,
      financeLockedAt: null
    },
    {
      periodCode: "2026-03",
      departmentName: acceptanceDepartmentName,
      departmentId: acceptanceScenarioInput.departmentId,
      status: "CLOSED",
      targetAmountCents: 51900000,
      financeLockedAt: "2026-04-02T00:00:00.000Z"
    },
    {
      periodCode: "2026-05",
      departmentName: acceptanceDepartmentName,
      departmentId: acceptanceScenarioInput.departmentId,
      status: "FINANCE_LOCKED",
      targetAmountCents: 45000000,
      financeLockedAt: "2026-06-02T00:00:00.000Z"
    }
  ];
  const employees: EmployeeRef[] = [
    { userId: "A", name: "销售 A", roleInSettlement: "SALES" },
    { userId: "B", name: "销售 B", roleInSettlement: "SALES" },
    { userId: "C", name: "销售 C", roleInSettlement: "SALES" },
    { userId: "hr-1", name: "HR", roleInSettlement: "HR" },
    { userId: "finance-1", name: "财务", roleInSettlement: "FINANCE" }
  ];
  const vehicles: VehicleRef[] = [
    { vehicleId: "vehicle-h03-a", plateNo: "沪A-H03A", vehicleSourceType: "OWNED" },
    { vehicleId: "vehicle-h03-b", plateNo: "沪A-H03B", vehicleSourceType: "OWNED" },
    { vehicleId: "vehicle-h03-c", plateNo: "沪A-H03C", vehicleSourceType: "EXTERNAL" }
  ];

  if (options.emptyLedgers) {
    return { periods, employees, vehicles, orders: [], revenueReceipts: [], externalProfitReceipts: [], deposits: [], batches: [] };
  }

  const orders: ImportedOrder[] = [
    seedOrder("ACC-202604-A-OWNED", "A", "销售 A", "沪A-H03A", "OWNED", 30000000, "COMPLETED"),
    seedOrder("ACC-202604-B-OWNED", "B", "销售 B", "沪A-H03B", "OWNED", 10000000, "COMPLETED"),
    seedOrder("ACC-202604-C-EXTERNAL", "C", "销售 C", "沪A-H03C", "EXTERNAL", 0, "COMPLETED"),
    seedOrder("ACC-202604-A-UNPAID", "A", "销售 A", "沪A-H03A", "OWNED", 9990000, "ACTIVE"),
    { ...seedOrder("MAY-ORDER-A", "A", "销售 A", "沪A-H03A", "OWNED", 100000, "ACTIVE"), periodCode: "2026-05" }
  ];

  return {
    periods,
    employees,
    vehicles,
    orders,
    revenueReceipts: [
      seedRevenue("rev-a", "ACC-202604-A-OWNED", "A", 30000000, "APPROVED", "OWNED_RENT"),
      seedRevenue("rev-b", "ACC-202604-B-OWNED", "B", 10000000, "APPROVED", "OWNED_RENT"),
      seedRevenue("hist-b", "ACC-202604-B-OWNED", "B", 3900000, "APPROVED", "HISTORICAL_RECEIVABLE"),
      seedRevenue("pending-unpaid-a", "ACC-202604-A-UNPAID", "A", 9990000, "PENDING", "OWNED_RENT")
    ],
    externalProfitReceipts: [
      seedExternalProfit("ext-c", "ACC-202604-C-EXTERNAL", "C", 8000000, "APPROVED"),
      seedExternalProfit("ext-pending-c", "ACC-202604-C-EXTERNAL", "C", 2000000, "PENDING")
    ],
    deposits: [
      seedDeposit("deposit-a", "ACC-202604-A-OWNED", "A", 5000000, "A", "HELD"),
      seedDeposit("deposit-b", "ACC-202604-B-OWNED", "B", 3000000, "B", "DISPUTED")
    ],
    batches: []
  };
}

export function previewImportRows(
  importType: ImportType,
  rows: RawImportRow[],
  context: ImportContext,
  options: { fileName?: string } = {}
): ImportPreviewResult {
  const template = getTemplate(importType);
  const seenOrderNos = new Set<string>();
  const previewRows = rows.map<ImportPreviewRow>((row, index) => {
    const normalized = normalizeRow(importType, row, context, seenOrderNos);
    return {
      rowNumber: index + 2,
      rawJson: row,
      normalizedJson: normalized.errors.length === 0 ? normalized.record : null,
      status: normalized.errors.length === 0 ? "VALID" : "ERROR",
      errors: normalized.errors
    };
  });
  const errorRows = previewRows.filter((row) => row.status === "ERROR").length;
  const fileName = options.fileName ?? `${importType}-template-upload.xlsx`;
  const preview: ImportPreviewResult = {
    batchId: createBatchId(importType),
    importType,
    fileName,
    fileHash: hashRows(rows),
    status: errorRows > 0 ? "VALIDATION_FAILED" : "PREVIEWED",
    dryRun: true,
    totalRows: rows.length,
    validRows: rows.length - errorRows,
    errorRows,
    rows: previewRows,
    fieldMapping: Object.fromEntries(template.columns.map((column) => [column, column])),
    riskWarnings: buildRiskWarnings(importType)
  };
  context.batches.push(preview);
  localImportBatches.push(preview);
  return preview;
}

export function commitImportPreview(
  preview: ImportPreviewResult,
  context: ImportContext,
  options: { committedBy: string; committedAt?: string }
): ImportCommitResult {
  if (preview.errorRows > 0) {
    throw new Error("导入预览存在错误行，不能提交入库");
  }

  const validRecords = preview.rows
    .map((row) => row.normalizedJson)
    .filter((record): record is ImportJson => record !== null);

  for (const record of validRecords) {
    appendRecord(preview.importType, record, context);
  }

  preview.status = "COMMITTED";
  const affectedPeriods = uniqueStrings(validRecords.map((record) => String(record.periodCode ?? "")).filter(Boolean));

  return {
    batchId: preview.batchId,
    importType: preview.importType,
    status: "COMMITTED",
    writtenRows: validRecords.length,
    failedRows: 0,
    affectedPeriods,
    affectedDataTypes: [preview.importType],
    committedBy: options.committedBy,
    committedAt: options.committedAt ?? new Date().toISOString(),
    ledger: context
  };
}

export function buildCommissionInputFromImportDraft(
  context: ImportContext,
  periodCode: string
): CommissionSettlementInput {
  const period = findPeriod(context, periodCode);
  if (!period) {
    throw new Error(`考核周期不存在: ${periodCode}`);
  }

  return {
    periodCode,
    departmentId: period.departmentId,
    targetAmountCents: period.targetAmountCents,
    revenueReceipts: context.revenueReceipts
      .filter((receipt) => receipt.periodCode === periodCode)
      .map((receipt) => ({
        id: receipt.id,
        salesUserId: receipt.salesUserId,
        receiptAmountCents: receipt.receiptAmountCents,
        financeReviewStatus: receipt.financeReviewStatus,
        isCommissionable: receipt.isCommissionable,
        revenueKind: receipt.revenueKind
      })),
    externalProfitReceipts: context.externalProfitReceipts
      .filter((receipt) => receipt.periodCode === periodCode)
      .map((receipt) => ({
        id: receipt.id,
        salesUserId: receipt.salesUserId,
        profitAmountCents: receipt.profitAmountCents,
        financeReviewStatus: receipt.financeReviewStatus,
        isCommissionable: receipt.isCommissionable
      })),
    deposits: context.deposits
      .filter((deposit) => deposit.periodCode === periodCode)
      .map((deposit) => ({
        id: deposit.id,
        salesUserId: deposit.salesUserId,
        depositAmountCents: deposit.depositAmountCents,
        refundStatus: deposit.refundStatus
      })),
    targetAdjustments: [],
    tiers: acceptanceScenarioInput.tiers,
    payoutRules: acceptanceScenarioInput.payoutRules,
    employees: context.employees.filter((employee) => employee.roleInSettlement === "SALES")
  };
}

export function calculateImportedSettlement(context: ImportContext, periodCode: string): SettlementSnapshotResult {
  return calculateCommissionSettlement(buildCommissionInputFromImportDraft(context, periodCode));
}

export function buildTrialRunCheckReport(context: ImportContext, periodCode: string): TrialRunCheckReport {
  const period = findPeriod(context, periodCode);
  if (!period) {
    throw new Error(`考核周期不存在: ${periodCode}`);
  }

  const orders = context.orders.filter((order) => order.periodCode === periodCode);
  const revenueReceipts = context.revenueReceipts.filter((receipt) => receipt.periodCode === periodCode);
  const externalProfitReceipts = context.externalProfitReceipts.filter((receipt) => receipt.periodCode === periodCode);
  const deposits = context.deposits.filter((deposit) => deposit.periodCode === periodCode);
  const approvedRevenue = revenueReceipts.filter(
    (receipt) => receipt.financeReviewStatus === "APPROVED" && receipt.isCommissionable
  );
  const approvedRentRevenueCents = sum(
    approvedRevenue.filter((receipt) => receipt.revenueKind === "OWNED_RENT").map((receipt) => receipt.receiptAmountCents)
  );
  const historicalRecoveredCents = sum(
    approvedRevenue
      .filter((receipt) => receipt.revenueKind === "HISTORICAL_RECEIVABLE")
      .map((receipt) => receipt.receiptAmountCents)
  );
  const approvedExternalProfitCents = sum(
    externalProfitReceipts
      .filter((receipt) => receipt.financeReviewStatus === "APPROVED" && receipt.isCommissionable)
      .map((receipt) => receipt.profitAmountCents)
  );
  const commissionableRevenueCents = approvedRentRevenueCents + historicalRecoveredCents + approvedExternalProfitCents;
  const achievementRateBps = calculateAchievementRate(commissionableRevenueCents, period.targetAmountCents);
  const tier = matchCommissionTier(achievementRateBps, acceptanceScenarioInput.tiers);
  const estimatedCommissionPoolCents = Math.round((commissionableRevenueCents * tier.commissionRateBps) / 10000);
  const approvedRevenueByOrder = approvedRevenue.reduce<Record<string, number>>((acc, receipt) => {
    acc[receipt.orderNo] = (acc[receipt.orderNo] ?? 0) + receipt.receiptAmountCents;
    return acc;
  }, {});
  const pendingRevenueCount = revenueReceipts.filter((receipt) => receipt.financeReviewStatus === "PENDING").length;
  const abnormalDepositCount = deposits.filter((deposit) => deposit.refundStatus === "DISPUTED").length;
  const blockingReasons = pendingRevenueCount > 0 ? ["存在未审核收入，财务需先处理后再试算"] : [];
  const warnings = abnormalDepositCount > 0 ? ["存在异常押金，HR 结算前需确认风险归属"] : [];

  return {
    periodCode,
    departmentName: period.departmentName,
    departmentTargetCents: period.targetAmountCents,
    orderReceivableCents: sum(orders.map((order) => order.receivableRentAmountCents)),
    approvedRentRevenueCents,
    approvedExternalProfitCents,
    historicalRecoveredCents,
    depositTotalCents: sum(deposits.map((deposit) => deposit.depositAmountCents)),
    abnormalDepositCount,
    unpaidOrderCount: orders.filter(
      (order) => order.receivableRentAmountCents > 0 && (approvedRevenueByOrder[order.orderNo] ?? 0) < order.receivableRentAmountCents
    ).length,
    pendingRevenueCount,
    commissionableRevenueCents,
    achievementRateBps,
    estimatedCommissionPoolCents,
    canStartHrCalculation: blockingReasons.length === 0,
    blockingReasons,
    warnings
  };
}

function normalizeRow(
  importType: ImportType,
  row: RawImportRow,
  context: ImportContext,
  seenOrderNos: Set<string>
): { record: ImportJson | null; errors: ImportValidationError[] } {
  switch (importType) {
    case "orders":
      return normalizeOrder(row, context, seenOrderNos);
    case "revenue":
      return normalizeRevenue(row, context);
    case "external-profit":
      return normalizeExternalProfit(row, context);
    case "deposits":
      return normalizeDeposit(row, context);
    default:
      return normalizeSimpleTemplate(importType, row, context);
  }
}

function normalizeOrder(row: RawImportRow, context: ImportContext, seenOrderNos: Set<string>) {
  const errors: ImportValidationError[] = [];
  const periodCode = requireText(row, "考核周期", errors);
  const departmentName = requireText(row, "部门", errors);
  const orderNo = requireText(row, "订单号", errors);
  const salesName = requireText(row, "销售姓名", errors);
  const customerName = requireText(row, "客户名称", errors);
  const plateNo = requireText(row, "车牌号", errors);
  const vehicleSourceText = requireText(row, "车辆来源", errors);
  const billingModeText = requireText(row, "计费方式", errors);
  const rentalStartDate = parseDate(row, "租赁开始日期", errors);
  const rentalEndDate = parseDate(row, "租赁结束日期", errors);
  const receivableRentAmountCents = parseMoney(row, "应收租金", errors);
  const vehicleSourceType = parseTemplateEnumValue("orders", "车辆来源", vehicleSourceText, errors) as "OWNED" | "EXTERNAL";
  const billingMode = parseTemplateEnumValue("orders", "计费方式", billingModeText, errors);
  const orderStatus = parseTemplateEnumValue("orders", "订单状态", readText(row, "订单状态") || "进行中", errors);
  validatePeriodForImport(periodCode, "orders", context, errors);
  const sales = findEmployeeByName(context, salesName);
  if (salesName && !sales) {
    errors.push({ code: "EMPLOYEE_NOT_FOUND", field: "销售姓名", message: `员工不存在：${salesName}` });
  }
  const vehicle = findVehicleByPlate(context, plateNo);
  if (plateNo && !vehicle) {
    errors.push({ code: "VEHICLE_NOT_FOUND", field: "车牌号", message: `车辆不存在：${plateNo}` });
  }
  if (orderNo && (context.orders.some((order) => order.orderNo === orderNo) || seenOrderNos.has(orderNo))) {
    errors.push({ code: "DUPLICATE_ORDER_NO", field: "订单号", message: `订单号重复：${orderNo}` });
  }
  if (orderNo) {
    seenOrderNos.add(orderNo);
  }

  if (errors.length > 0 || !sales || !vehicle || receivableRentAmountCents === null || !rentalStartDate || !rentalEndDate) {
    return { record: null, errors };
  }

  return {
    record: {
      id: `order-${orderNo}`,
      periodCode,
      departmentName,
      orderNo,
      salesUserId: sales.userId,
      salesName,
      customerName,
      plateNo,
      vehicleId: vehicle.vehicleId,
      vehicleSourceType,
      billingMode,
      rentalStartDate,
      rentalEndDate,
      receivableRentAmountCents,
      orderStatus,
      remark: readText(row, "备注"),
      dataSource: "IMPORT"
    },
    errors
  };
}

function normalizeRevenue(row: RawImportRow, context: ImportContext) {
  const errors: ImportValidationError[] = [];
  const periodCode = requireText(row, "考核周期", errors);
  const orderNo = requireText(row, "订单号", errors);
  const salesName = requireText(row, "销售姓名", errors);
  const receiptAmountCents = parseMoney(row, "收款金额", errors);
  const receiptDate = parseDate(row, "收款日期", errors);
  const companyAccount = requireText(row, "公司账户", errors);
  const financeReviewStatus = parseTemplateEnumValue("revenue", "财务审核状态", readText(row, "财务审核状态"), errors, {
    defaultValue: "PENDING"
  }) as FinanceReviewStatus;
  const revenueKind = parseTemplateEnumValue("revenue", "收入口径", readText(row, "收入口径"), errors, {
    defaultValue: "OWNED_RENT"
  }) as RevenueKind;
  const isCommissionable = parseTemplateYesNo("revenue", "是否参与提成", readText(row, "是否参与提成"), errors, true);
  validatePeriodForImport(periodCode, "revenue", context, errors);
  const order = findOrder(context, orderNo);
  if (orderNo && !order) {
    errors.push({ code: "ORDER_NOT_FOUND", field: "订单号", message: `收入找不到订单：${orderNo}` });
  }
  const sales = findEmployeeByName(context, salesName);
  if (salesName && !sales) {
    errors.push({ code: "EMPLOYEE_NOT_FOUND", field: "销售姓名", message: `员工不存在：${salesName}` });
  }

  if (errors.length > 0 || !order || !sales || receiptAmountCents === null || !receiptDate) {
    return { record: null, errors };
  }

  return {
    record: {
      id: `revenue-${orderNo}-${receiptDate}-${receiptAmountCents}`,
      periodCode,
      orderNo,
      salesUserId: sales.userId,
      receiptAmountCents,
      receiptDate,
      companyAccount,
      financeReviewStatus,
      revenueKind,
      isCommissionable,
      remark: readText(row, "备注"),
      dataSource: "IMPORT"
    },
    errors
  };
}

function normalizeExternalProfit(row: RawImportRow, context: ImportContext) {
  const errors: ImportValidationError[] = [];
  const periodCode = requireText(row, "考核周期", errors);
  const orderNo = requireText(row, "订单号", errors);
  const salesName = requireText(row, "销售姓名", errors);
  const profitAmountCents = parseMoney(row, "外调利润金额", errors);
  const remitDate = parseDate(row, "打回公司日期", errors);
  const companyAccount = requireText(row, "公司账户", errors);
  const isCommissionable = parseTemplateYesNo(
    "external-profit",
    "是否参与提成",
    readText(row, "是否参与提成"),
    errors,
    true
  );
  validatePeriodForImport(periodCode, "external-profit", context, errors);
  const order = findOrder(context, orderNo);
  if (orderNo && (!order || order.vehicleSourceType !== "EXTERNAL")) {
    errors.push({ code: "EXTERNAL_ORDER_NOT_FOUND", field: "订单号", message: `外调利润找不到外调订单：${orderNo}` });
  }
  const sales = findEmployeeByName(context, salesName);
  if (salesName && !sales) {
    errors.push({ code: "EMPLOYEE_NOT_FOUND", field: "销售姓名", message: `员工不存在：${salesName}` });
  }

  if (errors.length > 0 || !sales || profitAmountCents === null || !remitDate) {
    return { record: null, errors };
  }

  return {
    record: {
      id: `external-profit-${orderNo}-${remitDate}`,
      periodCode,
      orderNo,
      salesUserId: sales.userId,
      profitAmountCents,
      remitDate,
      companyAccount,
      receiptProofUrl: readText(row, "凭证链接"),
      financeReviewStatus: "APPROVED",
      isCommissionable,
      remark: readText(row, "备注"),
      dataSource: "IMPORT"
    },
    errors
  };
}

function normalizeDeposit(row: RawImportRow, context: ImportContext) {
  const errors: ImportValidationError[] = [];
  const periodCode = requireText(row, "考核周期", errors);
  const orderNo = requireText(row, "订单号", errors);
  const salesName = requireText(row, "销售姓名", errors);
  const depositAmountCents = parseMoney(row, "押金金额", errors);
  const holderName = requireText(row, "暂管人", errors);
  const receivedDate = parseDate(row, "收取日期", errors);
  const refundAmountCents = parseMoney(row, "退还金额", errors, { defaultCents: 0 });
  const refundStatus = parseTemplateEnumValue("deposits", "退还状态", readText(row, "退还状态"), errors, {
    defaultValue: "HELD"
  }) as "HELD" | "PARTIALLY_REFUNDED" | "REFUNDED" | "DISPUTED";
  validatePeriodForImport(periodCode, "deposits", context, errors);
  const order = findOrder(context, orderNo);
  if (orderNo && !order) {
    errors.push({ code: "ORDER_NOT_FOUND", field: "订单号", message: `押金找不到订单：${orderNo}` });
  }
  const sales = findEmployeeByName(context, salesName);
  const holder = findEmployeeByName(context, holderName);
  if (salesName && !sales) {
    errors.push({ code: "EMPLOYEE_NOT_FOUND", field: "销售姓名", message: `员工不存在：${salesName}` });
  }
  if (holderName && !holder) {
    errors.push({ code: "EMPLOYEE_NOT_FOUND", field: "暂管人", message: `暂管人不存在：${holderName}` });
  }

  if (errors.length > 0 || !sales || !holder || depositAmountCents === null || refundAmountCents === null || !receivedDate) {
    return { record: null, errors };
  }

  return {
    record: {
      id: `deposit-${orderNo}-${receivedDate}`,
      periodCode,
      orderNo,
      salesUserId: sales.userId,
      depositAmountCents,
      holderUserId: holder.userId,
      receivedDate,
      refundAmountCents,
      refundStatus,
      remark: readText(row, "备注"),
      dataSource: "IMPORT"
    },
    errors
  };
}

function normalizeSimpleTemplate(importType: ImportType, row: RawImportRow, context: ImportContext) {
  const errors: ImportValidationError[] = [];
  const periodCode = readText(row, "考核周期");
  if (periodCode) {
    validatePeriodForImport(periodCode, importType, context, errors);
  }
  validateTemplateEnumFields(importType, row, errors);
  return {
    record:
      errors.length > 0
        ? null
        : { importType, ...Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? "")])) },
    errors
  };
}

function appendRecord(importType: ImportType, record: ImportJson, context: ImportContext) {
  if (importType === "orders") {
    context.orders.push(record as unknown as ImportedOrder);
  } else if (importType === "revenue") {
    context.revenueReceipts.push(record as unknown as ImportedRevenueReceipt);
  } else if (importType === "external-profit") {
    context.externalProfitReceipts.push(record as unknown as ImportedExternalProfitReceipt);
  } else if (importType === "deposits") {
    context.deposits.push(record as unknown as ImportedDeposit);
  }
}

function validatePeriodForImport(
  periodCode: string,
  importType: ImportType,
  context: ImportContext,
  errors: ImportValidationError[]
) {
  if (!periodCode) {
    return;
  }
  const period = findPeriod(context, periodCode);
  if (!period) {
    errors.push({ code: "PERIOD_NOT_FOUND", field: "考核周期", message: `考核周期不存在：${periodCode}` });
    return;
  }
  if (["BOSS_APPROVED", "CLOSED"].includes(period.status)) {
    errors.push({ code: "PERIOD_LOCKED_FOR_IMPORT", field: "考核周期", message: `周期 ${periodCode} 已审批或关闭，禁止导入影响结算的数据` });
  }
  if (["revenue", "external-profit"].includes(importType) && (period.status === "FINANCE_LOCKED" || period.financeLockedAt)) {
    errors.push({ code: "FINANCE_LOCKED_PERIOD", field: "考核周期", message: `周期 ${periodCode} 已财务锁定，禁止导入收入数据` });
  }
}

function requireText(row: RawImportRow, field: string, errors: ImportValidationError[]): string {
  const value = readText(row, field);
  if (!value) {
    errors.push({ code: "REQUIRED_FIELD_MISSING", field, message: `必填字段缺失：${field}` });
  }
  return value;
}

function readText(row: RawImportRow, field: string): string {
  const value = row[field];
  return value === null || value === undefined ? "" : String(value).trim();
}

function validateTemplateEnumFields(importType: ImportType, row: RawImportRow, errors: ImportValidationError[]) {
  const enumFields = templateEnumOptions[importType] ?? {};
  for (const field of Object.keys(enumFields)) {
    parseTemplateEnumValue(importType, field, readText(row, field), errors);
  }
}

function parseTemplateYesNo(
  importType: ImportType,
  field: string,
  value: string,
  errors: ImportValidationError[],
  defaultValue: boolean
): boolean {
  const parsed = parseTemplateEnumValue(importType, field, value, errors, {
    defaultValue: defaultValue ? "true" : "false"
  });
  return parsed ? parsed === "true" : defaultValue;
}

function parseTemplateEnumValue(
  importType: ImportType,
  field: string,
  value: string,
  errors: ImportValidationError[],
  options: { defaultValue?: string } = {}
): string {
  if (!value) {
    return options.defaultValue ?? "";
  }

  const enumOption = findTemplateEnumOption(importType, field, value);
  if (!enumOption) {
    const labels = templateEnumOptions[importType]?.[field]?.map((option) => option.label) ?? [];
    errors.push({
      code: "INVALID_ENUM_VALUE",
      field,
      message: `${field}只能填写：${labels.join("、")}`
    });
    return "";
  }

  return enumOption.value;
}

function findTemplateEnumOption(importType: ImportType, field: string, value: string): TemplateEnumOption | undefined {
  const normalizedValue = normalizeEnumText(value);
  return templateEnumOptions[importType]?.[field]?.find((option) => {
    const candidates = [option.label, option.value, ...(option.aliases ?? [])];
    return candidates.some((candidate) => normalizeEnumText(candidate) === normalizedValue);
  });
}

function normalizeEnumText(value: string): string {
  return value.trim().toUpperCase();
}

function parseMoney(
  row: RawImportRow,
  field: string,
  errors: ImportValidationError[],
  options: { defaultCents?: number } = {}
): number | null {
  const raw = readText(row, field).replace(/,/g, "");
  if (!raw && options.defaultCents !== undefined) {
    return options.defaultCents;
  }
  if (!raw) {
    errors.push({ code: "REQUIRED_FIELD_MISSING", field, message: `必填字段缺失：${field}` });
    return null;
  }
  if (!/^[-+]?\d+(\.\d{1,2})?$/.test(raw)) {
    errors.push({ code: "INVALID_AMOUNT", field, message: `金额格式错误：${field}` });
    return null;
  }
  const cents = Math.round(Number(raw) * 100);
  if (cents < 0) {
    errors.push({ code: "NEGATIVE_AMOUNT", field, message: `金额不能为负：${field}` });
  }
  return cents;
}

function parseDate(row: RawImportRow, field: string, errors: ImportValidationError[]): string | null {
  const raw = readText(row, field);
  if (!raw) {
    errors.push({ code: "REQUIRED_FIELD_MISSING", field, message: `必填字段缺失：${field}` });
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00.000Z`))) {
    errors.push({ code: "INVALID_DATE", field, message: `日期格式错误：${field}` });
    return null;
  }
  return raw;
}

function findPeriod(context: ImportContext, periodCode: string): PeriodRef | undefined {
  return context.periods.find((period) => period.periodCode === periodCode);
}

function findEmployeeByName(context: ImportContext, name: string): EmployeeRef | undefined {
  return context.employees.find((employee) => employee.name === name);
}

function findVehicleByPlate(context: ImportContext, plateNo: string): VehicleRef | undefined {
  return context.vehicles.find((vehicle) => vehicle.plateNo === plateNo);
}

function findOrder(context: ImportContext, orderNo: string): ImportedOrder | undefined {
  return context.orders.find((order) => order.orderNo === orderNo);
}

function buildRiskWarnings(importType: ImportType): string[] {
  if (importType === "deposits") {
    return ["押金导入后只进入押金台账，不进入收入和提成。"];
  }
  if (importType === "external-profit") {
    return ["外调订单只按销售打回公司的利润金额参与考核。"];
  }
  return [];
}

function getTemplate(importType: ImportType): ImportTemplateDefinition {
  const template = templates.find((candidate) => candidate.importType === importType);
  if (!template) {
    throw new Error(`Unknown import type: ${importType}`);
  }
  return template;
}

function escapeCsvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function hashRows(rows: RawImportRow[]): string {
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

function createBatchId(importType: ImportType): string {
  return `import-${importType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function seedOrder(
  orderNo: string,
  salesUserId: string,
  salesName: string,
  plateNo: string,
  vehicleSourceType: "OWNED" | "EXTERNAL",
  receivableRentAmountCents: number,
  orderStatus: string
): ImportedOrder {
  return {
    id: `order-${orderNo}`,
    periodCode: "2026-04",
    departmentName: acceptanceDepartmentName,
    orderNo,
    salesUserId,
    salesName,
    customerName: `客户-${orderNo}`,
    plateNo,
    vehicleId: `vehicle-${plateNo}`,
    vehicleSourceType,
    billingMode: "MONTHLY",
    rentalStartDate: "2026-04-01",
    rentalEndDate: "2026-04-30",
    receivableRentAmountCents,
    orderStatus,
    remark: "H02/H03 seed data",
    dataSource: "SEED"
  };
}

function seedRevenue(
  id: string,
  orderNo: string,
  salesUserId: string,
  receiptAmountCents: number,
  financeReviewStatus: FinanceReviewStatus,
  revenueKind: RevenueKind
): ImportedRevenueReceipt {
  return {
    id,
    periodCode: "2026-04",
    orderNo,
    salesUserId,
    receiptAmountCents,
    receiptDate: "2026-04-20",
    companyAccount: "公司账户",
    financeReviewStatus,
    revenueKind,
    isCommissionable: true,
    remark: "H02/H03 seed data",
    dataSource: "SEED"
  };
}

function seedExternalProfit(
  id: string,
  orderNo: string,
  salesUserId: string,
  profitAmountCents: number,
  financeReviewStatus: FinanceReviewStatus
): ImportedExternalProfitReceipt {
  return {
    id,
    periodCode: "2026-04",
    orderNo,
    salesUserId,
    profitAmountCents,
    remitDate: "2026-04-22",
    companyAccount: "公司账户",
    receiptProofUrl: "",
    financeReviewStatus,
    isCommissionable: true,
    remark: "Only remitted external profit participates",
    dataSource: "SEED"
  };
}

function seedDeposit(
  id: string,
  orderNo: string,
  salesUserId: string,
  depositAmountCents: number,
  holderUserId: string,
  refundStatus: "HELD" | "PARTIALLY_REFUNDED" | "REFUNDED" | "DISPUTED"
): ImportedDeposit {
  return {
    id,
    periodCode: "2026-04",
    orderNo,
    salesUserId,
    depositAmountCents,
    holderUserId,
    receivedDate: "2026-04-01",
    refundAmountCents: 0,
    refundStatus,
    remark: "Deposit is excluded from commission",
    dataSource: "SEED"
  };
}
