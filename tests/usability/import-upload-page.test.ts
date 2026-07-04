import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const repoRoot = process.cwd();

function readSource(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("commission import upload page", () => {
  test("provides browser upload, preview, and commit actions", () => {
    const page = readSource("apps/web/src/app/commission/imports/page.tsx");
    const uploadComponent = readSource("apps/web/src/components/ImportUploadPanel.tsx");

    expect(page).toContain("ImportUploadPanel");
    expect(uploadComponent).toContain('type="file"');
    expect(uploadComponent).toContain("/api/commission/imports/preview");
    expect(uploadComponent).toContain("/api/commission/imports/commit");
    expect(uploadComponent).toContain("上传并预览");
    expect(uploadComponent).toContain("确认提交入库");
    expect(uploadComponent).toContain("逐行错误原因");
  });
});
