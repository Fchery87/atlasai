import type { ProviderAdapter, ProviderDefinition, ProviderPayload, DeltaChunk, CapabilitySet } from "./types";

/**
 * A generic OpenAI-compatible adapter for custom providers.
 * Expects:
 *  - GET /models for validation
 *  - POST /chat/completions with OpenAI-compatible payload and streaming
 */
export const GenericOpenAIAdapter: ProviderAdapter = {
  capabilities(_def) {
    return { tools: false, vision: false } satisfies CapabilitySet;
  },
  async validate(def: ProviderDefinition, creds: string) {
    try {
      const headers: Record<string, string> = { ...(def.headers ?? {}) };
      if (def.auth.type !== "none") {
        const key = def.auth.keyName || "Authorization";
        headers[key] = def.auth.type === "apiKey" ? creds : `Bearer ${creds}`;
      }
      const res = await fetch(`${def.baseUrl.replace(/\/+$/,'')}/models`, { headers });
      if (res.ok) return { ok: true };
      return { ok: false, message: `HTTP ${res.status}` };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? "Network error" };
    }
  },
  async *stream(def: ProviderDefinition, creds: string, payload: ProviderPayload, opts?: { signal?: AbortSignal }): AsyncIterable<DeltaChunk> {
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(def.headers ?? {}) };
    if (def.auth.type !== "none") {
      const key = def.auth.keyName || "Authorization";
      headers[key] = def.auth.type === "apiKey" ? creds : `Bearer ${creds}`;
    }
    const res = await fetch(`${def.baseUrl.replace(/\/+$/,'')}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: payload.model,
        messages: payload.messages,
        stream: true,
        temperature: payload.temperature,
        max_tokens: payload.max_tokens,
      }),
      signal: opts?.signal,
    });
    if (!res.ok || !res.body) {
      yield { type: "event", data: `error: HTTP ${res.status}` };
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      yield { type: "text", data: chunk };
    }
  },
};