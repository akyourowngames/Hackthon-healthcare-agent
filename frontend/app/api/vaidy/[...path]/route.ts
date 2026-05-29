import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    path?: string[];
  };
};

const strippedResponseHeaders = [
  "content-encoding",
  "content-length",
  "connection",
  "keep-alive",
  "transfer-encoding",
];

function backendBaseUrl() {
  const configured = process.env.VAIDY_API_URL || process.env.NEXT_PUBLIC_VAIDY_API_URL;
  if (configured && configured.trim()) {
    return trimTrailingSlashes(configured.trim());
  }

  const host = process.env.VAIDY_API_HOST || "127.0.0.1";
  const port = process.env.VAIDY_API_PORT || "8000";
  return `http://${host}:${port}`;
}

function trimTrailingSlashes(value: string) {
  let nextValue = value;
  while (nextValue.endsWith("/")) {
    nextValue = nextValue.slice(0, -1);
  }
  return nextValue;
}

function makeTargetUrl(request: NextRequest, path: string[]) {
  const target = new URL(`${backendBaseUrl()}/api/${path.map(encodeURIComponent).join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });
  return target;
}

function makeForwardHeaders(request: NextRequest) {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (accept) {
    headers.set("accept", accept);
  }
  return headers;
}

function makeResponseHeaders(response: Response) {
  const headers = new Headers(response.headers);
  for (const name of strippedResponseHeaders) {
    headers.delete(name);
  }
  headers.set("Cache-Control", "no-store");
  return headers;
}

async function proxyToVaidy(request: NextRequest, context: RouteContext) {
  const path = context.params.path || [];
  if (!path.length) {
    return Response.json({ error: "Missing Vaidy API path." }, { status: 400 });
  }

  const target = makeTargetUrl(request, path);
  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();

  try {
    const response = await fetch(target, {
      method: request.method,
      headers: makeForwardHeaders(request),
      body,
      cache: "no-store",
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: makeResponseHeaders(response),
    });
  } catch (error) {
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : error instanceof Error && error.cause
          ? String(error.cause)
          : "";
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Could not reach Vaidy API.",
        cause,
        target: target.origin,
      },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyToVaidy(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyToVaidy(request, context);
}
