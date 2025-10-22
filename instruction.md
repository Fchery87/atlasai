# BoltForge Setup and Usage Instructions

This document describes all dependencies and complete instructions to install, develop, test, and deploy the BoltForge project.

## Prerequisites

- Node.js 20.x (recommended) and npm
  - We use actions/setup-node@v4 targeting Node 20 in CI.
- Git (optional, for pushing/importing to GitHub)
- For E2E tests:
  - Playwright browsers installed (chromium, webkit, firefox)
- Optional:
  - Cloudflare account for Workers (OAuth relay and deploy status polling)
  - Netlify and Vercel accounts for deploy integrations

## Dependencies

Runtime dependencies (from package.json):

- react, react-dom
- zod (schema validation)
- @monaco-editor/react, monaco-editor
- zustand (state store)
- class-variance-authority, clsx, tailwind-merge (UI helpers)
- jszip (ZIP import/export)

Dev dependencies:

- typescript
- vite, @vitejs/plugin-react
- tailwindcss, postcss, autoprefixer
- eslint, @typescript-eslint/\*, eslint-config-prettier, eslint-plugin-react-hooks, globals
- vitest, @vitest/coverage-v8
- @playwright/test
- @axe-core/playwright (accessibility E2E)
- prettier
- husky, lint-staged

Cloudflare Workers (optional):

- wrangler (installed globally or via npx)

## Installation

1. Install project dependencies

- npm install
  - In CI we use `npm ci` for reproducible installs; you can use it locally if desired.

2. Initialize Husky precommit hooks (optional, recommended)

- npm run prepare
  - This runs Husky setup and enables the `.husky/pre-commit` hook to run lint-staged.

3. Install Playwright browsers for E2E tests (optional)

- npx playwright install --with-deps

4. (Optional) Run security checks locally

- npm run security
  - Runs `npm audit` and OSV scanner over the repo
- npm run security:fix
  - Attempts to fix issues automatically (non-force). Review changes before committing.

## Development

Start the dev server (Vite):

- npm run dev
- The app runs at http://localhost:5173 by default.

Tailwind

- Tailwind is configured via tailwind.config.ts and postcss.config.js.
- Styles are imported in src/index.css; Tailwind classes are used in components.

Monaco Editor

- Monaco is lazy-loaded by @monaco-editor/react; editor and diff editor are integrated in EditorPanel and DiffPanel.

## Project Features and Flow

- Workspace
  - Create/open projects, manage files/folders in the FileTree.
  - Edit with Monaco; Format on Save (Prettier) is supported for JS/TS/HTML/CSS/MD/YAML.
  - Search across project files. Snapshots allow diff preview and selective restore.
  - Preview panel renders sandboxed iframe with strict CSP and console proxy to Terminal.

- Prompt → Diff → Apply
  - Chat panel supports provider and model selection, per-message context from current file, attachments (text/code, optional images for vision-capable providers).
  - Streaming output renders in markdown, with code copy buttons.
  - Stage the AI output to a target file; approve or reject via the Diff panel.
  - Undo/Redo available for last applied change. Stop button aborts streaming via AbortController.

- Providers (BYOK)
  - Providers: OpenRouter, Ollama (local), Groq, Anthropic Claude, GPT‑5 placeholder.
  - Provider Manager lets you validate and securely save keys (encrypted via WebCrypto).
  - Custom provider form (OpenAI-compatible) with zod validation and support for encrypted custom headers.
  - Built-in overrides and duplicate actions available for quick scaffolding.

- Deploy
  - GitHub Pages, Netlify, Vercel integrations from DeployPanel.
  - GitHub Pages CI workflow generator; Netlify hash-based deploys; Vercel project link/config + deploy.
  - SPA helpers: add GH Pages 404.html, Netlify \_redirects, Vercel rewrites.
  - Optional deploy status polling via Cloudflare Worker.

- Git Integration
  - GitHub OAuth (Cloudflare Worker PKCE exchange).
  - Import repo (zipball), push contents (create/update/delete) using Contents/Trees API.
  - Encrypted credential storage per project.

