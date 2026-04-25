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

const HERMES_SESSION_HEADER = "X-Hermes-Session-Token";
let _hermesToken: string | null = null;
let _tokenInflight: Promise<string> | null = null;

async function fetchHermesToken(): Promise<string> {
  const res = await fetch(`${HERMES_URL}/`, { redirect: "manual" });
  const html = await res.text();
  const match = html.match(/window\.__HERMES_SESSION_TOKEN__\s*=\s*"([^"]+)"/);
  if (!match) {
    throw new Error("Hermes session token not found in index.html");
  }
  return match[1];
}

async function getHermesToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && _hermesToken) return _hermesToken;
  if (_tokenInflight) return _tokenInflight;
  _tokenInflight = fetchHermesToken()
    .then((t) => {
      _hermesToken = t;
      return t;
    })
    .finally(() => {
      _tokenInflight = null;
    });
  return _tokenInflight;
}

async function forwardOnce(target: string, baseInit: RequestInit, hermesToken: string) {
  const headers = new Headers(baseInit.headers);
  headers.set(HERMES_SESSION_HEADER, hermesToken);
  return fetch(target, { ...baseInit, headers });
}

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
    let token = await getHermesToken();
    let upstream = await forwardOnce(target, init, token);
    if (upstream.status === 401) {
      token = await getHermesToken(true);
      upstream = await forwardOnce(target, init, token);
    }
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
