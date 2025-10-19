import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenRouterAdapter, OpenRouterDef } from "../../providers/openrouter";
import { OllamaAdapter, OllamaDef } from "../../providers/ollama";

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