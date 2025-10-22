# BoltForge – Free-to-Run AI Coding Environment

**One-liner:** Prompt, run, edit, and ship full‑stack apps in your browser. $0 infra by default; users bring their own LLM keys (BYOK). Bolt.diy–compatible philosophy with a Shadcn-based, WCAG‑compliant UI.

---

## 1) Overview

**Why:** Developers want an AI coding workbench that is fast, hackable, and _free to run_ (no recurring infra cost)—while remaining LLM‑agnostic and future‑proof.

**What:** A browser‑first coding environment with integrated Chat→Code, Monaco editor, diffs, terminal, sandbox preview, Git/GitHub, and one‑click static deploys. Only variable expense is LLM usage via BYOK.

**Scope:** Feature‑parity targets with bolt.diy where feasible, but implemented to avoid vendor lock‑in and paid SaaS dependencies.

---

## 2) Problem / Opportunity

- Existing AI coding tools often require paid hosting, store secrets server-side, or lock users into a single LLM.
- Teams need a local‑feeling, zero‑install experience with transparent costs and safe sandboxing.
- Educators and indie devs want something deployable on GitHub/Cloudflare Pages with optional Workers for small callbacks only.

**Opportunity:** A modern, free‑to‑run coding environment that still feels like a real IDE + assistant.

---

## 3) Vision & Goals

- **Infra $0:** Static hosting (GitHub Pages / Cloudflare Pages). Optional tiny Workers on free tier.
- **LLM‑agnostic:** Pluggable providers: OpenRouter, Groq, Ollama/LM Studio (local), Anthropic Claude Code, GPT‑5 Codex, etc.
- **Local‑first UX:** In‑browser terminal + sandbox preview; files in OPFS/IndexedDB by default.
- **Secure by default:** BYOK only; strict CSP; sandboxed iframe; no server secrets.
- **Delightful UI:** Shadcn + Tailwind, Bento grid, progressive blur, keyboard-first nav, WCAG 2.1 AA.

---

## 4) Stakeholders & Users

- Indie devs, hackathon teams, students, internal tool prototypers.
- Secondary: OSS contributors and template authors.

---

## 5) Glossary

- **BYOK:** Bring Your Own (LLM) Key. Secrets live client‑side unless user opts into sync.
- **OPFS:** Origin Private File System (browser persisted file storage).
- **Provider:** An LLM integration defined by a `ProviderDefinition` + `ProviderAdapter` implementation.

---

## 6) Functional Requirements

### 6.1 Prompt → Code

- Chat panel with model picker per message (supports images/files as attachments).
- “Apply changes” creates/edit files; Diff approval step; rollback to snapshot.
- Token/cost estimate in header; streaming responses; stop/undo.

### 6.2 Workspace & Files

- File tree, create/rename/delete; Monaco editor (TS/JS/JSON/MD + extensions).
- Diff view (inline + side‑by‑side). File locking to prevent race writes.
- Search across project; multi‑cursor, format on save; keyboard shortcuts.
- Snapshots (named savepoints) + project export to ZIP.
- Import from Git URL; push to GitHub (optional OAuth Worker).

### 6.3 Run & Preview

- Integrated terminal (bounded buffer, clear/kill actions).
- Sandbox preview iframe, live reload; logs piping back to Terminal panel.
- Templates gallery (React/Vite, Next.js, Vue, Astro, Remix, Expo app stub).

### 6.4 Providers (BYOK) – **Extensible LLM Registry**

- Provider Manager UI: list, enable/disable, add new provider, validate key.
- Support for: OpenRouter, Groq, Anthropic Claude Code, GPT‑5 Codex (placeholder), Ollama/LM Studio local endpoints, and arbitrary custom providers via form.
- Credentials stored client‑side (WebCrypto encrypted). Optionally sync via user opt‑in to Cloudflare KV bound to their login (if using OAuth).

### 6.5 Deploy

- Presets for GitHub Pages, Netlify, Vercel. Basic build log/status.
- Deploys triggered from UI, with guidance for static exports and SPA routing.

---

## 7) Nonfunctional Requirements

- **Performance:** <200 ms UI affordance latency; first preview for template <30 s on typical laptop.
- **Reliability:** Recover unsaved changes after refresh; snapshot restoration.
- **Accessibility (WCAG 2.1 AA):** 4.5:1 contrast, keyboard access, visible focus, 44×44 targets.
- **Privacy:** Keys never sent to server unless user explicitly enables proxy sync.
- **Cost:** $0 infra by default; only LLM usage costs.

