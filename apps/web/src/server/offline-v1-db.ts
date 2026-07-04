import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getSqliteClient, type SqliteRawClient } from "@lcs/database";
import type { ImportContext, ImportJson, ImportPreviewResult, ImportType } from "./imports";
import { buildPayoutWorkbook } from "./export";
import {
  exportApprovedSettlementRun,
  getSettlementRun
} from "./trial-run-db-workflow";

export type OfflineResource =
  | "employees"
  | "vehicles"
  | "periods"
  | "targets"
  | "rules"
  | "orders"
  | "revenue"
  | "external-profit"
  | "deposits"
  | "vehicle-events"
  | "target-adjustments"
  | "import-batches";

export interface OfflineActor {
  userId: string;
  role: string;
}

export type OfflineInput = Record<string, unknown>;

export interface OfflineListResult {
  resource: OfflineResource;
  rows: Array<Record<string, unknown>>;
}

type Db = SqliteRawClient;

const localDepartmentFallback = "租赁销售部";

export async function listOfflineRecords(resource: OfflineResource): Promise<OfflineListResult> {
  const db = await getSqliteClient();
  const rows = await listRows(db, resource);
  return { resource, rows };
}

export async function createOfflineRecord(
  resource: OfflineResource,
  input: OfflineInput,
  actor: OfflineActor
): Promise<Record<string, unknown>> {
  const db = await getSqliteClient();
  const now = nowIso();
  const record = await db.$transaction(async (tx) => {
    switch (resource) {
      case "employees":
        return createEmployee(tx, input, now);
      case "vehicles":
        return createVehicle(tx, input, now);
      case "periods":
        return createPeriod(tx, input, actor, now);
      case "targets":
        return createTarget(tx, input, actor, now);
      case "orders":
        return createOrder(tx, input, now);
      case "revenue":
        return createRevenue(tx, input, now);
      case "external-profit":
        return createExternalProfit(tx, input, now);
      case "deposits":
        return createDeposit(tx, input, now);
      case "vehicle-events":
        return createVehicleEvent(tx, input, actor, now);
      case "target-adjustments":
        return createTargetAdjustment(tx, input, actor, now);
      case "rules":
        return createRuleSet(tx, input, actor, now);
      default:
        throw new Error(`暂不支持新增该数据对象：${resource}`);
    }
  });
  await writeOperationLog(db, actor, "CREATE", resource, stringValue(record.id), null, record);
  return record;
}

export async function reviewOfflineFinanceRecord(
  resource: "revenue" | "external-profit",
  id: string,
  input: { status: "APPROVED" | "REJECTED" | "PENDING"; reviewedBy: string; remark?: string }
): Promise<Record<string, unknown>> {
  const db = await getSqliteClient();
  const now = nowIso();
  const isCommissionable = input.status === "APPROVED" ? 1 : 0;
  if (resource === "revenue") {
    await db.$executeRawUnsafe(
      `UPDATE RevenueReceiptLedger
          SET financeReviewStatus = ?, isCommissionable = ?, financeReviewedBy = ?, financeReviewedAt = ?, remark = COALESCE(?, remark), updatedAt = ?
        WHERE id = ?`,
      input.status,
      isCommissionable,
      input.reviewedBy,
      now,
      input.remark ?? null,
      now,
      id
    );
  } else {
    await db.$executeRawUnsafe(
      `UPDATE ExternalProfitReceipt
          SET financeReviewStatus = ?, isCommissionable = ?, financeReviewedBy = ?, financeReviewedAt = ?, remark = COALESCE(?, remark), updatedAt = ?
        WHERE id = ?`,
      input.status,
      isCommissionable,
      input.reviewedBy,
      now,
      input.remark ?? null,
      now,
      id
    );
  }
  await writeOperationLog(
    db,
    { userId: input.reviewedBy, role: "FINANCE" },
    input.status === "APPROVED" ? "REVIEW_APPROVE" : "REVIEW_REJECT",
    resource,
    id,
    null,
    { status: input.status, remark: input.remark ?? "" }
  );
  const rows = await listRows(db, resource);
  return rows.find((row) => row.id === id) ?? { id, status: input.status };
}

export async function approveOfflineTargetAdjustment(
  id: string,
  input: { status: "APPROVED" | "REJECTED"; approvedBy: string; approvalRemark?: string }
): Promise<Record<string, unknown>> {
  const db = await getSqliteClient();
  const now = nowIso();
  await db.$executeRawUnsafe(
    `UPDATE TargetAdjustmentRequest
        SET status = ?, approvedBy = ?, approvedAt = ?, approvalRemark = ?, updatedAt = ?
      WHERE id = ?`,
    input.status,
    input.approvedBy,
    now,
    input.approvalRemark ?? null,
    now,
    id
  );
  await writeOperationLog(db, { userId: input.approvedBy, role: "BOSS" }, input.status, "target-adjustments", id, null, input);
  const rows = await listRows(db, "target-adjustments");
  return rows.find((row) => row.id === id) ?? { id, status: input.status };
}

