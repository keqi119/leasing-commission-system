import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();

function readDoc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("LCS-P1-H06 real trial run documentation", () => {
  test("trial run script covers each operating role and failure recording", () => {
    const script = readDoc("docs/commission/lcs-p1-h06-real-trial-run-script.md");

    for (const role of ["老板", "销售", "财务", "资管", "HR"]) {
      expect(script).toContain(`## ${role}`);
      expect(script).toContain("入口页面");
      expect(script).toContain("测试动作");
      expect(script).toContain("预期结果");
      expect(script).toContain("失败时记录到哪里");
    }
  });

  test("trial run report records approved run, issue, adjustment, export, and limitation sections", () => {
    const report = readDoc("docs/commission/lcs-p1-h06-trial-run-report.md");

    expect(report).toContain("2026-05");
    expect(report).toContain("approved runNo");
    expect(report).toContain("BLOCKER");
    expect(report).toContain("人工调整");
    expect(report).toContain("导出记录");
    expect(report).toContain("已知限制");
  });
});
