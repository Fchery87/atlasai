import type { ProviderAdapter, ProviderDefinition, ProviderPayload, DeltaChunk, CapabilitySet } from "./types";

export const OllamaDef: ProviderDefinition = {
  id: "ollama",
  name: "Ollama (Local)",
  baseUrl: "http://localhost:11434/api",
  auth: { type: "none" },
  headers: { "Content-Type": "application/json" },
  models: [{ id: "llama3.1" }, { id: "codellama" }],
};

export const OllamaAdapter: ProviderAdapter = {
  capabilities() {
    return { tools: false, vision: false } satisfies CapabilitySet;
  },
  async validate(def) {
    try {
      const res = await fetch(`${def.baseUrl}/tags`);
      if (res.ok) return { ok: true };
      return { ok: false, message: `HTTP ${res.status}` };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? "Network error" };
    }
  },
  async *stream(def, _creds, payload: ProviderPayload): AsyncIterable<DeltaChunk> {
    const res = await fetch(`${def.baseUrl}/chat`, {
      method: "POST",
      headers: def.headers ?? {},
      body: JSON.stringify({
        model: payload.model,
        messages: payload.messages,
        stream: true,
        options: {
          temperature: payload.temperature,
          num_predict: payload.max_tokens,
        },
      }),
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