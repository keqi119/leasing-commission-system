"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { ImportTemplateDefinition, ImportType } from "@/server/imports";
import type { OfflineResource } from "@/server/offline-v1-db";
import { ImportUploadPanel } from "./ImportUploadPanel";
import type { OfflineCrudConfig, ReferenceType } from "./offline-crud-config";

type Row = Record<string, unknown>;
type References = Record<ReferenceType, Row[]>;

interface OfflineCrudPanelProps {
  config: OfflineCrudConfig;
  initialRows: Row[];
  references: References;
  importTemplates: ImportTemplateDefinition[];
  initialError?: string;
}

const roleStorageKey = "lcs-local-role";
const userStorageKey = "lcs-local-user-id";

export function OfflineCrudPanel({ config, initialRows, references, importTemplates, initialError }: OfflineCrudPanelProps) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [message, setMessage] = useState(initialError ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const canCreate = config.fields.length > 0;
  const referenceOptions = useMemo(() => buildReferenceOptions(references), [references]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    for (const field of config.fields) {
      const rawValue = formData.get(field.name);
      if (field.type === "money") {
        payload[field.name] = Math.round(Number(rawValue || 0) * 100);
      } else if (field.type === "checkbox") {
        payload[field.name] = rawValue === "on";
      } else {
        payload[field.name] = rawValue?.toString() ?? "";
      }
    }
    try {
      const response = await fetch(`/api/commission/offline/${config.resource}`, {
        method: "POST",
        headers: buildHeaders({ "content-type": "application/json" }),
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "提交失败");
      }
      setRows(result.rows ?? [result.record, ...rows]);
      event.currentTarget.reset();
      setIsCreateDrawerOpen(false);
      setMessage("已保存，刷新页面后仍可看到这条数据。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function review(row: Row, status: "APPROVED" | "REJECTED") {
    setMessage("");
    const id = String(row.id ?? "");
    if (!id) {
      setMessage("当前记录缺少 ID，无法处理。");
      return;
    }
    try {
      const response = await fetch(`/api/commission/offline/${config.resource}`, {
        method: "PATCH",
        headers: buildHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({
          id,
          action: config.reviewable === "target-adjustment" ? "target-adjustment-review" : "finance-review",
          status,
          remark: status === "APPROVED" ? "页面审核通过" : "页面驳回"
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "处理失败");
      }
      setRows(result.rows ?? rows.map((item) => (item.id === id ? result.record : item)));
      setMessage(status === "APPROVED" ? "已审核通过。" : "已驳回。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "处理失败");
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">{config.title}</h1>
          <p className="page-subtitle">{config.subtitle}</p>
        </div>
        <div className="header-actions">
          <span className="badge blue">{config.owner}</span>
          {canCreate ? (
            <button className="button-link" type="button" onClick={() => setIsCreateDrawerOpen(true)}>
              新增{config.title}
            </button>
          ) : null}
        </div>
      </header>

      {message ? (
        <section className="panel">
          <div className="panel-body">{message}</div>
        </section>
      ) : null}

      {canCreate && isCreateDrawerOpen ? (
        <div className="drawer-backdrop" role="presentation" onMouseDown={() => setIsCreateDrawerOpen(false)}>
          <aside className="drawer-panel" role="dialog" aria-modal="true" aria-label={`新增${config.title}`} onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <h2>新增{config.title}</h2>
                <p>填写完成后保存，数据会真实写入本地数据库。</p>
              </div>
              <button className="button-link secondary" type="button" onClick={() => setIsCreateDrawerOpen(false)}>
                关闭
              </button>
            </div>
            <form className="drawer-form offline-form" onSubmit={submit}>
              {config.fields.map((field) => (
                <label key={field.name}>
                  {field.label}
                  {field.type === "textarea" ? (
                    <textarea name={field.name} placeholder={field.placeholder} required={field.required} defaultValue={String(field.defaultValue ?? "")} />
                  ) : field.type === "select" ? (
                    <select name={field.name} required={field.required} defaultValue={String(field.defaultValue ?? "")}>
                      <option value="">请选择</option>
                      {(field.reference
                        ? referenceOptions[field.reference].map((row) => ({
                            label: String(row[field.labelKey ?? "name"] ?? row.id ?? ""),
                            value: String(row[field.valueKey ?? "id"] ?? "")
                          }))
                        : field.options ?? []
                      ).map((option) => (
                        <option key={`${field.name}-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={field.name}
                      type={field.type === "money" ? "number" : field.type}
                      step={field.type === "money" ? "0.01" : undefined}
                      required={field.required}
                      placeholder={field.placeholder}
                      defaultValue={typeof field.defaultValue === "boolean" ? String(field.defaultValue) : String(field.defaultValue ?? "")}
                    />
                  )}
                </label>
              ))}
              <div className="form-actions">
                <button className="button-link" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "保存中..." : "保存"}
                </button>
                <span className="badge amber">本地角色模拟会随请求自动提交</span>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <h2>{config.title}列表</h2>
          <span className="badge blue">{rows.length} 条</span>
        </div>
        <div className="panel-body">
          {rows.length === 0 ? (
            <div className="empty-state">当前没有数据。请先新增一条记录，或进入导入中心上传标准模板。</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {config.columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                  {config.reviewable ? <th>操作</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row.id ?? JSON.stringify(row))}>
                    {config.columns.map((column) => (
                      <td key={column.key}>{formatValue(row[column.key], column.kind)}</td>
                    ))}
                    {config.reviewable ? (
                      <td>
                        <div className="row-actions">
                          <button className="button-link secondary" type="button" onClick={() => review(row, "APPROVED")}>
                            通过
                          </button>
                          <button className="button-link secondary" type="button" onClick={() => review(row, "REJECTED")}>
                            驳回
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {config.importType ? (
        <ImportUploadPanel
          embedded
          showTemplateDownloads
          templates={importTemplates}
          initialImportType={config.importType as ImportType}
          lockedImportType={config.importType as ImportType}
        />
      ) : null}
    </>
  );
}

function buildHeaders(extra: Record<string, string>) {
  const role = localStorage.getItem(roleStorageKey) ?? "HR";
  const userId = localStorage.getItem(userStorageKey) ?? `local-${role.toLowerCase()}`;
  return {
    ...extra,
    "x-lcs-role": role,
    "x-lcs-user-id": userId
  };
}

function buildReferenceOptions(references: References): References {
  return references;
}

function formatValue(value: unknown, kind?: "money" | "boolean" | "date") {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (kind === "money") {
    return `${(Number(value) / 100).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 元`;
  }
  if (kind === "boolean") {
    return Number(value) === 1 || value === true ? "是" : "否";
  }
  if (kind === "date") {
    return String(value).slice(0, 10);
  }
  return String(value);
}
