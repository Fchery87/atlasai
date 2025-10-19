# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2025-10-19

Added
- Security scripts:
  - `npm run security` runs `npm audit` and OSV scanner (`npx osv-scanner -r .`)
  - `npm run security:fix` runs `npm audit fix` (non-force)
- Updated Husky prepare script to avoid deprecation warning (`prepare`: `husky`).
- Documentation:
  - `instruction.md` with complete setup instructions
  - Updated `task.md` to reflect completed features (attachments, stop streaming, undo/redo, templates, custom provider form with encrypted headers, SPA routing helpers)

Notes
- If `npm audit` reports moderate vulnerabilities in transitive deps, prefer targeted upgrades and verify compatibility rather than using `--force`.
- OSV scanning requires network access; ensure corporate proxies allow it if used behind a firewall.

## [0.1.0] - Initial release

- Project scaffolding and core features as per PRD.