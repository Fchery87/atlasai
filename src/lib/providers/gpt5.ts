import type {
  ProviderAdapter,
  ProviderDefinition,
  ProviderPayload,
  DeltaChunk,
  CapabilitySet,
} from "./types";

export const GPT5Def: ProviderDefinition = {
  id: "gpt5",
  name: "GPT‑5 (Placeholder)",
  baseUrl: "https://api.placeholder.local/v1",
  auth: { type: "none" },
  headers: { "Content-Type": "application/json" },
  models: [
    { id: "gpt-5-code-preview", supportsTools: true, supportsVision: true },
  ],
};

export const GPT5Adapter: ProviderAdapter = {
  capabilities() {
    return { tools: true, vision: true } satisfies CapabilitySet;
  },
  async validate() {
    // Always "valid" as placeholder so it can be selected in UI without creds
    return { ok: true, message: "Placeholder provider" };
  },
  async *stream(
    _def,
    _creds,
    payload: ProviderPayload,
    opts?: { signal?: AbortSignal },
  ): AsyncIterable<DeltaChunk> {
    yield { type: "event", data: "Starting..." };

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // For testing purposes, if the user asks to replace "Hello" with "World", provide the expected HTML
    const userMessage =
      payload.messages[payload.messages.length - 1]?.content || "";
    if (
      userMessage.includes("Replace Hello with World") ||
      userMessage.includes("replace Hello with World")
    ) {
      const htmlResponse = `<!doctype html><html><head><style>body{color:blue}</style></head><body><div id='root'>World</div></body></html>`;

      // Stream the response in chunks to simulate real LLM behavior
      for (let i = 0; i < htmlResponse.length; i += 10) {
        if (opts?.signal?.aborted) break;
        const chunk = htmlResponse.slice(i, i + 10);
        yield { type: "text", data: chunk };
        await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate streaming delay
      }
    } else {
      // Default response for other prompts
      yield {
        type: "text",
        data: `<!doctype html><html><body><div>Response to: ${userMessage.slice(0, 50)}...</div></body></html>`,
      };
    }

    yield { type: "event", data: "Done" };
  },
};
