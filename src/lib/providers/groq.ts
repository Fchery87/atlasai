import type { ProviderAdapter, ProviderDefinition, ProviderPayload, DeltaChunk, CapabilitySet } from "./types";

export const GroqDef: ProviderDefinition = {
  id: "groq",
  name: "Groq",
  baseUrl: "https://api.groq.com/openai/v1",
  auth: { type: "apiKey", keyName: "Authorization" }, // Bearer <key>
  headers: { "Content-Type": "application/json" },
  models: [
    { id: "llama3-70b-8192" },
    { id: "llama3-groq-70b-8192-tool" },
    { id: "mixtral-8x7b-32768" },
  ],
};

export const GroqAdapter: ProviderAdapter = {
  capabilities() {
    return { tools: true, vision: false } satisfies CapabilitySet;
  },
  async validate(def, creds) {
    try {
      const res = await fetch(`${def.baseUrl}/models`, {
        headers: {
          ...(def.headers ?? {}),
          [def.auth.keyName || "Authorization"]: `Bearer ${creds}`,
        },
      });
      if (res.ok) return { ok: true };
      return { ok: false, message: `HTTP ${res.status}` };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? "Network error" };
    }
  },
  async *stream(def, creds, payload: ProviderPayload, opts?: { signal?: AbortSignal }): AsyncIterable<DeltaChunk> {
    const res = await fetch(`${def.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        ...(def.headers ?? {}),
        [def.auth.keyName || "Authorization"]: `Bearer ${creds}`,
      },
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