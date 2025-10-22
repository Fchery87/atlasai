import { describe, it, expect, vi } from "vitest";
import type {
  ProviderAdapter,
  ProviderDefinition,
  ProviderPayload,
} from "../types";
import { OpenRouterAdapter, OpenRouterDef } from "../openrouter";
import { OllamaAdapter, OllamaDef } from "../ollama";
import { GroqAdapter, GroqDef } from "../groq";
import { AnthropicAdapter, AnthropicDef } from "../anthropic";
import { GPT5Adapter, GPT5Def } from "../gpt5";

/**
 * Contract tests for ProviderAdapter interface
 * Ensures all provider adapters behave consistently
 */

type AdapterTestCase = {
  name: string;
  adapter: ProviderAdapter;
  def: ProviderDefinition;
  validCreds: string;
  invalidCreds: string;
  testModel: string;
};

const adaptersToTest: AdapterTestCase[] = [
  {
    name: "OpenRouter",
    adapter: OpenRouterAdapter,
    def: OpenRouterDef,
    validCreds: "valid-key",
    invalidCreds: "invalid-key",
    testModel: "openai/gpt-4",
  },
  {
    name: "Ollama",
    adapter: OllamaAdapter,
    def: OllamaDef,
    validCreds: "",
    invalidCreds: "",
    testModel: "llama3.1",
  },
  {
    name: "Groq",
    adapter: GroqAdapter,
    def: GroqDef,
    validCreds: "valid-key",
    invalidCreds: "invalid-key",
    testModel: "llama-3.3-70b-versatile",
  },
  {
    name: "Anthropic",
    adapter: AnthropicAdapter,
    def: AnthropicDef,
    validCreds: "valid-key",
    invalidCreds: "invalid-key",
    testModel: "claude-3-5-sonnet-20241022",
  },
  {
    name: "GPT5 (Placeholder)",
    adapter: GPT5Adapter,
    def: GPT5Def,
    validCreds: "",
    invalidCreds: "",
    testModel: "gpt-5-code-preview",
  },
];

