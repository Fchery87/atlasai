/**
 * BoltForge LLM Relay - Optional BYOK-forwarding proxy
 *
 * This Cloudflare Worker provides an optional relay for LLM requests.
 * Key features:
 * - Forwards user-provided API keys (BYOK model)
 * - Never stores keys server-side
 * - Rate limiting per IP
 * - Request/response scrubbing for logs
 *
 * Deploy: wrangler deploy worker/llm-relay.ts
 */

interface Env {
  RATE_LIMITER: KVNamespace;
}

const RATE_LIMIT = {
  MAX_REQUESTS: 100,
  WINDOW_MS: 60 * 1000, // 1 minute
};

/**
 * Rate limiting using KV
 */
async function checkRateLimit(
  ip: string,
  kv: KVNamespace,
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${ip}`;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.WINDOW_MS;

  // Get existing requests
  const existing = await kv.get(key, "json");
  let requests: number[] = Array.isArray(existing) ? existing : [];

  // Filter to current window
  requests = requests.filter((ts) => ts > windowStart);

  if (requests.length >= RATE_LIMIT.MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  // Add current request
  requests.push(now);
  await kv.put(key, JSON.stringify(requests), {
    expirationTtl: 120, // Cleanup after 2 minutes
  });

  return {
    allowed: true,
    remaining: RATE_LIMIT.MAX_REQUESTS - requests.length,
  };
}

/**
 * Scrub sensitive data from logs
 */
function scrubForLog(obj: any): any {
  if (typeof obj === "string") {
    // Redact potential API keys
    return obj.replace(/sk-[a-zA-Z0-9]{20,}/g, "sk-***REDACTED***");
  }
  if (Array.isArray(obj)) {
    return obj.map(scrubForLog);
  }
  if (obj && typeof obj === "object") {
    const scrubbed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (
        key.toLowerCase().includes("key") ||
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("secret")
      ) {
        scrubbed[key] = "***REDACTED***";
      } else {
        scrubbed[key] = scrubForLog(value);
      }
    }
    return scrubbed;
  }
  return obj;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Only POST allowed
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    // Get client IP for rate limiting
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

    // Check rate limit
    const rateCheck = await checkRateLimit(ip, env.RATE_LIMITER);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    try {
      // Parse request
      const body = await request.json();
      const { provider, model, userToken, messages, ...options } = body;

      // Validate required fields
      if (!provider || !userToken) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: provider, userToken",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Map provider to endpoint (simplified - extend as needed)
      const providerEndpoints: Record<string, string> = {
        openrouter: "https://openrouter.ai/api/v1/chat/completions",
        anthropic: "https://api.anthropic.com/v1/messages",
        groq: "https://api.groq.com/openai/v1/chat/completions",
      };

      const endpoint = providerEndpoints[provider];
      if (!endpoint) {
        return new Response(
          JSON.stringify({ error: `Unknown provider: ${provider}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Forward request to actual provider
      const providerResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
          ...(provider === "anthropic" && {
            "x-api-key": userToken,
            "anthropic-version": "2023-06-01",
          }),
        },
        body: JSON.stringify({
          model: model || "gpt-3.5-turbo",
          messages,
          stream: options.stream || false,
          ...options,
        }),
      });

      // Log scrubbed request/response for debugging (optional)
      console.log(
        "Relay request:",
        scrubForLog({ provider, model, messageCount: messages?.length }),
      );
      console.log("Provider status:", providerResponse.status);

      // Return provider response
      return new Response(providerResponse.body, {
        status: providerResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type":
            providerResponse.headers.get("Content-Type") || "application/json",
          "X-RateLimit-Remaining": rateCheck.remaining.toString(),
        },
      });
    } catch (error: any) {
      console.error("Relay error:", scrubForLog(error.message));
      return new Response(JSON.stringify({ error: "Internal relay error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