export async function commitImportPreviewToDb(
  preview: ImportPreviewResult,
  options: { actor: OfflineActor; committedAt?: string }
): Promise<{
  batchId: string;
  importType: ImportType;
  status: "COMMITTED";
  writtenRows: number;
  failedRows: number;
  affectedDataTypes: ImportType[];
  committedBy: string;
  committedAt: string;
  batch: Record<string, unknown>;
  successCount: number;
  failedCount: number;
  affectedPeriods: string[];
}> {
  if (preview.errorRows > 0) {
    throw new Error("导入预览存在错误行，不能提交入库");
  }
  const validRows = preview.rows.filter((row) => row.status === "VALID" && row.normalizedJson);
  const db = await getSqliteClient();
  const committedAt = options.committedAt ?? nowIso();

  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `INSERT INTO ImportBatch (id, importType, fileName, fileHash, status, dryRun, totalRows, validRows, errorRows, createdBy, createdAt, committedBy, committedAt, remark)
       VALUES (?, ?, ?, ?, 'COMMITTED', 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      preview.batchId,
      preview.importType,
      preview.fileName,
      preview.fileHash,
      preview.totalRows,
      preview.validRows,
      preview.errorRows,
      options.actor.userId,
      committedAt,
      options.actor.userId,
      committedAt,
      "通过离线 V1 导入中心提交"
    );
    for (const row of preview.rows) {
      await tx.$executeRawUnsafe(
        `INSERT INTO ImportBatchRow (id, batchId, rowNumber, rawJson, normalizedJson, status, errorCode, errorMessage, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        createId("import-row"),
        preview.batchId,
        row.rowNumber,
        JSON.stringify(row.rawJson),
        row.normalizedJson ? JSON.stringify(row.normalizedJson) : null,
        row.status,
        row.errors[0]?.code ?? null,
        row.errors.map((error) => error.message).join("; ") || null,
        committedAt
      );
    }
    for (const row of validRows) {
      await createRecordFromImport(tx, preview.importType, row.normalizedJson as ImportJson, options.actor, committedAt);
    }
  });

  const affectedPeriods = uniqueStrings(validRows.map((row) => stringValue(row.normalizedJson?.periodCode)));
  const batch = (
    await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT * FROM ImportBatch WHERE id = ?`, preview.batchId)
  )[0];
  await writeOperationLog(db, options.actor, "IMPORT_COMMIT", preview.importType, preview.batchId, null, {
    rows: validRows.length,
    fileName: preview.fileName
  });
  return {
    batchId: preview.batchId,
    importType: preview.importType,
    status: "COMMITTED",
    writtenRows: validRows.length,
    failedRows: 0,
    affectedDataTypes: [preview.importType],
    committedBy: options.actor.userId,
    committedAt,
    batch,
    successCount: validRows.length,
    failedCount: 0,
    affectedPeriods
  };
}

export async function exportSettlementWorkbookToLocalFile(
  runId: string,
  input: { exportedBy: string }
): Promise<{ id: string; runId: string; runNo: string; fileName: string; filePath: string; fileUrl: string }> {
  const run = await getSettlementRun(runId);
  const exportsDir = join(process.cwd(), "local-data", "exports");
  mkdirSync(exportsDir, { recursive: true });
  const fileName = `${run.runNo}-payout.xlsx`;
  const filePath = join(exportsDir, fileName);
  const workbook = await buildPayoutWorkbook(run.snapshot, {
    departmentName: run.departmentName,
    approvalStatus: run.status,
    approvedBy: run.approvedBy ?? "",
    approvedAt: run.approvedAt ?? ""
  });
  writeFileSync(filePath, workbook);
  const binding = await exportApprovedSettlementRun(runId, {
    exportedBy: input.exportedBy,
    exportType: "XLSX",
    fileUrl: `local-data/exports/${fileName}`
  });
  return {
    id: binding.id,
    runId: binding.settlementRunId,
    runNo: run.runNo,
    fileName: binding.fileName,
    filePath,
    fileUrl: `local-data/exports/${binding.fileName}`
  };
}

export async function buildImportContextFromDb(): Promise<ImportContext> {
  const db = await getSqliteClient();
  const periods = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT p.periodCode, d.name AS departmentName, p.departmentId, p.status, p.financeLockedAt,
            COALESCE(SUM(CASE WHEN t.isIncluded = 1 THEN t.targetAmountCents ELSE 0 END), 0) AS targetAmountCents
       FROM CommissionPeriod p
       LEFT JOIN Department d ON d.id = p.departmentId
       LEFT JOIN CommissionTarget t ON t.periodId = p.id
      GROUP BY p.id, p.periodCode, d.name, p.departmentId, p.status, p.financeLockedAt`
  );
  const employees = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT id AS userId, name, role AS roleInSettlement FROM Employee`
  );
  const vehicles = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT id AS vehicleId, plateNo, vehicleSourceType FROM Vehicle`
  );
  const orders = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT o.id, p.periodCode, d.name AS departmentName, o.orderNo, o.salesUserId, e.name AS salesName,
            o.customerName, v.plateNo, o.vehicleId, o.vehicleSourceType, o.billingMode,
            o.rentalStartDate, o.rentalEndDate, o.receivableRentAmountCents, o.orderStatus,
            '' AS remark, 'MANUAL' AS dataSource
       FROM LeaseOrderLedger o
       JOIN CommissionPeriod p ON p.id = o.periodId
       LEFT JOIN Department d ON d.id = o.departmentId
       LEFT JOIN Employee e ON e.id = o.salesUserId
       LEFT JOIN Vehicle v ON v.id = o.vehicleId`
  );
  const revenueReceipts = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT r.id, p.periodCode, o.orderNo, r.salesUserId, r.receiptAmountCents, r.receiptDate,
            r.companyAccount, r.financeReviewStatus, r.revenueKind, r.isCommissionable,
            COALESCE(r.remark, '') AS remark, 'MANUAL' AS dataSource
       FROM RevenueReceiptLedger r
       JOIN LeaseOrderLedger o ON o.id = r.orderId
       JOIN CommissionPeriod p ON p.id = r.periodId`
  );
  const externalProfitReceipts = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT x.id, p.periodCode, o.orderNo, x.salesUserId, x.profitAmountCents, x.remitDate,
            x.companyAccount, COALESCE(x.receiptProofUrl, '') AS receiptProofUrl,
            x.financeReviewStatus, x.isCommissionable, COALESCE(x.remark, '') AS remark, 'MANUAL' AS dataSource
       FROM ExternalProfitReceipt x
       JOIN LeaseOrderLedger o ON o.id = x.orderId
       JOIN CommissionPeriod p ON p.id = x.periodId`
  );
  const deposits = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT dep.id, p.periodCode, o.orderNo, dep.salesUserId, dep.depositAmountCents, dep.holderUserId,
            dep.receivedDate, dep.refundAmountCents, dep.refundStatus, COALESCE(dep.remark, '') AS remark,
            'MANUAL' AS dataSource
       FROM DepositLedger dep
       JOIN LeaseOrderLedger o ON o.id = dep.orderId
       JOIN CommissionPeriod p ON p.id = dep.periodId`
  );

  return {
    periods,
    employees,
    vehicles,
    orders,
    revenueReceipts,
    externalProfitReceipts,
    deposits,
    batches: []
  } as unknown as ImportContext;
}

