import { z } from "zod";

export const AuthTypeSchema = z.enum(["apiKey", "bearer", "oauth", "none"]);
export type AuthType = z.infer<typeof AuthTypeSchema>;

export const ModelSpecSchema = z.object({
  id: z.string(),
  maxTokens: z.number().int().positive().optional(),
  inputCostPerMTokUSD: z.number().nonnegative().optional(),
  outputCostPerMTokUSD: z.number().nonnegative().optional(),
  supportsVision: z.boolean().optional(),
  supportsTools: z.boolean().optional(),
});
export type ModelSpec = z.infer<typeof ModelSpecSchema>;

export const ProviderDefinitionSchema = z.object({
  id: z.string(), // slug
  name: z.string(), // display
  baseUrl: z.string().url(),
  auth: z.object({
    type: AuthTypeSchema,
    keyName: z.string().optional(), // header key, e.g., "x-api-key"
  }),
  headers: z.record(z.string()).optional(),
  models: z.array(ModelSpecSchema),
});
export type ProviderDefinition = z.infer<typeof ProviderDefinitionSchema>;

export const ProviderRegistrySchema = z.array(ProviderDefinitionSchema);
export type ProviderRegistry = z.infer<typeof ProviderRegistrySchema>;

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

export type StreamOptions = {
  signal?: AbortSignal;
};

export interface ProviderAdapter {
  validate(
    _def: ProviderDefinition,
    _creds: string,
  ): Promise<{ ok: boolean; message?: string }>;
  stream(
    _def: ProviderDefinition,
    _creds: string,
    _payload: ProviderPayload,
    _opts?: StreamOptions,
  ): AsyncIterable<DeltaChunk>;
  capabilities(_def: ProviderDefinition): CapabilitySet;
}
