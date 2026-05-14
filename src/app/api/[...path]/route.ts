import type { NextRequest } from 'next/server';

import { dispatchApiRoute } from '@/server/http/api-router';
import { apiErrorToResponse } from '@/server/http/route-error';

export const runtime = 'nodejs';

type RouteCtx = { params: Promise<{ path?: string[] }> };

async function handle(request: NextRequest, method: string, ctx: RouteCtx): Promise<Response> {
  const { path } = await ctx.params;
  const segments = path ?? [];
  if (segments.length === 0) {
    return new Response('Not Found', { status: 404 });
  }
  try {
    const res = await dispatchApiRoute(request, method, segments);
    if (res === null) {
      return new Response('Not Found', { status: 404 });
    }
    return res;
  } catch (err) {
    return apiErrorToResponse(err, console.error);
  }
}

export function GET(request: NextRequest, ctx: RouteCtx) {
  return handle(request, 'GET', ctx);
}

export function POST(request: NextRequest, ctx: RouteCtx) {
  return handle(request, 'POST', ctx);
}

export function PUT(request: NextRequest, ctx: RouteCtx) {
  return handle(request, 'PUT', ctx);
}

export function DELETE(request: NextRequest, ctx: RouteCtx) {
  return handle(request, 'DELETE', ctx);
}

export function PATCH(request: NextRequest, ctx: RouteCtx) {
  return handle(request, 'PATCH', ctx);
}
