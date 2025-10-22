/**
 * Token and cost estimation utilities for LLM usage tracking.
 * Uses simplified estimation based on character count (1 token ≈ 4 characters).
 */

import type { ModelSpec } from "../providers/types";

/**
 * Estimate token count from text using a simple heuristic.
 * This is a rough approximation - actual tokenization varies by model.
 *
 * Rule of thumb: 1 token ≈ 4 characters for English text
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Simple character-based estimation
  // More accurate would be to use tiktoken, but that adds significant bundle size
  return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens for a conversation history
 */
export function estimateConversationTokens(
  messages: Array<{ role: string; content: string }>,
): number {
  let total = 0;
  for (const msg of messages) {
    // Add overhead for message formatting (role, separators, etc.)
    total += estimateTokens(msg.content) + 4;
  }
  return total;
}

/**
 * Calculate cost for token usage based on model pricing
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: ModelSpec,
): number {
  const inputCost =
    (inputTokens / 1_000_000) * (model.inputCostPerMTokUSD || 0);
  const outputCost =
    (outputTokens / 1_000_000) * (model.outputCostPerMTokUSD || 0);
  return inputCost + outputCost;
}

/**
 * Format cost as a human-readable string
 */
export function formatCost(usd: number): string {
  if (usd < 0.01) {
    return `<$0.01`;
  }
  return `$${usd.toFixed(2)}`;
}

/**
 * Format token count with K/M suffixes
 */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens}`;
  } else if (tokens < 1_000_000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  } else {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }
}

/**
 * Estimate usage for a chat session
 */
export interface UsageEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export function estimateUsage(
  messages: Array<{ role: string; content: string }>,
  model: ModelSpec,
): UsageEstimate {
  let inputTokens = 0;
  let outputTokens = 0;

  for (const msg of messages) {
    const tokens = estimateTokens(msg.content) + 4; // +4 for message overhead
    if (msg.role === "assistant") {
      outputTokens += tokens;
    } else {
      inputTokens += tokens;
    }
  }

  const totalTokens = inputTokens + outputTokens;
  const estimatedCost = calculateCost(inputTokens, outputTokens, model);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost,
  };
}
