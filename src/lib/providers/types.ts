import { z } from "zod";

export const AuthType = z.enum(["apiKey", "bearer", "oauth", "none"]);
export type AuthType = z.infer<typeof AuthType>;

export const ModelSpec = z.object({
  id: z.string(),
  maxTokens: z.number().int().positive().optional(),
  inputCostPerMTokUSD: z.number().nonnegative().optional(),
  outputCostPerMTokUSD: z.number().nonnegative().optional(),
  supportsVision: z.boolean().optional(),
  supportsTools: z.boolean().optional(),
});
export type ModelSpec = z.infer<typeof ModelSpec>;

export const ProviderDefinition = z.object({
  id: z.string(), // slug
  name: z.string(), // display
  baseUrl: z.string().url(),
  auth: z.object({
    type: AuthType,
    keyName: z.string().optional(), // header key, e.g., "x-api-key"
  }),
  headers: z.record(z.string()).optional(),
  models: z.array(ModelSpec),
});
export type ProviderDefinition = z.infer<typeof ProviderDefinition>;

export const ProviderRegistry = z.array(ProviderDefinition);
export type ProviderRegistry = z.infer<typeof ProviderRegistry>;

export type CapabilitySet = {
  vision?: boolean;
  tools?: boolean;
};

export type ProviderPayload = {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  max_tokens?: number;
};

export type DeltaChunk = {
  type: "text" | "event";
  data: string;
};

export interface ProviderAdapter {
  validate(def: ProviderDefinition, creds: string): Promise<{ ok: boolean; message?: string }>;
  stream(def: ProviderDefinition, creds: string, payload: ProviderPayload): AsyncIterable<DeltaChunk>;
  capabilities(def: ProviderDefinition): CapabilitySet;
}