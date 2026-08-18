import { NextRequest, NextResponse } from "next/server";

type MockHandler = (
  req: NextRequest,
  params: Record<string, string>,
) => NextResponse | Promise<NextResponse>;

interface MockRoute {
  method: string;
  pathPattern: string;
  handler: MockHandler;
}

const mockRoutes: MockRoute[] = [];

export function registerMock(route: MockRoute) {
  mockRoutes.push(route);
}

function matchPath(
  pattern: string,
  path: string,
): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith("{") && patternPart.endsWith("}")) {
      const paramName = patternPart.slice(1, -1);
      params[paramName] = pathPart;
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}

export function dispatchMock(
  method: string,
  path: string,
  req: NextRequest,
): NextResponse | Promise<NextResponse> | null {
  for (const route of mockRoutes) {
    if (route.method !== method) continue;

    const params = matchPath(route.pathPattern, path);
    if (params !== null) {
      return route.handler(req, params);
    }
  }

  return null;
}
