"use client";

import { useEffect, useState } from "react";

const roles = [
  { label: "老板 / 管理员", value: "BOSS", userId: "local-boss" },
  { label: "销售", value: "SALES", userId: "local-sales" },
  { label: "销售负责人", value: "SALES_MANAGER", userId: "local-sales-manager" },
  { label: "财务", value: "FINANCE", userId: "local-finance" },
  { label: "资管", value: "ASSET_MANAGER", userId: "local-asset" },
  { label: "HR", value: "HR", userId: "local-hr" }
] as const;

const roleStorageKey = "lcs-local-role";
const userStorageKey = "lcs-local-user-id";

export function LocalRoleSwitcher() {
  const [role, setRole] = useState("HR");

  useEffect(() => {
    const savedRole = localStorage.getItem(roleStorageKey) ?? "HR";
    const saved = roles.find((item) => item.value === savedRole) ?? roles[5];
    applyRole(saved.value, saved.userId);
    setRole(saved.value);
  }, []);

  function changeRole(nextRole: string) {
    const selected = roles.find((item) => item.value === nextRole) ?? roles[5];
    applyRole(selected.value, selected.userId);
    setRole(selected.value);
  }

  const current = roles.find((item) => item.value === role) ?? roles[5];

  return (
    <div className="local-role-switcher" aria-label="本地试用角色">
      <span>本地试用角色</span>
      <select value={role} onChange={(event) => changeRole(event.target.value)}>
        {roles.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <small>当前：{current.label}。这是单机试用角色模拟，不是正式登录认证。</small>
    </div>
  );
}

function applyRole(role: string, userId: string) {
  localStorage.setItem(roleStorageKey, role);
  localStorage.setItem(userStorageKey, userId);
  document.cookie = `${roleStorageKey}=${role}; path=/; max-age=31536000; samesite=lax`;
  document.cookie = `${userStorageKey}=${userId}; path=/; max-age=31536000; samesite=lax`;
}