---

## 8) Detailed UI/UX – Design System Specification (DSS)

**Framework & style:** React + TypeScript, Tailwind, Shadcn UI.  
**Aesthetic mandates:** Bento Grid, progressive blur backdrop; soft card shadows; reduced motion option.

### 8.1 Canonical Shell (Reference Implementation)

- `SidebarProvider`, `AppSidebar`, `SidebarInset`
- Header with `SidebarTrigger`, `Breadcrumb`, action buttons (Save/Branch/Run).
- Main Bento grid: **Editor** (Monaco), **Chat**, **Preview**, **Terminal**.
- Progressive blur background layer (non‑essential, must pass contrast checks).
- Skip link to main; aria‑labels on icon buttons; `aria-live="polite"` for long ops.

> **Note:** The full Page.tsx shell from the design prototype is the canonical reference for layout and accessibility. Panels may become resizable using a drag handle component.

### 8.2 Design‑by‑Contract (Component Contracts)

- `PromptInput`: requires non‑empty `text | attachments[]`; emits `{model, params, attachments}`.
- `DiffView`: immutable props `{before, after}`; exposes `getSelectedHunks()`.
- `ProviderCard`: prevents enable without required credentials; shows validation state.
- `Terminal`: bounded buffer; `clear()`, `kill()`; back‑pressure when overflowing.
- `SplitPane`: reports size; persists to localStorage; keyboard accessible resizing.

### 8.3 Accessibility Checklist

- Skip link, labeled `nav` for breadcrumbs, semantic headings.
- All icon buttons have `aria-label` or are `aria-hidden` if decorative.
- Focus traps inside modals; ESC to close; `aria-describedby` for confirmations.
- High contrast tokens for dark/light themes; minimum font size 14px.

---

## 9) Design System Component Map (Shadcn)

| Area                | Components                                                                                    | Purpose                                     |
| ------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------- |
| App Shell           | `SidebarProvider`, `AppSidebar`, `SidebarInset`, `SidebarTrigger`, `Breadcrumb*`, `Separator` | Global layout, navigation and page context  |
| Quick Actions Bento | `Card`, `CardHeader`, `CardContent`, `Button`, `Input`, `Badge`, `Select*`                    | New Project, Import Git, Provider selection |
| Editor              | `Tabs*`, `ScrollArea`, `Card*`                                                                | Monaco mount, Diff, Files list              |
| Chat                | `Textarea`, `Badge`, `Button`, `ScrollArea`, `Card*`                                          | Prompt + assistant stream                   |
| Preview             | `Card*`                                                                                       | Iframe preview with strict CSP              |
| Terminal            | `Card*`, `Button`                                                                             | Logs/commands; clear/kill                   |
| Modals/Drawers      | `Dialog*`, `Sheet*`, `Form` (with `zod`)                                                      | Provider Manager, Confirmations             |
| Feedback            | `Toast`, `Alert`                                                                              | Errors, success, long‑running ops           |

---

## 10) Backend Architecture & Quality Specifications

### 10.1 Stack (minimal, free)

- **Frontend:** React + TS + Vite, Tailwind + Shadcn, Monaco editor.
- **Storage:** IndexedDB + OPFS for projects; cookies/localStorage for provider entries (encrypted).
- **Serverless (optional):** Cloudflare Workers for:
  1. GitHub OAuth callback & repo push,
  2. Deploy status polling,
  3. Optional LLM relay (disabled by default; forwards user‑provided token only).

### 10.2 Extensible LLM Registry

**Schema (zod validated):**

```ts
type AuthType = "apiKey" | "bearer" | "oauth" | "none";

interface ModelSpec {
  id: string; // e.g., "claude-code-3.5", "gpt-5-codex"
  maxTokens?: number;
  inputCostPerMTokUSD?: number;
  outputCostPerMTokUSD?: number;
  supportsVision?: boolean;
  supportsTools?: boolean;
}

interface ProviderDefinition {
  id: string; // slug
  name: string; // display
  baseUrl: string; // https://api.example.com
  auth: { type: AuthType; keyName?: string }; // header key, e.g., "x-api-key"
  headers?: Record<string, string>;
  models: ModelSpec[];
}
```

**Adapter interface:**

