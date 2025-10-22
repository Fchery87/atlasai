export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_REDIRECT_URI: string;
}

function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-headers", "content-type");
  return new Response(JSON.stringify(body), { ...init, headers });
}

const handler: ExportedHandler<Env> = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "content-type",
          "access-control-allow-methods": "GET,POST,OPTIONS",
        },
      });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, ts: Date.now() });
    }

    if (url.pathname === "/oauth/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state") ?? "";
      const code_verifier = url.searchParams.get("code_verifier") ?? "";

      if (!code) return json({ error: "missing_code" }, { status: 400 });

      const body = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: env.GITHUB_REDIRECT_URI,
        grant_type: "authorization_code",
        code_verifier,
      });

      const resp = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json" },
        body,
      });
      const data = (await resp.json()) as any;
      if (!resp.ok || data.error) {
        return json(
          { error: "oauth_exchange_failed", details: data },
          { status: 400 },
        );
      }
      // Return access_token to client (client stores it locally)
      return json({
        access_token: data.access_token,
        token_type: data.token_type,
        scope: data.scope,
        state,
      });
    }

    return new Response("Not Found", {
      status: 404,
      headers: { "access-control-allow-origin": "*" },
    });
  },
};

export default handler;
