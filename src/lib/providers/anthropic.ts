import type { ProviderAdapter, ProviderDefinition, ProviderPayload, DeltaChunk, CapabilitySet } from "./types";

export const AnthropicDef: ProviderDefinition = {
  id: "anthropic",
  name: "Anthropic Claude",
  baseUrl: "https://api.anthropic.com/v1",
  auth: { type: "apiKey", keyName: "x-api-key" },
  headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
  models: [
    { id: "claude-3-opus-20240229", supportsTools: true },
    { id: "claude-3-sonnet-20240229", supportsTools: true },
    { id: "claude-3-haiku-20240307" },
  ],
};

function toAnthropicMessages(payload: ProviderPayload) {
  // Convert simple role/content messages to Anthropic Messages API format
  // Anthropic expects a single system prompt and a user/assistant turn list
  let system: string | undefined = undefined;
  const conv: Array<{ role: "user" | "assistant"; content: Array<{ type: "text"; text: string }> }> = [];
  for (const m of payload.messages) {
    if (m.role === "system") system = m.content;
    else conv.push({ role: m.role, content: [{ type: "text", text: m.content }] });
  }
  return { system, messages: conv };
}

export const AnthropicAdapter: ProviderAdapter = {
  capabilities() {
    return { tools: true, vision: false } satisfies CapabilitySet;
  },
  async validate(def, creds) {
    try {
      const res = await fetch(`${def.baseUrl}/models`, {
        headers: {
          ...(def.headers ?? {}),
          [def.auth.keyName || "x-api-key"]: creds,
        },
      });
      if (res.ok) return { ok: true };
      return { ok: false, message: `HTTP ${res.status}` };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? "Network error" };
    }
  },
  async *stream(def, creds, payload: ProviderPayload): AsyncIterable<DeltaChunk> {
    const { system, messages } = toAnthropicMessages(payload);
    const res = await fetch(`${def.baseUrl}/messages`, {
      method: "POST",
      headers: {
        ...(def.headers ?? {}),
        [def.auth.keyName || "x-api-key"]: creds,
      },
      body: JSON.stringify({
        model: payload.model,
        system,
        messages,
        stream: true,
        max_tokens: payload.max_tokens,
        temperature: payload.temperature,
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