```ts
export interface ProviderAdapter {
  /** Validate creds by performing a cheap call (e.g., list models). */
  validate(
    def: ProviderDefinition,
    creds: string,
  ): Promise<{ ok: boolean; message?: string }>;
  /** Stream chat/completions in a provider-native shape, emitted as SSE or chunks. */
  stream(
    def: ProviderDefinition,
    creds: string,
    payload: ProviderPayload,
  ): AsyncIterable<DeltaChunk>;
  /** Optional tools / image input / JSON mode mapping. */
  capabilities(def: ProviderDefinition): CapabilitySet;
}
```

**Storage:**

- Client‑side by default (WebCrypto encrypt → localStorage/OPFS).
- Optional sync: encrypted blob per user via Cloudflare KV after OAuth.

**Security:**

- No server‑side secret storage by default.
- If relay is enabled, it _must_ require the user‑provided token on each request and never persist it; rate limit and scrub logs.

### 10.3 OpenAPI (Edge Worker)

```yaml
openapi: 3.0.3
info:
  title: BoltForge Edge
  version: 0.1.0
paths:
  /oauth/github/callback:
    get:
      summary: GitHub OAuth (PKCE)
      parameters:
        - in: query
          name: code
          required: true
          schema: { type: string }
        - in: query
          name: state
          required: true
          schema: { type: string }
      responses:
        "302": { description: Redirect with short-lived token }
        "400": { description: Invalid state/code }
  /deploy/{provider}/start:
    post:
      summary: Kick off a deploy
      parameters:
        - in: path
          name: provider
          required: true
          schema: { enum: [github-pages, netlify, vercel] }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                repoUrl: { type: string }
                branch: { type: string }
      responses:
        "200": { description: Build queued }
        "400": { description: Validation error }
  /llm/relay:
    post:
      summary: Optional key-forwarding relay (BYOK only)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                provider: { type: string }
                model: { type: string }
                userToken: { type: string }
                messages: { type: array, items: { type: object } }
      responses:
        "200": { description: Stream started }
        "401": { description: Missing/invalid token }
        "429": { description: Rate limited }
```

### 10.4 Concurrency, Limits, and Resource Controls

- Worker timeouts 10–30s; stream results; cancel on client abort.
- Payload limit 1 MB; per‑IP rate limit; exponential backoff on provider 429/5xx.
- Terminal output capped to N lines; drop oldest lines when exceeding cap.
- File locks during apply‑diff to avoid concurrent write conflicts.

### 10.5 Security Gates

- **Input Validation:** zod validation for all forms and API payloads.
- **Output Encoding:** HTML encode any rendered content; sanitize preview iframe with strict CSP `sandbox` and allow‑list origins.
- **Auth:** OAuth state/nonce + PKCE; HttpOnly+Secure cookies where applicable.
- **LLM Safety:** TOS adherence; user-visible provider limits; content filters optional.

---

## 11) Data Model (Client‑First)

```ts
type FileEntry = { path: string; contents: string; updatedAt: number };
type Snapshot = {
  id: string;
  label: string;
  createdAt: number;
  files: FileEntry[];
};

type Project = {
  id: string;
  name: string;
  createdAt: number;
  files: FileEntry[];
  snapshots: Snapshot[];
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  attachments?: string[];
  ts: number;
};
type ChatThread = {
  id: string;
  projectId: string;
  providerId: string;
  modelId: string;
  messages: ChatMessage[];
};

type ProviderKey = {
  providerId: string;
  encrypted: string;
  storedAt: number;
  validated?: boolean;
};
type ProviderRegistry = ProviderDefinition[];
```

---

## 12) CI/CD & Quality

- **CI:** GitHub Actions → Typecheck, ESLint, unit tests (Vitest), E2E (Playwright).
- **Security scanning:** `npm audit`, OSV, and `dep check` step on PRs.
- **Precommit:** `lint-staged` + `prettier` to enforce consistent style.
- **Release:** Tag + changelog; Pages/Workers deploy via Actions.

---

## 13) TDD Strategy

- **Unit:** Provider adapters (validate/stream), Diff engine, File store.
- **Contract tests:** ProviderAdapter compliance suite with mocked responses.
- **E2E:** Prompt→Diff→Apply→Preview flows; Git import; Deploy to GH Pages dry‑run.
- **Accessibility tests:** Axe checks on critical screens; keyboard nav snapshots.

---

## 14) Roadmap & Phases

