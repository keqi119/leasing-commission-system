export const employeeRoles = [
  "BOSS",
  "SALES",
  "SALES_MANAGER",
  "FINANCE",
  "ASSET_MANAGER",
  "HR",
  "ADMIN"
] as const;

export type EmployeeRole = (typeof employeeRoles)[number];

export const commissionPermissions = [
  "commission:period:read",
  "commission:period:manage",
  "commission:target:manage",
  "commission:rule:manage",
  "commission:order:create",
  "commission:order:read:self",
  "commission:order:read:department",
  "commission:revenue:submit",
  "commission:revenue:review",
  "commission:deposit:manage:self",
  "commission:external-profit:submit",
  "commission:external-profit:review",
  "commission:receivable:read",
  "commission:target-adjustment:request",
  "commission:target-adjustment:approve",
  "commission:settlement:calculate",
  "commission:settlement:approve",
  "commission:settlement:export"
] as const;

export type CommissionPermission = (typeof commissionPermissions)[number];

export const ROLE_PERMISSIONS: Record<EmployeeRole, CommissionPermission[]> = {
  BOSS: [
    "commission:period:read",
    "commission:period:manage",
    "commission:target:manage",
    "commission:rule:manage",
    "commission:order:read:department",
    "commission:receivable:read",
    "commission:target-adjustment:approve",
    "commission:settlement:approve"
  ],
  SALES: [
    "commission:period:read",
    "commission:order:create",
    "commission:order:read:self",
    "commission:revenue:submit",
    "commission:deposit:manage:self",
    "commission:external-profit:submit"
  ],
  SALES_MANAGER: [
    "commission:period:read",
    "commission:order:create",
    "commission:order:read:self",
    "commission:order:read:department",
    "commission:revenue:submit",
    "commission:deposit:manage:self",
    "commission:external-profit:submit",
    "commission:receivable:read"
  ],
  FINANCE: [
    "commission:period:read",
    "commission:order:read:department",
    "commission:revenue:review",
    "commission:external-profit:review",
    "commission:receivable:read"
  ],
  ASSET_MANAGER: [
    "commission:period:read",
    "commission:target-adjustment:request"
  ],
  HR: [
    "commission:period:read",
    "commission:order:read:department",
    "commission:receivable:read",
    "commission:settlement:calculate",
    "commission:settlement:export"
  ],
  ADMIN: [...commissionPermissions]
};

export function hasPermission(
  role: EmployeeRole,
  permission: CommissionPermission
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

