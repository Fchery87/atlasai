# BoltForge PRD Task Tracking

Legend:
- [x] Completed
- [~] Partially complete / scaffolded
- [ ] Not started

## 1) Overview / Vision (Docs)
- [x] PRD defined and committed
- [x] Project scaffolding: React + TS + Vite + Tailwind + Shadcn-style components
- [x] BYOK philosophy and local-first posture reflected in architecture

## 6) Functional Requirements

### 6.1 Prompt → Code
- [x] Chat panel UI
  - [x] Model picker per message
  - [ ] Attachments (images/files)
  - [x] Streaming responses (wired to providers)
  - [ ] Token/cost estimate in header
  - [ ] Stop/undo controls
- [x] Diff approval step for changes generated (manual and snapshot-driven)
- [x] Rollback via snapshots

### 6.2 Workspace & Files
- [x] File tree: create/rename/delete
- [x] Virtual folders, inline new file/folder, rename, delete
- [x] Multi-select (Shift/Ctrl/Cmd), Select All, rubber-band selection
- [x] Keyboard navigation: Enter, F2, Delete/Backspace, Ctrl/Cmd+N, Arrow keys, Shift+Arrow
- [x] Monaco editor (TS/JS/JSON/MD + CSS/HTML; YAML supported)
- [x] Format on save (Prettier: JS/TS/HTML/CSS/MD/YAML)
- [x] “Format Document” action
- [x] Diff view via Monaco DiffEditor (side-by-side)
- [x] File locking during approve
- [x] Search across project
- [x] Snapshots: create/list/preview diffs/selective apply/restore
- [x] Project export/import ZIP
- [x] Import from Git URL
- [x] Push to GitHub (OAuth + contents/tree APIs, updates and deletes, .gitignore handling)

### 6.3 Run & Preview
- [x] Terminal panel with bounded buffer and Clear
- [x] Preview iframe with strict sandbox and CSP
- [x] Console proxy postMessage bridge to Terminal
- [~] Live reload preview (updates on file changes; improve debounce/config later)
- [ ] Templates gallery (React/Vite, Next.js, Vue, Astro, Remix, Expo)

### 6.4 Providers (BYOK) – Extensible LLM Registry
- [x] Provider types (zod) and adapter interface
- [x] Provider Manager UI with key validate/save/clear (encrypted WebCrypto)
- [x] OpenRouter adapter
- [x] Ollama adapter
- [x] Groq adapter
- [x] Anthropic Claude Code adapter
- [x] GPT‑5 Codex placeholder adapter
- [ ] Custom provider form (from schema)
- [x] Credentials stored client-side encrypted; optional sync via OAuth not implemented

### 6.5 Deploy
- [x] Presets for GitHub Pages / Netlify / Vercel (UI + status/logs)
- [x] Provider-specific deploy flows and logs
  - GitHub Pages: upload to gh-pages; CI workflow provided
  - Netlify: hash-based incremental uploads
  - Vercel: project linking + config, then deployment request
- [ ] SPA routing guidance and steps

## 7) Nonfunctional Requirements
- [~] Performance: lazy Monaco; Prettier parsers lazy; further profiling TBD
- [x] Reliability: snapshots; local IndexedDB persistence
- [x] Accessibility (WCAG 2.1 AA): ARIA labels; keyboard-first flows; Axe E2E checks across core interactions
- [x] Privacy: BYOK only; encrypted storage; no server secrets by default
- [x] Cost: $0 infra default

## 8) Detailed UI/UX – DSS
- [x] Canonical shell with Bento grid (Header, Editor, Chat, Preview, Terminal)
- [ ] Resizable panes (SplitPane with persisted sizes)
- [x] Skip link and aria labels; breadcrumbs; aria-live on terminal output
- [~] Component contracts: DiffView minimal; PromptInput and SplitPane contracts pending

## 9) Design System Component Map (Shadcn)
- [x] Core UI (Card, Button, Input, Separator, etc.)
- [ ] Full Shadcn CLI component set and advanced patterns (Tabs, Dialogs, Sheets)

## 10) Backend Architecture & Quality Specifications
- [x] Storage: IndexedDB projects, encrypted localStorage for provider keys
- [x] Serverless Worker: GitHub OAuth code exchange (PKCE) with CORS
- [x] Deploy status polling endpoint
- [ ] Optional LLM relay (BYOK-forwarding) with rate-limiting and scrubbing

## 12) CI/CD & Quality
- [x] GitHub Actions CI: typecheck, lint, unit tests, build, Playwright E2E
- [x] GitHub Pages workflow: build and deploy dist/ to Pages
- [ ] Security scanning: npm audit/OSV/dep check on PRs
- [ ] Precommit hooks: lint-staged + prettier
- [ ] Release: tag + changelog; Pages/Workers deploy via Actions

## 13) TDD Strategy
- [x] Unit: crypto keys test, project store diffs/snapshots
- [x] Unit: provider adapter tests (existing + new providers)
- [x] Unit: deploy and git helpers (zip pack, sha1, delete calc)
- [x] E2E: smoke test; Axe accessibility tests on home, palette, snapshots, integrations
- [ ] E2E: Prompt→Diff→Apply→Preview flow
- [ ] Contract tests: ProviderAdapter compliance suite

## 14) Roadmap & Phases

Phase 0 (Seed)
- [x] App shell + Bento
- [x] Provider Manager (OpenRouter + Ollama) with encrypted persistence
- [x] Project store (IndexedDB); ZIP import/export
- [x] Monaco editor (lazy load)

Phase 1 (Run & Diff)
- [x] Diff approval pipeline; file lock
- [x] Search
- [x] Snapshots (create/restore, diff preview, selective apply)
- [x] Terminal + sandbox preview; CSP + postMessage bridge
- [x] Accessibility polish; keyboard shortcuts; Axe CI

Phase 2 (Git & Deploy)
- [x] GitHub OAuth Worker exchange (PKCE)
- [x] Git import/push (with deletes, .gitignore, encrypted config)
- [x] Deploy presets (GH Pages, Netlify hash-based, Vercel link+config) with logs
- [x] GH Pages CI workflow
- [x] Deploy status polling endpoint (optional)

Phase 3 (LLM Extensibility)
- [x] Additional providers (Groq, Anthropic Claude Code, GPT‑5 placeholder)
- [ ] Custom provider form w/ zod schema validation

Phase 4 (Polish & Desktop)
- [ ] Resizable split panes with persistence
- [x] Command palette
- [ ] Offline caching / PWA
- [ ] Optional Electron packaging

## 17) Acceptance Criteria (MVP)
- [~] Create project → edit file → run preview → apply AI change → see diff → deploy to GH Pages
  - Current status: Chat can stream and stage diffs; manual approve applies; GH Pages deploy workflow present. Add E2E to demarcate end-to-end.
- [x] Add provider via UI; validate key; use it in a chat that edits code
- [x] Critical flows keyboard-navigable; Axe checks pass for main screen and key interactions
- [x] No server-side secret storage by default

## Summary
- Phase 0 and Phase 1: COMPLETE.
- Phase 2: COMPLETE (OAuth exchange, Git import/push, deploy flows, GH Pages CI, optional deploy-status polling worker and UI).
- Phase 3: Additional providers integrated; custom provider form pending.
- Remaining polish: Split panes, templates gallery, security scanning in CI, precommit hooks, full E2E Prompt→Diff→Apply flow, custom provider schema form.