# BoltForge LLM Relay Worker

Optional Cloudflare Worker for proxying LLM requests with BYOK (Bring Your Own Key) model.

## Features

- **BYOK Model**: Users provide their own API keys on each request
- **No Server-Side Storage**: Keys are never stored on the server
- **Rate Limiting**: Per-IP rate limiting using Cloudflare KV
- **Request Scrubbing**: Sensitive data removed from logs
- **CORS Support**: Works with browser-based apps
- **Multi-Provider**: Supports OpenRouter, Anthropic, Groq, and more

## Why Use a Relay?

**Benefits:**

- Hides API keys from browser network inspector
- Centralized rate limiting across users
- Request logging and monitoring
- Can add additional security layers (IP allowlisting, etc.)

**Trade-offs:**

- Adds latency (~50-200ms typically)
- Requires deploying and maintaining a worker
- Still requires users to provide their API keys (BYOK model)

## Setup Instructions

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Create KV Namespace

```bash
wrangler kv:namespace create "RATE_LIMITER"
```

This will output something like:

```
{ binding = "RATE_LIMITER", id = "abc123..." }
```

### 4. Update wrangler.toml

Edit `wrangler.toml` and update the KV namespace ID:

```toml
[[kv_namespaces]]
binding = "RATE_LIMITER"
id = "abc123..."  # Replace with your actual ID from step 3
```

### 5. Deploy Worker

```bash
wrangler deploy
```

The worker will be deployed to a URL like:

```
https://boltforge-llm-relay.your-account.workers.dev
```

### 6. Configure in BoltForge

1. Open BoltForge in your browser
2. Scroll down to the "Advanced Settings" section
3. Enable "LLM Relay"
4. Enter your worker URL (e.g., `https://boltforge-llm-relay.your-account.workers.dev`)
5. Click "Test Connection" to verify
6. Click "Save"

## Usage

Once configured, all LLM requests will be routed through your relay worker instead of going directly from the browser to the LLM provider.

The relay forwards requests with this flow:

```
Browser → Relay Worker → LLM Provider (OpenRouter/Anthropic/etc.)
          ↓
       Rate Limit Check
       Log Scrubbing
```

## Rate Limits

Default limits (configurable in `llm-relay.ts`):

- 100 requests per minute per IP
- Tracked using Cloudflare KV

## Security

- API keys are passed in request body, never stored
- All logs scrub sensitive data (keys, tokens, secrets)
- CORS headers allow browser requests
- Rate limiting prevents abuse

## Monitoring

View logs in Cloudflare dashboard:

```bash
wrangler tail
```

## Cost

Cloudflare Workers Free Tier includes:

- 100,000 requests/day
- 10ms CPU time per request
- KV: 100,000 reads/day, 1,000 writes/day

This is sufficient for personal/small team use. For higher usage, see [Cloudflare Workers Pricing](https://workers.cloudflare.com/).

## Customization

### Add Custom Provider

Edit `llm-relay.ts` and add to `providerEndpoints`:

```typescript
const providerEndpoints: Record<string, string> = {
  // ... existing providers
  "my-provider": "https://api.my-provider.com/v1/chat/completions",
};
```

### Adjust Rate Limits

Edit the `RATE_LIMIT` constants in `llm-relay.ts`:

```typescript
const RATE_LIMIT = {
  MAX_REQUESTS: 200, // Increase to 200 requests
  WINDOW_MS: 60 * 1000, // Per 1 minute
};
```

### Add IP Allowlist

Add security check in the `fetch` handler:

```typescript
const allowedIPs = ["1.2.3.4", "5.6.7.8"];
if (!allowedIPs.includes(ip)) {
  return new Response("Unauthorized", { status: 403 });
}
```

## Troubleshooting

### "Module not found" error

Make sure TypeScript dependencies are installed:

```bash
npm install --save-dev @cloudflare/workers-types
```

### CORS errors

The worker includes CORS headers by default. If still seeing errors, check that you're using the correct worker URL.

### Rate limit too restrictive

Increase limits in `llm-relay.ts` or implement user-specific limits using authentication.

## Alternative: Direct Requests (No Relay)

By default, BoltForge makes direct requests from browser to LLM providers. This works fine for most use cases and requires no server setup. The relay is completely optional.
