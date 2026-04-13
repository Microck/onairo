# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-16

### Added

- Initial public release of Onairo browser extension (Chromium MV3)
- Core relay loop: grab content from browser → send to AI provider → return answer
- Input flows: selected text, clipboard text, clipboard image, right-click image, A-to-B capture
- Hosted AI providers: Kimi, OpenRouter, Z.ai, custom OpenAI-compatible endpoints
- Local provider: Codex CLI via Chromium native-messaging bridge
- Output actions: copy, paste, simulated typing, tooltip display, top-right answer overlay
- Popup UI with provider selection and quick-send
- Full settings/options page with live previews for selection styling and output shape
- Native messaging host for Codex bridge (`native-host/onairo-codex-host.mjs`)
- Install script for native host registration (`native-host/install-host.mjs`)
- React 19 + TypeScript 5 + Tailwind CSS + shadcn/ui component stack
- Vitest test suite with initial provider and prompt tests
- ESLint configuration with React hooks and React Refresh plugins
- MIT license
