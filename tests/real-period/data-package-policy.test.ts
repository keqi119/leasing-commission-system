import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("LCS-P1-H05 real-period data package policy", () => {
  test("keeps real and sensitive period data out of Git", () => {
    const gitignore = readFileSync(".gitignore", "utf8");
    const guide = readFileSync("docs/operations/real-period-data-preparation-guide.md", "utf8");

    for (const pattern of ["local-data/", "*.real.xlsx", "*.real.csv", "*.sensitive.xlsx", "*.sensitive.csv"]) {
      expect(gitignore).toContain(pattern);
    }
    expect(guide).toContain("local-data\\real-periods");
    expect(guide).toContain("粤B****1");
    expect(guide).toContain("Bank account numbers must not enter the repository.");
  });
});
