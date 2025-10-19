import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenRouterAdapter, OpenRouterDef } from "../../providers/openrouter";
import { OllamaAdapter, OllamaDef } from "../../providers/ollama";
import { GroqAdapter, GroqDef } from "../../providers/groq";
import { AnthropicAdapter, AnthropicDef } from "../../providers/anthropic";
import { GPT5Adapter, GPT5Def } from "../../providers/gpt5";

describe("Provider adapters", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("OpenRouter validate handles 401", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(null, { status: 401 }) as any);
    const res = await OpenRouterAdapter.validate(OpenRouterDef, "bad");
    expect(res.ok).toBe(false);
  });

  it("Ollama validate ok on 200", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(null, { status: 200 }) as any);
    const res = await OllamaAdapter.validate(OllamaDef, "");
    expect(res.ok).toBe(true);
  });

  it("Groq validate includes Authorization", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(null, { status: 200 }) as any);
    const res = await GroqAdapter.validate(GroqDef, "abc");
    expect(res.ok).toBe(true);
    const call = spy.mock.calls[0][1] as any;
    expect(call.headers.Authorization).toContain("Bearer");
  });

  it("Anthropic validate includes x-api-key", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(null, { status: 200 }) as any);
    const res = await AnthropicAdapter.validate(AnthropicDef, "key");
    expect(res.ok).toBe(true);
    const call = spy.mock.calls[0][1] as any;
    expect(call.headers["x-api-key"]).toBe("key");
  });

  it("GPT5 placeholder validate ok and stream yields placeholder", async () => {
    const res = await GPT5Adapter.validate(GPT5Def, "");
    expect(res.ok).toBe(true);
    const chunks: string[] = [];
    for await (const c of GPT5Adapter.stream(GPT5Def, "", { model: "gpt-5-code-preview", messages: [{ role: "user", content: "hi" }] })) {
      if (c.type === "text") chunks.push(c.data);
    }
    expect(chunks.join("")).toContain("messages=1");
  });

  it("stream yields chunks", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("hello"));
        controller.close();
      },
    });
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      Promise.resolve({
        ok: true,
        body: stream,
        status: 200,
      } as any)
    );
    const chunks: string[] = [];
    for await (const c of OllamaAdapter.stream(OllamaDef, "", { model: "llama3.1", messages: [{ role: "user", content: "hi" }] })) {
      if (c.type === "text") chunks.push(c.data);
    }
    expect(chunks.join("")).toContain("hello");
  });
});