async function listRows(db: Db, resource: OfflineResource): Promise<Array<Record<string, unknown>>> {
  switch (resource) {
    case "employees":
      return db.$queryRawUnsafe(
        `SELECT e.*, d.name AS departmentName
           FROM Employee e
           LEFT JOIN Department d ON d.id = e.departmentId
          ORDER BY e.createdAt DESC`
      );
    case "vehicles":
      return db.$queryRawUnsafe(`SELECT * FROM Vehicle ORDER BY createdAt DESC`);
    case "periods":
      return db.$queryRawUnsafe(
        `SELECT p.*, d.name AS departmentName
           FROM CommissionPeriod p
           LEFT JOIN Department d ON d.id = p.departmentId
          ORDER BY p.startDate DESC`
      );
    case "targets":
      return db.$queryRawUnsafe(
        `SELECT t.*, p.periodCode, d.name AS departmentName, v.plateNo
           FROM CommissionTarget t
           JOIN CommissionPeriod p ON p.id = t.periodId
           LEFT JOIN Department d ON d.id = t.departmentId
           LEFT JOIN Vehicle v ON v.id = t.vehicleId
          ORDER BY t.createdAt DESC`
      );
    case "orders":
      return db.$queryRawUnsafe(
        `SELECT o.*, p.periodCode, d.name AS departmentName, e.name AS salesName, v.plateNo
           FROM LeaseOrderLedger o
           JOIN CommissionPeriod p ON p.id = o.periodId
           LEFT JOIN Department d ON d.id = o.departmentId
           LEFT JOIN Employee e ON e.id = o.salesUserId
           LEFT JOIN Vehicle v ON v.id = o.vehicleId
          ORDER BY o.createdAt DESC`
      );
    case "revenue":
      return db.$queryRawUnsafe(
        `SELECT r.*, o.orderNo, p.periodCode, e.name AS salesName
           FROM RevenueReceiptLedger r
           JOIN LeaseOrderLedger o ON o.id = r.orderId
           JOIN CommissionPeriod p ON p.id = r.periodId
           LEFT JOIN Employee e ON e.id = r.salesUserId
          ORDER BY r.createdAt DESC`
      );
    case "external-profit":
      return db.$queryRawUnsafe(
        `SELECT x.*, o.orderNo, p.periodCode, e.name AS salesName
           FROM ExternalProfitReceipt x
           JOIN LeaseOrderLedger o ON o.id = x.orderId
           JOIN CommissionPeriod p ON p.id = x.periodId
           LEFT JOIN Employee e ON e.id = x.salesUserId
          ORDER BY x.createdAt DESC`
      );
    case "deposits":
      return db.$queryRawUnsafe(
        `SELECT dep.*, o.orderNo, p.periodCode, e.name AS salesName, holder.name AS holderName
           FROM DepositLedger dep
           JOIN LeaseOrderLedger o ON o.id = dep.orderId
           JOIN CommissionPeriod p ON p.id = dep.periodId
           LEFT JOIN Employee e ON e.id = dep.salesUserId
           LEFT JOIN Employee holder ON holder.id = dep.holderUserId
          ORDER BY dep.createdAt DESC`
      );
    case "vehicle-events":
      return db.$queryRawUnsafe(
        `SELECT ev.*, v.plateNo, p.periodCode
           FROM VehicleStatusEvent ev
           JOIN Vehicle v ON v.id = ev.vehicleId
           LEFT JOIN CommissionPeriod p ON p.id = ev.periodId
          ORDER BY ev.createdAt DESC`
      );
    case "target-adjustments":
      return db.$queryRawUnsafe(
        `SELECT a.*, p.periodCode, v.plateNo
           FROM TargetAdjustmentRequest a
           JOIN CommissionPeriod p ON p.id = a.periodId
           JOIN Vehicle v ON v.id = a.vehicleId
          ORDER BY a.createdAt DESC`
      );
    case "rules":
      return db.$queryRawUnsafe(
        `SELECT rs.*, d.name AS departmentName
           FROM CommissionRuleSet rs
           LEFT JOIN Department d ON d.id = rs.departmentId
          ORDER BY rs.createdAt DESC`
      );
    case "import-batches":
      return db.$queryRawUnsafe(`SELECT * FROM ImportBatch ORDER BY createdAt DESC`);
    default:
      return [];
  }
}