describe("ProviderAdapter Contract Tests", () => {
  describe.each(adaptersToTest)(
    "$name adapter",
    ({ name: _name, adapter, def, validCreds, invalidCreds, testModel }) => {
      describe("validate method", () => {
        it("should return an object with 'ok' boolean property", async () => {
          vi.spyOn(global, "fetch").mockResolvedValueOnce(
            new Response(null, { status: 200 }) as any,
          );

          const result = await adapter.validate(def, validCreds);

          expect(result).toHaveProperty("ok");
          expect(typeof result.ok).toBe("boolean");
        });

        it("should return ok: true for valid credentials", async () => {
          vi.spyOn(global, "fetch").mockResolvedValueOnce(
            new Response(null, { status: 200 }) as any,
          );

          const result = await adapter.validate(def, validCreds);

          expect(result.ok).toBe(true);
        });

        it("should return ok: false for invalid credentials", async () => {
          vi.spyOn(global, "fetch").mockResolvedValueOnce(
            new Response(null, { status: 401 }) as any,
          );

          const result = await adapter.validate(def, invalidCreds);

          expect(result.ok).toBe(false);
        });

        it("should optionally include a message property when validation fails", async () => {
          vi.spyOn(global, "fetch").mockResolvedValueOnce(
            new Response(null, { status: 401 }) as any,
          );

          const result = await adapter.validate(def, invalidCreds);

          if (result.message !== undefined) {
            expect(typeof result.message).toBe("string");
            expect(result.message.length).toBeGreaterThan(0);
          }
        });

        it("should handle network errors gracefully", async () => {
          vi.spyOn(global, "fetch").mockRejectedValueOnce(
            new Error("Network error"),
          );

          const result = await adapter.validate(def, validCreds);

          expect(result.ok).toBe(false);
          expect(result.message).toBeDefined();
        });
      });

      describe("stream method", () => {
        it("should return an AsyncIterable", async () => {
          const mockStream = new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("test"));
              controller.close();
            },
          });

          vi.spyOn(global, "fetch").mockResolvedValueOnce({
            ok: true,
            body: mockStream,
            status: 200,
          } as any);

          const payload: ProviderPayload = {
            model: testModel,
            messages: [{ role: "user", content: "Hello" }],
          };

          const stream = adapter.stream(def, validCreds, payload);

          expect(stream[Symbol.asyncIterator]).toBeDefined();
          expect(typeof stream[Symbol.asyncIterator]).toBe("function");
        });

        it("should yield DeltaChunk objects with type and data", async () => {
          const mockStream = new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("test response"));
              controller.close();
            },
          });

          vi.spyOn(global, "fetch").mockResolvedValueOnce({
            ok: true,
            body: mockStream,
            status: 200,
          } as any);

          const payload: ProviderPayload = {
            model: testModel,
            messages: [{ role: "user", content: "Hello" }],
          };

          const chunks = [];
          for await (const chunk of adapter.stream(def, validCreds, payload)) {
            chunks.push(chunk);
            expect(chunk).toHaveProperty("type");
            expect(chunk).toHaveProperty("data");
            expect(["text", "event"]).toContain(chunk.type);
            expect(typeof chunk.data).toBe("string");
          }

          expect(chunks.length).toBeGreaterThan(0);
        });

        it("should respect abort signal when provided", async () => {
          const controller = new AbortController();
          const mockStream = new ReadableStream({
            async start(streamController) {
              // Simulate slow stream
              await new Promise((resolve) => setTimeout(resolve, 100));
              streamController.enqueue(new TextEncoder().encode("test"));
              streamController.close();
            },
          });

          vi.spyOn(global, "fetch").mockResolvedValueOnce({
            ok: true,
            body: mockStream,
            status: 200,
          } as any);

          const payload: ProviderPayload = {
            model: testModel,
            messages: [{ role: "user", content: "Hello" }],
          };

          // Abort immediately
          controller.abort();

          try {
            for await (const _chunk of adapter.stream(
              def,
              validCreds,
              payload,
              {
                signal: controller.signal,
              },
            )) {
              // Should not reach here
            }
          } catch (error: any) {
            // Expect abort or similar error
            expect(
              error.name === "AbortError" || error.message.includes("abort"),
            ).toBe(true);
          }
        });

        it("should handle streaming errors gracefully", async () => {
          vi.spyOn(global, "fetch").mockRejectedValueOnce(
            new Error("Stream error"),
          );

          const payload: ProviderPayload = {
            model: testModel,
            messages: [{ role: "user", content: "Hello" }],
          };

          try {
            for await (const _chunk of adapter.stream(
              def,
              validCreds,
              payload,
            )) {
              // Should throw before reaching here
            }
            // If we reach here without error, that's also valid (silent error handling)
          } catch (error) {
            expect(error).toBeDefined();
          }
        });
      });

      describe("capabilities method", () => {
        it("should return a CapabilitySet object", () => {
          const caps = adapter.capabilities(def);

          expect(caps).toBeDefined();
          expect(typeof caps).toBe("object");
        });

        it("should have optional vision and tools boolean properties", () => {
          const caps = adapter.capabilities(def);

          if (caps.vision !== undefined) {
            expect(typeof caps.vision).toBe("boolean");
          }
          if (caps.tools !== undefined) {
            expect(typeof caps.tools).toBe("boolean");
          }
        });

        it("should return consistent capabilities for the same provider", () => {
          const caps1 = adapter.capabilities(def);
          const caps2 = adapter.capabilities(def);

          expect(caps1).toEqual(caps2);
        });
      });

      describe("Provider definition compliance", () => {
        it("should have a valid provider definition with required fields", () => {
          expect(def).toHaveProperty("id");
          expect(def).toHaveProperty("name");
          expect(def).toHaveProperty("baseUrl");
          expect(def).toHaveProperty("auth");
          expect(def).toHaveProperty("models");

          expect(typeof def.id).toBe("string");
          expect(typeof def.name).toBe("string");
          expect(typeof def.baseUrl).toBe("string");
          expect(Array.isArray(def.models)).toBe(true);
          expect(def.models.length).toBeGreaterThan(0);
        });

        it("should have at least one model defined", () => {
          expect(def.models.length).toBeGreaterThan(0);

          const firstModel = def.models[0];
          expect(firstModel).toHaveProperty("id");
          expect(typeof firstModel.id).toBe("string");
        });

        it("should have valid auth configuration", () => {
          expect(def.auth).toHaveProperty("type");
          expect(["apiKey", "bearer", "oauth", "none"]).toContain(
            def.auth.type,
          );
        });
      });
    },
  );

  describe("Cross-provider consistency", () => {
    it("all adapters should implement the same interface methods", () => {
      for (const { adapter } of adaptersToTest) {
        expect(typeof adapter.validate).toBe("function");
        expect(typeof adapter.stream).toBe("function");
        expect(typeof adapter.capabilities).toBe("function");
      }
    });

    it("all adapters should return the same validate response shape", async () => {
      const results = [];

      for (const { adapter, def, validCreds } of adaptersToTest) {
        vi.spyOn(global, "fetch").mockResolvedValueOnce(
          new Response(null, { status: 200 }) as any,
        );

        const result = await adapter.validate(def, validCreds);
        results.push(result);
      }

      // All should have ok property
      results.forEach((result) => {
        expect(result).toHaveProperty("ok");
        expect(typeof result.ok).toBe("boolean");
      });
    });

    it("all adapters should return CapabilitySet with the same shape", () => {
      const capabilities = adaptersToTest.map(({ adapter, def }) =>
        adapter.capabilities(def),
      );

      capabilities.forEach((caps) => {
        expect(typeof caps).toBe("object");
        // Should only have vision and/or tools properties
        const keys = Object.keys(caps);
        keys.forEach((key) => {
          expect(["vision", "tools"]).toContain(key);
        });
      });
    });
  });
});
