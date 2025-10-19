import type { ProviderAdapter, ProviderDefinition, ProviderPayload, DeltaChunk, CapabilitySet } from "./types";

export const GPT5Def: ProviderDefinition = {
  id: "gpt5",
  name: "GPT‑5 (Placeholder)",
  baseUrl: "https://api.placeholder.local/v1",
  auth: { type: "none" },
  headers: { "Content-Type": "application/json" },
  models: [{ id: "gpt-5-code-preview", supportsTools: true, supportsVision: true }],
};

export const GPT5Adapter: ProviderAdapter = {
  capabilities() {
    return { tools: true, vision: true } satisfies CapabilitySet;
  },
  async validate() {
    // Always \"valid\" as placeholder so it can be selected in UI without creds
    return { ok: true, message: "Placeholder provider" };
  },
  async *stream(_def, _creds, payload: ProviderPayload): AsyncIterable<DeltaChunk> {
    yield { type: "event", data: "info: GPT‑5 placeholder adapter — no real API calls are performed." };
    yield { type: "text", data: `model=${payload.model} ` };
    yield { type: "text", data: `messages=${payload.messages.length}` };
  },
};