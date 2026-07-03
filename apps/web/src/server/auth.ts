import {
  employeeRoles,
  hasPermission,
  type CommissionPermission,
  type EmployeeRole
} from "@lcs/shared";
import { NextResponse } from "next/server";

export interface RequestActor {
  userId: string;
  role: EmployeeRole;
}

export type PermissionResult =
  | { ok: true; actor: RequestActor }
  | { ok: false; response: NextResponse };

export function getActorFromRequest(request: Request): RequestActor | null {
  const roleHeader = request.headers.get("x-lcs-role");
  const userId = request.headers.get("x-lcs-user-id") ?? "local-user";

  if (!roleHeader || !employeeRoles.includes(roleHeader as EmployeeRole)) {
    return null;
  }

  return {
    userId,
    role: roleHeader as EmployeeRole
  };
}

export function requirePermission(
  request: Request,
  permission: CommissionPermission
): PermissionResult {
  const actor = getActorFromRequest(request);

  if (!actor) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing or invalid x-lcs-role header" },
        { status: 401 }
      )
    };
  }

  if (!hasPermission(actor.role, permission)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Role ${actor.role} lacks ${permission}` },
        { status: 403 }
      )
    };
  }

  return { ok: true, actor };
}