async function createRecordFromImport(
  db: Db,
  importType: ImportType,
  record: ImportJson,
  actor: OfflineActor,
  now: string
): Promise<Record<string, unknown>> {
  switch (importType) {
    case "employees":
      return createEmployee(
        db,
        {
          name: record["员工姓名"] ?? record.name,
          departmentName: record["部门"] ?? record.departmentName,
          role: record["岗位角色"] ?? record.role,
          isCommissionable: parseYesNo(record["是否参与提成"] ?? record.isCommissionable, true),
          employmentStatus: normalizeEmploymentStatus(record["在职状态"] ?? record.employmentStatus),
          remark: record["备注"] ?? record.remark
        },
        now
      );
    case "vehicles":
      return createVehicle(
        db,
        {
          plateNo: record["车牌号"] ?? record.plateNo,
          vin: record.VIN ?? record.vin,
          brand: record["品牌"] ?? record.brand,
          model: record["车型"] ?? record.model,
          vehicleSourceType: record["车辆来源"] ?? record.vehicleSourceType,
          ownerType: record["权属类型"] ?? record.ownerType,
          status: record["车辆状态"] ?? record.status,
          monthlyTargetAmountCents: yuanToCents(record["月度目标金额"] ?? record.monthlyTargetAmountCents),
          remark: record["备注"] ?? record.remark
        },
        now
      );
    case "orders":
      return createOrder(db, record, now);
    case "revenue":
      return createRevenue(db, record, now);
    case "external-profit":
      return createExternalProfit(db, record, now);
    case "deposits":
      return createDeposit(db, record, now);
    case "targets":
      return createTarget(
        db,
        {
          periodCode: record["考核周期"] ?? record.periodCode,
          departmentName: record["部门"] ?? record.departmentName,
          plateNo: record["车牌号"] ?? record.plateNo,
          targetAmountCents: yuanToCents(record["指标金额"] ?? record.targetAmountCents),
          sourceType: record["指标来源"] ?? record.sourceType,
          isIncluded: parseYesNo(record["是否纳入"] ?? record.isIncluded, true),
          remark: record["备注"] ?? record.remark
        },
        actor,
        now
      );
    case "vehicle-events":
      return createVehicleEvent(
        db,
        {
          periodCode: record["考核周期"] ?? record.periodCode,
          plateNo: record["车牌号"] ?? record.plateNo,
          eventType: record["事件类型"] ?? record.eventType,
          startDate: record["开始日期"] ?? record.startDate,
          endDate: record["结束日期"] ?? record.endDate,
          reason: record["原因"] ?? record.reason ?? record["备注"]
        },
        actor,
        now
      );
    case "target-adjustments":
      return createTargetAdjustment(
        db,
        {
          periodCode: record["考核周期"] ?? record.periodCode,
          plateNo: record["车牌号"] ?? record.plateNo,
          reasonType: record["原因类型"] ?? record.reasonType,
          originalTargetAmountCents: yuanToCents(record["原指标金额"] ?? record.originalTargetAmountCents),
          adjustedTargetAmountCents: yuanToCents(record["调整后指标金额"] ?? record.adjustedTargetAmountCents),
          reason: record["申请原因"] ?? record.reason ?? record["备注"]
        },
        actor,
        now
      );
    default:
      throw new Error(`该导入类型暂不支持提交入库：${importType}`);
  }
}

