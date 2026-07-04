import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const repoRoot = process.cwd();

function readSource(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("commission page Chinese copy and field semantics", () => {
  test("workflow pages use Chinese business-facing page titles and section names", () => {
    const expectations = [
      {
        path: "apps/web/src/app/commission/settlements/page.tsx",
        present: ["HR 提成试算", "当前状态与下一步", "结算批次版本", "个人提成明细"],
        absent: ["HR Settlement Runs", "Current Status / Next Step", "Run Versions", "Latest Line Snapshot"]
      },
      {
        path: "apps/web/src/app/commission/adjustments/page.tsx",
        present: ["人工调整", "当前状态与下一步", "调整记录"],
        absent: ["Manual Adjustments", "Current Status / Next Step", "Adjustment Records"]
      },
      {
        path: "apps/web/src/app/commission/trial-run-checks/page.tsx",
        present: ["试运行检查", "当前状态与下一步", "导入与台账数量", "问题建议"],
        absent: ["Trial Run Checks", "Current Status / Next Step", "Import and Ledger Counts", "Issue Suggestions"]
      },
      {
        path: "apps/web/src/app/commission/trial-runs/page.tsx",
        present: ["试运行闭环", "当前状态与下一步", "已落库试运行"],
        absent: ["Trial Runs", "Current Status / Next Step", "Persisted Trial Runs"]
      },
      {
        path: "apps/web/src/app/commission/approvals/page.tsx",
        present: ["老板审批", "当前状态与下一步", "审批队列"],
        absent: ["Boss Approval", "Current Status / Next Step", "Approval Queue"]
      },
      {
        path: "apps/web/src/app/commission/exports/page.tsx",
        present: ["奖金发放导出记录", "当前状态与下一步", "导出绑定", "可导出批次", "禁止导出批次"],
        absent: ["Bonus Export Records", "Current Status / Next Step", "Export Bindings", "Exportable Runs", "Blocked Runs"]
      }
    ];

    for (const expectation of expectations) {
      const source = readSource(expectation.path);
      for (const text of expectation.present) {
        expect(source, `${expectation.path} should include ${text}`).toContain(text);
      }
      for (const text of expectation.absent) {
        expect(source, `${expectation.path} should not include ${text}`).not.toContain(text);
      }
    }
  });

  test("generic commission tables define semantic column labels per module", () => {
    const shell = readSource("apps/web/src/components/CommissionShell.tsx");
    const ledger = readSource("apps/web/src/components/EntryLedgerPage.tsx");

    expect(shell).toContain("columns");
    expect(ledger).toContain("primaryLabel");
    expect(`${shell}\n${ledger}`).not.toContain("<th>对象</th>");
    expect(`${shell}\n${ledger}`).not.toContain("<th>金额 / 类型</th>");

    expect(shell).toContain("考核周期");
    expect(shell).toContain("起止日期");
    expect(shell).toContain("车牌号");
    expect(shell).toContain("事件类型");
    expect(ledger).toContain("订单号");
    expect(ledger).toContain("客户与车辆");
    expect(ledger).toContain("收入口径");
    expect(ledger).toContain("押金暂管人");
  });
});