**Phase 0 (Seed):**

- App shell (Shadcn) + Bento; persist layout; Provider Manager (OpenRouter + Ollama).
- Project store (OPFS/IndexedDB); ZIP export/import.
- Monaco code editor (lazy‑load).

**Phase 1 (Run & Diff):**

- Diff approval pipeline; file lock; search; snapshots.
- Terminal + sandbox preview; CSP + postMessage bridge.

**Phase 2 (Git & Deploy):**

- GitHub OAuth Worker; import/push; deploy presets for GH Pages/Netlify/Vercel.

**Phase 3 (LLM Extensibility):**

- Add Anthropic Claude Code, Groq, GPT‑5 Codex placeholder, custom provider UI + schema validation.

**Phase 4 (Polish & Desktop optional):**

- Resizable splits; command palette; offline caching; Electron packaging.

---

## 15) Risks & Mitigations

- **Provider churn:** Thin adapters; feature flags per capability.
- **Free tier quotas:** Prefer GH Pages; degrade to manual deploy instructions.
- **Key exposure:** Client‑side only by default; relay opt‑in with strict scrubbing.
- **Browser OPFS variability:** Graceful fallback to IndexedDB; detect support.

---

## 16) “Vibe Coding” Prompt Guide (Give to Your LLM)

**Core System Prompt (pasted once at session start):**

> You are a Senior Full‑Stack Pair‑Programmer optimizing for simplicity, accessibility (WCAG 2.1 AA), and zero‑cost infra. Follow Design‑by‑Contract for components. Never introduce paid SaaS. Use Shadcn components, Tailwind, and Monaco. Keep provider adapters thin and validated with zod. Generate code that is deterministic, typed, and testable. All preview iframes must use strict CSP and sandbox attributes. When in doubt, prefer client‑side and BYOK.

**Task Prompt Template (per feature):**

```
Goal: <what we’re building>
Context: BoltForge (React+TS+Vite, Shadcn, Monaco, OPFS), BYOK providers.
Requirements:
- Follow DSS and component contracts.
- Add aria-labels; ensure 4.5:1 contrast; keyboard access.
- Write code + 3–5 unit tests (Vitest).
- If adding a provider, implement ProviderAdapter and add zod validation.
Return: code blocks for .tsx/.ts, plus tests, plus any migration notes.
```

**Examples:**

_Add a new provider (Anthropic Claude Code) with API key auth_

```
Create ProviderDefinition { id: "anthropic", name: "Anthropic Claude Code", baseUrl: "https://api.anthropic.com" }
Auth: { type: "apiKey", keyName: "x-api-key" }
Models: ["claude-code-3.5"]
Implement ProviderAdapter.validate() via /models list or a 200 ping.
Implement stream() mapping to provider’s SSE/chunk format.
UI: ProviderCard with Add Key, Validate button, status badge.
Tests: mock fetch; validate zod schema; stream happy path + 401.
```

_Generate a Monaco-backed Diff tab_

```
Implement <DiffView> using monaco.editor.createDiffEditor.
Props: { before: string; after: string }
No global mutable state. Provide getSelectedHunks().
Accessibility: ensure focusable container; keyboard shortcuts documented.
```

_Sandbox CSP policy_

```
Iframe attributes: sandbox="allow-scripts allow-downloads" referrerpolicy="no-referrer"
CSP: default-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src data:; connect-src 'self';
PostMessage bridge with structured cloning; deny eval in user code.
```

**LLM Don’ts:**

- Don’t add paid dependencies or hosted DBs.
- Don’t store secrets server‑side unless explicitly asked to.
- Don’t bypass type checks or tests.
- Don’t reduce contrast or remove keyboard support.

---

## 17) Acceptance Criteria (MVP)

- Create project → edit file → run preview → apply AI change → see diff → deploy to GH Pages.
- Add a new provider via UI form; validate key; use it in a chat that edits code.
- All critical flows are keyboard‑navigable and pass automated Axe checks.
- No network calls contain secrets unless user opted in to relay.

---

## 18) Appendix – Example Provider Form Fields

- Provider Name (text)
- Base URL (url)
- Auth Type (select: apiKey | bearer | oauth | none)
- API Key / Token (password)
- Default Models (multi‑select)
- Header Key Name (text, e.g., `x-api-key`)
- Custom Headers (key:value list)
- Test Connection (button → validate())

---

_End of PRD_
