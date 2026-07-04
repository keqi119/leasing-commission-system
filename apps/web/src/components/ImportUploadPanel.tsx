"use client";

import { useMemo, useState } from "react";
import type { ImportPreviewResult, ImportTemplateDefinition, ImportType } from "@/server/imports";

type CommitResult = {
  batchId: string;
  importType: ImportType;
  status: "COMMITTED";
  writtenRows: number;
  failedRows: number;
  affectedPeriods: string[];
  affectedDataTypes: ImportType[];
  committedBy: string;
  committedAt: string;
};

interface ImportUploadPanelProps {
  templates: ImportTemplateDefinition[];
  initialImportType?: ImportType;
  lockedImportType?: ImportType;
  showTemplateDownloads?: boolean;
  embedded?: boolean;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

function localHeaders(extra: Record<string, string> = {}) {
  const role = localStorage.getItem("lcs-local-role") ?? "HR";
  const userId = localStorage.getItem("lcs-local-user-id") ?? `local-${role.toLowerCase()}`;
  return {
    ...extra,
    "x-lcs-role": role,
    "x-lcs-user-id": userId
  };
}

export function ImportUploadPanel({
  templates,
  initialImportType,
  lockedImportType,
  showTemplateDownloads = false,
  embedded = false
}: ImportUploadPanelProps) {
  const defaultType = lockedImportType ?? (initialImportType && templates.some((template) => template.importType === initialImportType)
    ? initialImportType
    : templates[0]?.importType);
  const [importType, setImportType] = useState<ImportType>(defaultType ?? "orders");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [message, setMessage] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.importType === importType),
    [importType, templates]
  );

  async function handlePreview() {
    if (!file) {
      setMessage("请先选择要上传的 xlsx 或 csv 文件。");
      return;
    }

    setIsPreviewing(true);
    setPreview(null);
    setCommitResult(null);
    setMessage("");

    const formData = new FormData();
    formData.append("importType", importType);
    formData.append("file", file);

    try {
      const response = await fetch("/api/commission/imports/preview", {
        method: "POST",
        headers: localHeaders(),
        body: formData
      });
      const body = (await response.json()) as ApiResponse<ImportPreviewResult>;
      if (!response.ok || !body.data) {
        setMessage(body.error ?? "上传预览失败，请检查文件格式。");
        return;
      }
      setPreview(body.data);
      setMessage(body.data.errorRows > 0 ? "预览发现错误，请修正文件后重新上传。" : "预览通过，可以确认提交入库。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传预览失败。");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleCommit() {
    if (!preview) {
      setMessage("请先上传并预览文件。");
      return;
    }
    if (preview.errorRows > 0) {
      setMessage("预览存在错误行，不能提交入库。");
      return;
    }

    setIsCommitting(true);
    setCommitResult(null);
    setMessage("");

    try {
      const response = await fetch("/api/commission/imports/commit", {
        method: "POST",
        headers: localHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ batchId: preview.batchId })
      });
      const body = (await response.json()) as ApiResponse<CommitResult>;
      if (!response.ok || !body.data) {
        setMessage(body.error ?? "提交入库失败。");
        return;
      }
      setCommitResult(body.data);
      setMessage(`提交成功：写入 ${body.data.writtenRows} 行，影响账期 ${body.data.affectedPeriods.join("、") || "-"}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交入库失败。");
    } finally {
      setIsCommitting(false);
    }
  }

  const errorRows = preview?.rows.filter((row) => row.status === "ERROR").slice(0, 20) ?? [];

  return (
    <section className={embedded ? "panel embedded-import-panel" : "panel"}>
      <div className="panel-head">
        <h2>{embedded ? "导入本板块数据" : "上传预览与提交入库"}</h2>
        <span className="badge green">真实文件导入</span>
      </div>
      <div className="panel-body">
        <div className="filter-bar">
          <label>
            导入类型
            {lockedImportType ? (
              <input readOnly value={selectedTemplate?.label ?? lockedImportType} />
            ) : (
              <select
                value={importType}
                onChange={(event) => {
                  setImportType(event.target.value as ImportType);
                  setPreview(null);
                  setCommitResult(null);
                  setMessage("");
                }}
              >
                {templates.map((template) => (
                  <option key={template.importType} value={template.importType}>
                    {template.label}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label>
            选择文件
            <input
              accept=".xlsx,.csv"
              type="file"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setCommitResult(null);
                setMessage("");
              }}
            />
          </label>
          <button className="button-link" disabled={isPreviewing} onClick={handlePreview} type="button">
            {isPreviewing ? "预览中..." : "上传并预览"}
          </button>
          <button
            className="button-link secondary"
            disabled={!preview || preview.errorRows > 0 || isCommitting}
            onClick={handleCommit}
            type="button"
          >
            {isCommitting ? "提交中..." : "确认提交入库"}
          </button>
        </div>

        {selectedTemplate ? (
          <p className="muted-text">
            当前模板：{selectedTemplate.label}。请使用下方下载的标准模板填写后上传，系统会先预览校验，预览存在错误时不会写入正式台账。
          </p>
        ) : null}

        {selectedTemplate && showTemplateDownloads ? (
          <div className="template-actions">
            <a className="button-link" href={`/api/commission/imports/templates?type=${selectedTemplate.importType}&format=xlsx`}>
              下载 xlsx 模板
            </a>
            <a className="button-link secondary" href={`/api/commission/imports/templates?type=${selectedTemplate.importType}&format=csv`}>
              下载 csv 模板
            </a>
            <span className="badge blue">请保持中文表头不变</span>
          </div>
        ) : null}

        {selectedTemplate && showTemplateDownloads ? (
          <div className="column-list">
            {selectedTemplate.columns.map((column) => (
              <span key={column}>{column}</span>
            ))}
          </div>
        ) : null}

        {message ? <p className="empty-state">{message}</p> : null}

        {preview ? (
          <div className="metric-grid">
            <div className="metric">
              <span>导入批次</span>
              <strong>{preview.batchId}</strong>
            </div>
            <div className="metric">
              <span>总行数</span>
              <strong>{preview.totalRows}</strong>
            </div>
            <div className="metric">
              <span>有效行</span>
              <strong>{preview.validRows}</strong>
            </div>
            <div className="metric">
              <span>错误行</span>
              <strong>{preview.errorRows}</strong>
            </div>
          </div>
        ) : null}

        {preview?.riskWarnings.length ? (
          <ul className="workflow-list">
            {preview.riskWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}

        {preview ? (
          <div>
            <h3>逐行错误原因</h3>
            {errorRows.length === 0 ? (
              <p className="empty-state">暂无错误行。</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>行号</th>
                    <th>字段</th>
                    <th>错误原因</th>
                  </tr>
                </thead>
                <tbody>
                  {errorRows.flatMap((row) =>
                    row.errors.map((error) => (
                      <tr key={`${row.rowNumber}-${error.code}-${error.field ?? ""}`}>
                        <td>{row.rowNumber}</td>
                        <td>{error.field ?? "-"}</td>
                        <td>{error.message}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        ) : null}

        {commitResult ? (
          <table className="data-table">
            <tbody>
              <tr><th>提交批次</th><td>{commitResult.batchId}</td></tr>
              <tr><th>写入行数</th><td>{commitResult.writtenRows}</td></tr>
              <tr><th>影响账期</th><td>{commitResult.affectedPeriods.join("、") || "-"}</td></tr>
              <tr><th>数据类型</th><td>{commitResult.affectedDataTypes.join("、")}</td></tr>
              <tr><th>提交人</th><td>{commitResult.committedBy}</td></tr>
              <tr><th>提交时间</th><td>{commitResult.committedAt}</td></tr>
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  );
}
