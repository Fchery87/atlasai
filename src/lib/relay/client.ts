/**
 * Client for optional LLM relay
 *
 * This allows users to optionally route requests through a relay server
 * instead of calling LLM APIs directly from the browser.
 *
 * Benefits:
 * - Hide API keys from browser network tab
 * - Centralized rate limiting
 * - Request logging/monitoring
 *
 * Trade-offs:
 * - Requires deploying and maintaining a relay server
 * - Adds latency
 * - Still requires user to provide their API key (BYOK model)
 */

export interface RelayConfig {
  enabled: boolean;
  endpoint: string; // e.g., "https://relay.yourdomain.com/llm/relay"
}

/**
 * Get relay configuration from localStorage
 */
export function getRelayConfig(): RelayConfig {
  const raw = localStorage.getItem("bf_relay_config");
  if (!raw) {
    return {
      enabled: false,
      endpoint: "",
    };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {
      enabled: false,
      endpoint: "",
    };
  }
}

/**
 * Save relay configuration
 */
export function saveRelayConfig(config: RelayConfig): void {
  localStorage.setItem("bf_relay_config", JSON.stringify(config));
}

/**
 * Forward a streaming request through the relay
 */
export async function relayStream(
  providerId: string,
  model: string,
  userToken: string,
  messages: Array<{ role: string; content: string }>,
  relayEndpoint: string,
  onChunk: (chunk: string) => void, // eslint-disable-line no-unused-vars
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(relayEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: providerId,
      model,
      userToken,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Relay error (${response.status}): ${error}`);
  }

  // Handle streaming response
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const _chunk = decoder.decode(value, { stream: true });
    onChunk(_chunk);
  }
}

/**
 * Check if relay should be used for a given provider
 */
export function shouldUseRelay(_providerId: string): boolean {
  const config = getRelayConfig();
  if (!config.enabled || !config.endpoint) {
    return false;
  }

  // Could add per-provider toggle if needed
  return true;
}