async function createEmployee(db: Db, input: OfflineInput, now: string) {
  const departmentName = text(input.departmentName) || localDepartmentFallback;
  const department = await ensureDepartment(db, departmentName, now);
  const id = text(input.id) || createId("employee");
  const row = {
    id,
    name: requiredText(input.name, "员工姓名"),
    departmentId: department.id,
    departmentName,
    role: normalizeRole(input.role),
    isCommissionable: boolToInt(input.isCommissionable, true),
    employmentStatus: normalizeEmploymentStatus(input.employmentStatus),
    remark: text(input.remark)
  };
  await db.$executeRawUnsafe(
    `INSERT INTO Employee (id, name, departmentId, role, loginName, passwordHash, isCommissionable, employmentStatus, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    row.id,
    row.name,
    row.departmentId,
    row.role,
    text(input.loginName) || row.id,
    row.isCommissionable,
    row.employmentStatus,
    now,
    now
  );
  return row;
}

async function createVehicle(db: Db, input: OfflineInput, now: string) {
  const row = {
    id: text(input.id) || createId("vehicle"),
    plateNo: requiredText(input.plateNo, "车牌号"),
    vin: text(input.vin),
    brand: text(input.brand) || "未填写品牌",
    model: text(input.model) || "未填写车型",
    vehicleSourceType: normalizeVehicleSource(input.vehicleSourceType),
    ownerType: normalizeOwnerType(input.ownerType),
    status: normalizeVehicleStatus(input.status),
    monthlyTargetAmountCents: cents(input.monthlyTargetAmountCents),
    remark: text(input.remark)
  };
  await db.$executeRawUnsafe(
    `INSERT INTO Vehicle (id, plateNo, vin, brand, model, vehicleSourceType, ownerType, status, monthlyTargetAmountCents, remark, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.plateNo,
    row.vin || null,
    row.brand,
    row.model,
    row.vehicleSourceType,
    row.ownerType,
    row.status,
    row.monthlyTargetAmountCents,
    row.remark || null,
    now,
    now
  );
  return row;
}

async function createPeriod(db: Db, input: OfflineInput, actor: OfflineActor, now: string) {
  const department = await ensureDepartment(db, text(input.departmentName) || localDepartmentFallback, now);
  const periodCode = requiredText(input.periodCode, "考核周期");
  const row = {
    id: text(input.id) || createId("period"),
    periodCode,
    departmentId: department.id,
    departmentName: department.name,
    startDate: dateText(input.startDate) || `${periodCode}-01`,
    endDate: dateText(input.endDate) || `${periodCode}-28`,
    status: text(input.status) || "OPEN",
    remark: text(input.remark)
  };
  await db.$executeRawUnsafe(
    `INSERT INTO CommissionPeriod (id, periodCode, departmentId, startDate, endDate, status, createdBy, createdAt, financeLockedAt, hrCalculatedAt, bossApprovedAt, closedAt, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?)`,
    row.id,
    row.periodCode,
    row.departmentId,
    toIso(row.startDate),
    toIso(row.endDate),
    row.status,
    actor.userId,
    now,
    row.remark || null
  );
  return row;
}

async function createTarget(db: Db, input: OfflineInput, actor: OfflineActor, now: string) {
  const period = await findPeriod(db, input);
  const department = await ensureDepartment(db, text(input.departmentName) || period.departmentName, now);
  const vehicle = await findVehicleOptional(db, input);
  const row = {
    id: text(input.id) || createId("target"),
    periodId: period.id,
    periodCode: period.periodCode,
    departmentId: department.id,
    departmentName: department.name,
    vehicleId: vehicle?.id ?? null,
    plateNo: vehicle?.plateNo ?? "",
    targetAmountCents: cents(input.targetAmountCents),
    sourceType: normalizeTargetSource(input.sourceType),
    isIncluded: boolToInt(input.isIncluded, true),
    remark: text(input.remark)
  };
  await db.$executeRawUnsafe(
    `INSERT INTO CommissionTarget (id, periodId, departmentId, vehicleId, targetAmountCents, sourceType, isIncluded, remark, createdBy, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.periodId,
    row.departmentId,
    row.vehicleId,
    row.targetAmountCents,
    row.sourceType,
    row.isIncluded,
    row.remark || null,
    actor.userId,
    now
  );
  return row;
}

async function createOrder(db: Db, input: OfflineInput, now: string) {
  const period = await findPeriod(db, input);
  const department = await ensureDepartment(db, text(input.departmentName) || period.departmentName, now);
  const sales = await findEmployee(db, { id: input.salesUserId, name: input.salesName });
  const vehicle = await findVehicleRequired(db, input);
  const row = {
    id: text(input.id) || createId("order"),
    orderNo: requiredText(input.orderNo, "订单号"),
    periodId: period.id,
    periodCode: period.periodCode,
    departmentId: department.id,
    departmentName: department.name,
    salesUserId: sales.id,
    salesName: sales.name,
    customerName: requiredText(input.customerName, "客户名称"),
    vehicleId: vehicle.id,
    plateNo: vehicle.plateNo,
    vehicleSourceType: normalizeVehicleSource(input.vehicleSourceType || vehicle.vehicleSourceType),
    billingMode: text(input.billingMode) || "MONTHLY",
    rentalStartDate: requiredText(input.rentalStartDate, "租赁开始日期"),
    rentalEndDate: requiredText(input.rentalEndDate, "租赁结束日期"),
    receivableRentAmountCents: cents(input.receivableRentAmountCents),
    orderStatus: text(input.orderStatus) || "ACTIVE"
  };
  await db.$executeRawUnsafe(
    `INSERT INTO LeaseOrderLedger (id, orderNo, periodId, departmentId, salesUserId, customerName, vehicleId, vehicleSourceType, billingMode, rentalStartDate, rentalEndDate, receivableRentAmountCents, orderStatus, submittedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.orderNo,
    row.periodId,
    row.departmentId,
    row.salesUserId,
    row.customerName,
    row.vehicleId,
    row.vehicleSourceType,
    row.billingMode,
    toIso(row.rentalStartDate),
    toIso(row.rentalEndDate),
    row.receivableRentAmountCents,
    row.orderStatus,
    now,
    now,
    now
  );
  return row;
}

async function createRevenue(db: Db, input: OfflineInput, now: string) {
  const order = await findOrder(db, input);
  const period = await findPeriod(db, input.periodCode ? input : { periodId: order.periodId });
  const sales = await findEmployee(db, { id: input.salesUserId || order.salesUserId });
  const row = {
    id: text(input.id) || createId("revenue"),
    orderId: order.id,
    orderNo: order.orderNo,
    periodId: period.id,
    periodCode: period.periodCode,
    salesUserId: sales.id,
    salesName: sales.name,
    receiptAmountCents: cents(input.receiptAmountCents),
    receiptDate: requiredText(input.receiptDate, "收款日期"),
    companyAccount: text(input.companyAccount) || "本地试用账户",
    receiptProofUrl: text(input.receiptProofUrl),
    financeReviewStatus: normalizeFinanceStatus(input.financeReviewStatus),
    isCommissionable: boolToInt(input.isCommissionable, false),
    revenueKind: text(input.revenueKind) || "OWNED_RENT",
    remark: text(input.remark)
  };
  await db.$executeRawUnsafe(
    `INSERT INTO RevenueReceiptLedger (id, orderId, periodId, salesUserId, receiptAmountCents, receiptDate, companyAccount, receiptProofUrl, financeReviewStatus, isCommissionable, revenueKind, financeReviewedBy, financeReviewedAt, remark, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)`,
    row.id,
    row.orderId,
    row.periodId,
    row.salesUserId,
    row.receiptAmountCents,
    toIso(row.receiptDate),
    row.companyAccount,
    row.receiptProofUrl || null,
    row.financeReviewStatus,
    row.isCommissionable,
    row.revenueKind,
    row.remark || null,
    now,
    now
  );
  return row;
}

async function createExternalProfit(db: Db, input: OfflineInput, now: string) {
  const order = await findOrder(db, input);
  const period = await findPeriod(db, input.periodCode ? input : { periodId: order.periodId });
  const sales = await findEmployee(db, { id: input.salesUserId || order.salesUserId });
  const row = {
    id: text(input.id) || createId("external-profit"),
    orderId: order.id,
    orderNo: order.orderNo,
    periodId: period.id,
    periodCode: period.periodCode,
    salesUserId: sales.id,
    salesName: sales.name,
    profitAmountCents: cents(input.profitAmountCents),
    remitDate: requiredText(input.remitDate, "打回公司日期"),
    companyAccount: text(input.companyAccount) || "本地试用账户",
    receiptProofUrl: text(input.receiptProofUrl),
    financeReviewStatus: normalizeFinanceStatus(input.financeReviewStatus),
    isCommissionable: boolToInt(input.isCommissionable, false),
    remark: text(input.remark)
  };
  await db.$executeRawUnsafe(
    `INSERT INTO ExternalProfitReceipt (id, orderId, periodId, salesUserId, profitAmountCents, remitDate, companyAccount, receiptProofUrl, financeReviewStatus, isCommissionable, financeReviewedBy, financeReviewedAt, remark, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)`,
    row.id,
    row.orderId,
    row.periodId,
    row.salesUserId,
    row.profitAmountCents,
    toIso(row.remitDate),
    row.companyAccount,
    row.receiptProofUrl || null,
    row.financeReviewStatus,
    row.isCommissionable,
    row.remark || null,
    now,
    now
  );
  return row;
}

async function createDeposit(db: Db, input: OfflineInput, now: string) {
  const order = await findOrder(db, input);
  const period = await findPeriod(db, input.periodCode ? input : { periodId: order.periodId });
  const sales = await findEmployee(db, { id: input.salesUserId || order.salesUserId });
  const holder = await findEmployee(db, { id: input.holderUserId || input.salesUserId || order.salesUserId });
  const row = {
    id: text(input.id) || createId("deposit"),
    orderId: order.id,
    orderNo: order.orderNo,
    periodId: period.id,
    periodCode: period.periodCode,
    salesUserId: sales.id,
    salesName: sales.name,
    depositAmountCents: cents(input.depositAmountCents),
    holderUserId: holder.id,
    receivedDate: requiredText(input.receivedDate, "收取日期"),
    refundAmountCents: cents(input.refundAmountCents),
    refundDate: text(input.refundDate),
    refundStatus: text(input.refundStatus) || "HELD",
    remark: text(input.remark)
  };
  await db.$executeRawUnsafe(
    `INSERT INTO DepositLedger (id, orderId, periodId, salesUserId, depositAmountCents, holderUserId, receivedDate, refundAmountCents, refundDate, refundStatus, remark, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.orderId,
    row.periodId,
    row.salesUserId,
    row.depositAmountCents,
    row.holderUserId,
    toIso(row.receivedDate),
    row.refundAmountCents,
    row.refundDate ? toIso(row.refundDate) : null,
    row.refundStatus,
    row.remark || null,
    now,
    now
  );
  return row;
}

async function createVehicleEvent(db: Db, input: OfflineInput, actor: OfflineActor, now: string) {
  const vehicle = await findVehicleRequired(db, input);
  const period = input.periodCode || input.periodId ? await findPeriod(db, input) : null;
  const row = {
    id: text(input.id) || createId("vehicle-event"),
    vehicleId: vehicle.id,
    plateNo: vehicle.plateNo,
    periodId: period?.id ?? null,
    periodCode: period?.periodCode ?? "",
    eventType: text(input.eventType) || "OTHER",
    startDate: requiredText(input.startDate, "开始日期"),
    endDate: text(input.endDate),
    reason: text(input.reason) || "本地试用登记"
  };
  await db.$executeRawUnsafe(
    `INSERT INTO VehicleStatusEvent (id, vehicleId, periodId, eventType, startDate, endDate, reason, createdBy, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.vehicleId,
    row.periodId,
    row.eventType,
    toIso(row.startDate),
    row.endDate ? toIso(row.endDate) : null,
    row.reason,
    actor.userId,
    now
  );
  return row;
}

async function createTargetAdjustment(db: Db, input: OfflineInput, actor: OfflineActor, now: string) {
  const period = await findPeriod(db, input);
  const vehicle = await findVehicleRequired(db, input);
  const row = {
    id: text(input.id) || createId("target-adjustment"),
    periodId: period.id,
    periodCode: period.periodCode,
    vehicleId: vehicle.id,
    plateNo: vehicle.plateNo,
    requestedBy: actor.userId,
    reasonType: text(input.reasonType) || "OTHER",
    originalTargetAmountCents: cents(input.originalTargetAmountCents),
    adjustedTargetAmountCents: cents(input.adjustedTargetAmountCents),
    reason: text(input.reason) || "本地试用指标调整",
    status: text(input.status) || "PENDING"
  };
  await db.$executeRawUnsafe(
    `INSERT INTO TargetAdjustmentRequest (id, periodId, vehicleId, requestedBy, reasonType, originalTargetAmountCents, adjustedTargetAmountCents, reason, status, approvedBy, approvedAt, approvalRemark, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)`,
    row.id,
    row.periodId,
    row.vehicleId,
    row.requestedBy,
    row.reasonType,
    row.originalTargetAmountCents,
    row.adjustedTargetAmountCents,
    row.reason,
    row.status,
    now,
    now
  );
  return row;
}

async function createRuleSet(db: Db, input: OfflineInput, actor: OfflineActor, now: string) {
  const department = await ensureDepartment(db, text(input.departmentName) || localDepartmentFallback, now);
  const id = text(input.id) || createId("rule-set");
  await db.$executeRawUnsafe(
    `INSERT INTO CommissionRuleSet (id, name, departmentId, effectiveFrom, effectiveTo, status, createdBy, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    text(input.name) || "本地试用提成规则",
    department.id,
    toIso(text(input.effectiveFrom) || "2026-01-01"),
    text(input.effectiveTo) ? toIso(text(input.effectiveTo)) : null,
    text(input.status) || "ACTIVE",
    actor.userId,
    now
  );
  return { id, departmentId: department.id, departmentName: department.name };
}

async function ensureDepartment(db: Db, name: string, now: string): Promise<{ id: string; name: string }> {
  const existing = (
    await db.$queryRawUnsafe<Array<{ id: string; name: string }>>(`SELECT id, name FROM Department WHERE name = ?`, name)
  )[0];
  if (existing) {
    return existing;
  }
  const id = createId("department");
  await db.$executeRawUnsafe(
    `INSERT INTO Department (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)`,
    id,
    name,
    now,
    now
  );
  return { id, name };
}

async function findPeriod(db: Db, input: OfflineInput): Promise<{ id: string; periodCode: string; departmentId: string; departmentName: string }> {
  const rows = text(input.periodId)
    ? await db.$queryRawUnsafe<Array<{ id: string; periodCode: string; departmentId: string; departmentName: string | null }>>(
        `SELECT p.*, d.name AS departmentName FROM CommissionPeriod p LEFT JOIN Department d ON d.id = p.departmentId WHERE p.id = ?`,
        text(input.periodId)
      )
    : await db.$queryRawUnsafe<Array<{ id: string; periodCode: string; departmentId: string; departmentName: string | null }>>(
        `SELECT p.*, d.name AS departmentName FROM CommissionPeriod p LEFT JOIN Department d ON d.id = p.departmentId WHERE p.periodCode = ?`,
        requiredText(input.periodCode, "考核周期")
      );
  const row = rows[0];
  if (!row) {
    throw new Error(`考核周期不存在：${text(input.periodCode) || text(input.periodId)}`);
  }
  return { id: row.id, periodCode: row.periodCode, departmentId: row.departmentId, departmentName: row.departmentName ?? localDepartmentFallback };
}

async function findEmployee(db: Db, input: { id?: unknown; name?: unknown }): Promise<{ id: string; name: string }> {
  const id = text(input.id);
  const rows = id
    ? await db.$queryRawUnsafe<Array<{ id: string; name: string }>>(`SELECT id, name FROM Employee WHERE id = ?`, id)
    : await db.$queryRawUnsafe<Array<{ id: string; name: string }>>(`SELECT id, name FROM Employee WHERE name = ?`, requiredText(input.name, "员工姓名"));
  const row = rows[0];
  if (!row) {
    throw new Error(`员工不存在：${id || text(input.name)}`);
  }
  return row;
}

async function findVehicleOptional(db: Db, input: OfflineInput): Promise<{ id: string; plateNo: string; vehicleSourceType: string } | null> {
  const id = text(input.vehicleId);
  const plateNo = text(input.plateNo);
  if (!id && !plateNo) {
    return null;
  }
  const rows = id
    ? await db.$queryRawUnsafe<Array<{ id: string; plateNo: string; vehicleSourceType: string }>>(
        `SELECT id, plateNo, vehicleSourceType FROM Vehicle WHERE id = ?`,
        id
      )
    : await db.$queryRawUnsafe<Array<{ id: string; plateNo: string; vehicleSourceType: string }>>(
        `SELECT id, plateNo, vehicleSourceType FROM Vehicle WHERE plateNo = ?`,
        plateNo
      );
  return rows[0] ?? null;
}

async function findVehicleRequired(db: Db, input: OfflineInput): Promise<{ id: string; plateNo: string; vehicleSourceType: string }> {
  const vehicle = await findVehicleOptional(db, input);
  if (!vehicle) {
    throw new Error(`车辆不存在：${text(input.vehicleId) || text(input.plateNo)}`);
  }
  return vehicle;
}

async function findOrder(db: Db, input: OfflineInput): Promise<{ id: string; orderNo: string; periodId: string; salesUserId: string }> {
  const id = text(input.orderId);
  const orderNo = text(input.orderNo);
  const rows = id
    ? await db.$queryRawUnsafe<Array<{ id: string; orderNo: string; periodId: string; salesUserId: string }>>(
        `SELECT id, orderNo, periodId, salesUserId FROM LeaseOrderLedger WHERE id = ?`,
        id
      )
    : await db.$queryRawUnsafe<Array<{ id: string; orderNo: string; periodId: string; salesUserId: string }>>(
        `SELECT id, orderNo, periodId, salesUserId FROM LeaseOrderLedger WHERE orderNo = ?`,
        requiredText(input.orderNo, "订单号")
      );
  const row = rows[0];
  if (!row) {
    throw new Error(`订单不存在：${id || orderNo}`);
  }
  return row;
}

async function writeOperationLog(
  db: Db,
  actor: OfflineActor,
  action: string,
  resourceType: string,
  resourceId: string,
  beforeValue: unknown,
  afterValue: unknown
) {
  await db.$executeRawUnsafe(
    `INSERT INTO CommissionOperationLog (id, operatorId, operatorRole, action, resourceType, resourceId, beforeJson, afterJson, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    createId("operation-log"),
    actor.userId,
    actor.role,
    action,
    resourceType,
    resourceId || null,
    beforeValue ? JSON.stringify(beforeValue) : null,
    afterValue ? JSON.stringify(afterValue) : null,
    nowIso()
  );
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toIso(value: string): string {
  return value.includes("T") ? value : `${value}T00:00:00.000Z`;
}

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function requiredText(value: unknown, label: string): string {
  const result = text(value);
  if (!result) {
    throw new Error(`${label}不能为空`);
  }
  return result;
}

function stringValue(value: unknown): string {
  return text(value);
}

function dateText(value: unknown): string {
  return text(value).replace(/\//g, "-");
}

function cents(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(numeric)) {
    throw new Error(`金额格式不正确：${value}`);
  }
  return Math.round(numeric);
}

function yuanToCents(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(numeric)) {
    throw new Error(`金额格式不正确：${value}`);
  }
  return Math.round(numeric * 100);
}

function boolToInt(value: unknown, defaultValue: boolean): number {
  return parseYesNo(value, defaultValue) ? 1 : 0;
}

function parseYesNo(value: unknown, defaultValue: boolean): boolean {
  const normalized = text(value).toLowerCase();
  if (!normalized) {
    return defaultValue;
  }
  return ["true", "1", "yes", "y", "是", "参与", "纳入"].includes(normalized);
}

function normalizeRole(value: unknown): string {
  const role = text(value);
  const map: Record<string, string> = {
    老板: "BOSS",
    管理员: "ADMIN",
    销售: "SALES",
    销售负责人: "SALES_MANAGER",
    财务: "FINANCE",
    资管: "ASSET_MANAGER",
    HR: "HR",
    人事: "HR"
  };
  return map[role] ?? (role || "SALES");
}

function normalizeEmploymentStatus(value: unknown): string {
  const status = text(value);
  const map: Record<string, string> = { 在职: "ACTIVE", 离职: "INACTIVE", 停用: "INACTIVE" };
  return map[status] ?? (status || "ACTIVE");
}

function normalizeVehicleSource(value: unknown): string {
  const source = text(value);
  const map: Record<string, string> = { 自有: "OWNED", 自有车: "OWNED", 外调: "EXTERNAL", 外调车: "EXTERNAL" };
  return map[source] ?? (source || "OWNED");
}

function normalizeOwnerType(value: unknown): string {
  const owner = text(value);
  const map: Record<string, string> = { 公司: "COMPANY", 公司自有: "COMPANY", 第三方: "THIRD_PARTY", 个人: "PERSONAL" };
  return map[owner] ?? (owner || "COMPANY");
}

function normalizeVehicleStatus(value: unknown): string {
  const status = text(value);
  const map: Record<string, string> = { 在租: "ACTIVE", 可用: "ACTIVE", 维修: "REPAIR", 停运: "STOPPED", 下线: "OFFLINE" };
  return map[status] ?? (status || "ACTIVE");
}

function normalizeTargetSource(value: unknown): string {
  const source = text(value);
  const map: Record<string, string> = { 手工: "MANUAL", 邮件确认: "EMAIL_CONFIRMATION", 调整: "ADJUSTED" };
  return map[source] ?? (source || "MANUAL");
}

function normalizeFinanceStatus(value: unknown): string {
  const status = text(value);
  const map: Record<string, string> = { 待审核: "PENDING", 通过: "APPROVED", 已通过: "APPROVED", 驳回: "REJECTED", 已驳回: "REJECTED" };
  return map[status] ?? (status || "PENDING");
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
