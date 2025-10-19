export interface Env { }

const handler: ExportedHandler<Env> = {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
        headers: { "content-type": "application/json" },
      });
    }
    if (url.pathname === "/oauth/callback") {
      // Phase 2 scaffold: handle PKCE callback; extract code and state
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      // In a real implementation, exchange code for token with provider
      return new Response(JSON.stringify({ received: { code: !!code, state } }), {
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("Not Found", { status: 404 });
  },
};

export default handler;