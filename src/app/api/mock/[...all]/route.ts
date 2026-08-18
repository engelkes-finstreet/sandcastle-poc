import { NextRequest, NextResponse } from "next/server";
import { dispatchMock } from "@/shared/backend/mocks/registry";
import "@/shared/backend/mocks/handlers";

function extractPath(req: NextRequest): string {
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^\/api\/mock/, "");
  return pathname;
}

async function handler(req: NextRequest) {
  const path = extractPath(req);
  const method = req.method;

  const response = await dispatchMock(method, path, req);

  if (response) {
    return response;
  }

  return NextResponse.json(
    { error: `No mock handler found for ${method} ${path}` },
    { status: 404 },
  );
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as DELETE,
  handler as PATCH,
};
