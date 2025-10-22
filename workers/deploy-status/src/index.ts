export interface Env {}

function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-headers", "content-type,authorization");
  headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  return new Response(JSON.stringify(body), { ...init, headers });
}

const handler: ExportedHandler<Env> = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "content-type,authorization",
          "access-control-allow-methods": "GET,POST,OPTIONS",
        },
      });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, ts: Date.now() });
    }

    // Netlify deploy status proxy: /status/netlify?id=DEPLOY_ID
    if (url.pathname === "/status/netlify") {
      const id = url.searchParams.get("id");
      const auth = request.headers.get("authorization") || "";
      if (!id || !auth) {
        return json({ error: "missing_id_or_auth" }, { status: 400 });
      }
      const resp = await fetch(
        `https://api.netlify.com/api/v1/deploys/${encodeURIComponent(id)}`,
        {
          headers: { Authorization: auth },
        },
      );
      const data = await resp.json().catch(() => ({}));
      return json({ ok: resp.ok, status: resp.status, data });
    }

    // Vercel deploy status proxy: /status/vercel?id=DEPLOYMENT_ID
    if (url.pathname === "/status/vercel") {
      const id = url.searchParams.get("id");
      const auth = request.headers.get("authorization") || "";
      if (!id || !auth) {
        return json({ error: "missing_id_or_auth" }, { status: 400 });
      }
      const resp = await fetch(
        `https://api.vercel.com/v13/deployments/${encodeURIComponent(id)}`,
        {
          headers: { Authorization: auth, "Content-Type": "application/json" },
        },
      );
      const data = await resp.json().catch(() => ({}));
      return json({ ok: resp.ok, status: resp.status, data });
    }

    return new Response("Not Found", {
      status: 404,
      headers: { "access-control-allow-origin": "*" },
    });
  },
};

export default handler;
