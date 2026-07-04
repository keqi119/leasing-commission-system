"use client";

import { useState } from "react";

interface SettlementActionPanelProps {
  latestRunId?: string;
  latestRunStatus?: string;
  latestRunNo?: string;
  defaultPeriodCode?: string;
  mode: "settlements" | "approvals" | "exports";
}

const roleStorageKey = "lcs-local-role";
const userStorageKey = "lcs-local-user-id";

export function SettlementActionPanel({
  latestRunId,
  latestRunStatus,
  latestRunNo,
  defaultPeriodCode = "2026-04",
  mode
}: SettlementActionPanelProps) {
  const [periodCode, setPeriodCode] = useState(defaultPeriodCode);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function runAction(action: "calculate" | "submit" | "approve" | "reject" | "export") {
    setBusy(true);
    setMessage("");
    try {
      let response: Response;
      if (action === "calculate") {
        response = await fetch("/api/commission/settlements/calculate", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ periodCode })
        });
      } else if (action === "submit") {
        response = await fetch(`/api/commission/settlements/${latestRunId}/submit`, {
          method: "PATCH",
          headers: headers(),
          body: JSON.stringify({ excludePendingAdjustments: true })
        });
      } else if (action === "approve") {
        response = await fetch(`/api/commission/settlements/${latestRunId}/approve`, {
          method: "PATCH",
          headers: headers(),
          body: "{}"
        });
      } else if (action === "reject") {
        response = await fetch(`/api/commission/settlements/${latestRunId}/reject`, {
          method: "PATCH",
          headers: headers(),
          body: JSON.stringify({ reason: reason || "老板驳回，需 HR 修正后重算" })
        });
      } else {
        response = await fetch(`/api/commission/exports/${latestRunId}`, {
          method: "POST",
          headers: headers(),
          body: "{}"
        });
      }

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error ?? result.message ?? "操作失败");
      }
      setMessage(action === "export" ? "已生成并保存正式导出文件，请刷新查看导出记录。" : "操作已完成，请刷新页面查看最新状态。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  const hasRun = Boolean(latestRunId);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>页面操作</h2>
        <span className="badge blue">{latestRunNo ?? "尚无结算批次"}</span>
      </div>
      <div className="panel-body action-panel">
        {mode === "settlements" ? (
          <>
            <label>
              试算账期
              <input value={periodCode} onChange={(event) => setPeriodCode(event.target.value)} placeholder="2026-04" />
            </label>
            <button className="button-link" disabled={busy} type="button" onClick={() => runAction("calculate")}>
              生成真实试算
            </button>
            <button className="button-link secondary" disabled={busy || !hasRun || latestRunStatus !== "CALCULATED"} type="button" onClick={() => runAction("submit")}>
              提交老板审批
            </button>
          </>
        ) : null}

        {mode === "approvals" ? (
          <>
            <label>
              驳回原因
              <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="说明需要修正的数据或口径" />
            </label>
            <button className="button-link" disabled={busy || !hasRun || latestRunStatus !== "SUBMITTED"} type="button" onClick={() => runAction("approve")}>
              审批通过
            </button>
            <button className="button-link secondary" disabled={busy || !hasRun || latestRunStatus !== "SUBMITTED"} type="button" onClick={() => runAction("reject")}>
              驳回
            </button>
          </>
        ) : null}

        {mode === "exports" ? (
          <button className="button-link" disabled={busy || !hasRun || !["APPROVED", "EXPORTED"].includes(latestRunStatus ?? "")} type="button" onClick={() => runAction("export")}>
            导出 approved run
          </button>
        ) : null}

        {message ? <span className="badge amber">{message}</span> : null}
      </div>
    </section>
  );
}

function headers() {
  const role = localStorage.getItem(roleStorageKey) ?? "HR";
  const userId = localStorage.getItem(userStorageKey) ?? `local-${role.toLowerCase()}`;
  return {
    "content-type": "application/json",
    "x-lcs-role": role,
    "x-lcs-user-id": userId
  };
}
