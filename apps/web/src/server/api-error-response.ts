import { NextResponse } from "next/server";
import { toWorkflowErrorPayload } from "./db-workflow-errors";

export function workflowErrorResponse(error: unknown): NextResponse {
  const payload = toWorkflowErrorPayload(error);
  return NextResponse.json(
    { code: payload.code, error: payload.error },
    { status: payload.status }
  );
}
