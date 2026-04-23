import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const HERMES_URL = (process.env.HERMES_DASHBOARD_URL ?? "http://127.0.0.1:9119").replace(/\/$/, "");

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "host",
  "content-length",
  "content-encoding",
]);

async function forward(req: NextRequest, path: string[]) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const target = `${HERMES_URL}/${path.join("/")}${req.nextUrl.search}`;
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  headers.set("host", new URL(HERMES_URL).host);

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };
  if (!["GET", "HEAD"].includes(req.method)) {
    init.body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, init);
    const resHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) resHeaders.set(key, value);
    });
    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "upstream_unreachable", detail: String(err), target: HERMES_URL },
      { status: 502 }
    );
  }
}

type RouteCtx = { params: Promise<{ path: string[] }> };
const handler = async (req: NextRequest, ctx: RouteCtx) => {
  const { path } = await ctx.params;
  return forward(req, path ?? []);
};

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };
