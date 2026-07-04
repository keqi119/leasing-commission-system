import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { buildHealthStatus } from "../../apps/web/src/server/local-health";
import {
  commitImportPreviewToDb,
  createDefaultImportContext,
  previewImportRows,
} from "../../apps/web/src/server/imports";
import {
  createOfflineRecord,
  exportSettlementWorkbookToLocalFile,
  listOfflineRecords,
  reviewOfflineFinanceRecord,
} from "../../apps/web/src/server/offline-v1-db";
import { buildTrialRunCheckReportFromDb } from "../../apps/web/src/server/trial-run-db-workflow";
import {
  approveSettlementRun,
  recalculateSettlementRun,
  submitSettlementRun,
} from "../../apps/web/src/server/trial-run-db-workflow";
import { seedAcceptance } from "../../packages/database/prisma/seed.acceptance";
import { getSqliteClient } from "../../packages/database/src";

const root = process.cwd();
const dbPath = join(root, "local-data", "db", "dev.db");
const actor = { userId: "h08-admin", role: "ADMIN" };

describe("offline v1 real data workflow", () => {
  beforeEach(async () => {
    rmSync(dbPath, { force: true });
    await seedAcceptance();
  });

  it("seed creates the same local database that health checks", async () => {
    expect(existsSync(dbPath)).toBe(true);

    const health = await buildHealthStatus(root);

    expect(health.ok).toBe(true);
    expect(health.database.ok).toBe(true);
    expect(health.database.path).toBe("local-data/db/dev.db");
  });

  it("creates core ledger records and reads them back from SQLite", async () => {
    const employee = await createOfflineRecord(
      "employees",
      {
        name: "H08 销售",
        departmentName: "租赁销售部",
        role: "SALES",
        isCommissionable: true,
        employmentStatus: "ACTIVE",
        remark: "H08 CRUD",
      },
      actor,
    );
    const vehicle = await createOfflineRecord(
      "vehicles",
      {
        plateNo: "粤B-H08",
        vin: "VIN-H08",
        brand: "测试品牌",
        model: "测试车型",
        vehicleSourceType: "OWNED",
        ownerType: "OWNED",
        status: "ACTIVE",
        monthlyTargetAmountCents: 1000000,
        remark: "H08 CRUD",
      },
      actor,
    );

    const order = await createOfflineRecord(
      "orders",
      {
        periodCode: "2026-04",
        departmentName: "租赁销售部",
        orderNo: "H08-ORDER-001",
        salesUserId: employee.id,
        customerName: "客户H08",
        vehicleId: vehicle.id,
        vehicleSourceType: "OWNED",
        billingMode: "MONTHLY",
        rentalStartDate: "2026-04-01",
        rentalEndDate: "2026-04-30",
        receivableRentAmountCents: 1200000,
        orderStatus: "ACTIVE",
      },
      { userId: employee.id, role: "SALES" },
    );
    const revenue = await createOfflineRecord(
      "revenue",
      {
        orderId: order.id,
        periodCode: "2026-04",
        salesUserId: employee.id,
        receiptAmountCents: 1200000,
        receiptDate: "2026-04-18",
        companyAccount: "本地试用账户",
        receiptProofUrl: "https://example.test/h08",
        financeReviewStatus: "PENDING",
        isCommissionable: false,
      },
      { userId: employee.id, role: "SALES" },
    );

    const employees = await listOfflineRecords("employees");
    const orders = await listOfflineRecords("orders");
    const revenues = await listOfflineRecords("revenue");

    expect(employees.rows.some((row) => row.id === employee.id)).toBe(true);
    expect(orders.rows.some((row) => row.orderNo === "H08-ORDER-001")).toBe(true);
    expect(revenues.rows.some((row) => row.id === revenue.id)).toBe(true);
  });

  it("commits previewed import rows into ImportBatch and business ledgers", async () => {
    const preview = previewImportRows(
      "employees",
      [
        {
          部门: "租赁销售部",
          员工姓名: "导入销售H08",
          岗位角色: "销售",
          是否参与提成: "是",
          在职状态: "在职",
          备注: "H08 import",
        },
      ],
      createDefaultImportContext(),
      { fileName: "h08-employees.xlsx", createdBy: "h08-hr" },
    );

    const commit = await commitImportPreviewToDb(preview, {
      actor: { userId: "h08-hr", role: "HR" },
    });

    expect(commit.successCount).toBe(1);
    expect(commit.batch.status).toBe("COMMITTED");

    const db = await getSqliteClient();
    const batchRows = await db.$queryRawUnsafe<Array<{ id: string; status: string }>>(
      "select * from ImportBatch where id = ?",
      commit.batch.id,
    );
    const employees = await listOfflineRecords("employees");

    expect(batchRows).toHaveLength(1);
    expect(employees.rows.some((row) => row.name === "导入销售H08")).toBe(true);
  });

  it("finance review controls settlement inclusion and approved runs export to local files", async () => {
    const employee = await createOfflineRecord(
      "employees",
      {
        name: "H08 审核销售",
        departmentName: "租赁销售部",
        role: "SALES",
        isCommissionable: true,
        employmentStatus: "ACTIVE",
      },
      actor,
    );
    const vehicle = await createOfflineRecord(
      "vehicles",
      {
        plateNo: "粤B-H08-2",
        brand: "测试品牌",
        model: "测试车型",
        vehicleSourceType: "OWNED",
        ownerType: "OWNED",
        status: "ACTIVE",
      },
      actor,
    );
    const order = await createOfflineRecord(
      "orders",
      {
        periodCode: "2026-04",
        departmentName: "租赁销售部",
        orderNo: "H08-ORDER-002",
        salesUserId: employee.id,
        customerName: "客户H08-2",
        vehicleId: vehicle.id,
        vehicleSourceType: "OWNED",
        billingMode: "MONTHLY",
        rentalStartDate: "2026-04-01",
        rentalEndDate: "2026-04-30",
        receivableRentAmountCents: 500000,
        orderStatus: "ACTIVE",
      },
      { userId: employee.id, role: "SALES" },
    );
    const revenue = await createOfflineRecord(
      "revenue",
      {
        orderId: order.id,
        periodCode: "2026-04",
        salesUserId: employee.id,
        receiptAmountCents: 500000,
        receiptDate: "2026-04-19",
        financeReviewStatus: "PENDING",
        isCommissionable: false,
      },
      { userId: employee.id, role: "SALES" },
    );

    const beforeReview = await buildTrialRunCheckReportFromDb("2026-04");
    expect(beforeReview?.commissionableRevenueCents).toBe(51900000);

    await reviewOfflineFinanceRecord("revenue", revenue.id, {
      status: "APPROVED",
      reviewedBy: "h08-finance",
      remark: "H08 审核通过",
    });

    const run = await recalculateSettlementRun({
      periodCode: "2026-04",
      departmentName: "租赁销售部",
      calculatedBy: "h08-hr",
    });

    expect(run.snapshot.confirmedRevenueAmountCents).toBe(52400000);
    expect(run.snapshot.lines.some((line) => line.userId === employee.id)).toBe(true);

    await submitSettlementRun(run.id, { submittedBy: "h08-hr" });
    const approved = await approveSettlementRun(run.id, {
      approvedBy: "h08-boss",
      approvedRole: "BOSS",
      comment: "H08 审批通过",
    });

    const exportResult = await exportSettlementWorkbookToLocalFile(approved.id, {
      exportedBy: "h08-hr",
    });

    expect(exportResult.runNo).toBe(approved.runNo);
    expect(exportResult.filePath).toContain("local-data");
    expect(existsSync(exportResult.filePath)).toBe(true);
  });
});
