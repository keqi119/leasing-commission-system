import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const repoRoot = process.cwd();

function readSource(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("commission ledger entry and import UX", () => {
  test("embeds import tools in ledger pages instead of standalone navigation", () => {
    const shell = readSource("apps/web/src/components/CommissionShell.tsx");
    const crudPanel = readSource("apps/web/src/components/OfflineCrudPanel.tsx");
    const uploadComponent = readSource("apps/web/src/components/ImportUploadPanel.tsx");

    expect(shell).not.toContain('href: "/commission/imports"');
    expect(crudPanel).toContain("ImportUploadPanel");
    expect(crudPanel).toContain("lockedImportType");
    expect(uploadComponent).toContain("showTemplateDownloads");
    expect(uploadComponent).toContain('type="file"');
    expect(uploadComponent).toContain("/api/commission/imports/preview");
    expect(uploadComponent).toContain("/api/commission/imports/commit");
  });

  test("keeps create forms inside a drawer so list pages prioritize data", () => {
    const crudPanel = readSource("apps/web/src/components/OfflineCrudPanel.tsx");

    expect(crudPanel).toContain("isCreateDrawerOpen");
    expect(crudPanel).toContain("drawer-backdrop");
    expect(crudPanel).toContain("drawer-panel");
    expect(crudPanel).not.toContain('className="panel-body offline-form"');
    expect(crudPanel).toContain('className="drawer-form offline-form"');
  });
});