- Resizable Layout
  - SplitPane supports persisted sizes and keyboard resizing (Arrow keys).
  - Reset via Command Palette or header “Reset Layout” button.

## Commands

- Development: `npm run dev`
- Build: `npm run build`
- Preview build: `npm run preview`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Unit tests: `npm test` (vitest run)
- E2E tests: `npm run e2e` (requires Playwright browsers installed)
- Initialize Husky: `npm run prepare`

## Precommit Hooks

Configured via:

- package.json: `"prepare": "husky install"`
- `.husky/pre-commit` runs `lint-staged`
- lint-staged:
  - Prettier format on `*.{ts,tsx,js,jsx,json,css,md,yml,yaml}`
  - ESLint fix on `*.{ts,tsx,js,jsx}`

## CI Workflows

- .github/workflows/ci.yml
  - On push/PR to main: checkout, Node 20, npm ci, typecheck, lint, unit tests, build, Playwright E2E
- .github/workflows/gh-pages.yml
  - Build and deploy dist/ to GitHub Pages
- .github/workflows/security.yml
  - npm audit (high+), OSV scanner; runs on push/PR and weekly schedule

## Cloudflare Workers (Optional)

OAuth Worker (GitHub)

- workers/oauth/wrangler.toml and workers/oauth/src/index.ts
- Purpose: PKCE OAuth code exchange; enables client-only BYOK with GitHub import/push.

Deploy Status Worker

- workers/deploy-status/wrangler.toml and workers/deploy-status/src/index.ts
- Purpose: status polling endpoints for Netlify/Vercel with CORS.

Deploying Workers

- Install wrangler: `npm install -g wrangler` or use `npx wrangler`
- Configure secrets:
  - For OAuth Worker: `wrangler secrets put GITHUB_CLIENT_ID`, `wrangler secrets put GITHUB_CLIENT_SECRET`
- Publish:
  - `npx wrangler deploy` (run inside each worker directory)

## Provider Keys (Encrypted Storage)

Provider Manager uses WebCrypto AES-GCM to encrypt/decrypt:

- Keys saved per provider id via saveProviderKey/loadProviderKey
- Custom headers saved under `sec_provider_headers:<providerId>` encrypted
- UI hints and help toggles are also saved encrypted per project or globally.

## Deploy Targets

GitHub Pages

- Provide `owner/repo`, sign in via GitPanel using OAuth Worker URL + Client ID.
- Click Deploy to push files to `gh-pages`.
- Use “Download GH Pages Workflow” to add CI build/deploy automation.

Netlify

- Provide token and site ID.
- Uses hash-based deployment; uploads only required files.
- Optional status polling via Deploy Status Worker.

Vercel

- Provide token and project name.
- Creates or patches project settings (framework/build/output) and requests deployment.
- Optional status polling via Deploy Status Worker.

SPA Routing Helpers

- In DeployPanel, buttons to add:
  - GitHub Pages 404.html → redirects 404s to index.html with path preserved in hash.
  - Netlify `_redirects` → `/* /index.html 200`
  - `vercel.json` rewrites → `/ (.*) -> /`

## Accessibility

- Axe accessibility tests using @axe-core/playwright in E2E tests.
- Keyboard navigation throughout (Files, Editor, SplitPane handles, Command Palette).
- ARIA labels and aria-live regions for dynamic content.

## Troubleshooting

- Playwright E2E fails due to missing browsers:
  - Run `npx playwright install --with-deps`
- Local OAuth/Workers:
  - Ensure Workers are deployed and environment variables/secrets are set.
  - Verify CORS headers and redirect URIs configured correctly.

## License and Security

- Client-only BYOK; no server-side secret storage by default.
- Custom provider headers and keys encrypted in localStorage.
- Security CI workflow runs npm audit and OSV scanning.

## Questions or Help

- Refer to PRD.md for detailed product requirements.
- See task.md for current completion status and roadmap.
- Open issues for any missing behaviors or desired enhancements (e.g., PWA/Electron, LLM relay, extended template catalog).
