# Nightshift: Doc Drift Detector

**Repo:** Microck/onairo
**Date:** 2026-04-05
**Task:** doc-drift
**Category:** analysis

## Summary

The README accurately reflects the extension's core purpose and install flow. However, several implemented features are undocumented or under-documented, and the `docs/` directory contains only a `github-prep.md` with no user-facing documentation for the features discovered in code.

---

## Findings

### P1 — Multiple input/output modes undocumented

**Files:** `src/content/index.ts`, `src/types/messages.ts`

The README describes the extension as a "quiet browser relay for one-shot AI workflows" but does not document the specific input/output modes the extension supports.

**Implemented input modes (from `RuntimeMessage` types):**
- `selectedText` — select text on page, trigger via hotkey
- `clipboardText` — read clipboard text
- `clipboardImage` — read clipboard image
- `contextImage` — hovered image on page
- `captureArea` — screen region capture with drag-select overlay

**Implemented output modes (from `PageAction` type):**
- `pasteOutputText` — insert AI output at caret
- `typeOutputText` — simulated typing of AI output
- `copyOutputText` — copy to clipboard
- `showOutputTooltip` — floating tooltip overlay
- `showAnswerOverlay` — floating answer text with configurable style

None of these are documented in the README or any doc file.

**Recommendation:** Add a "Features" or "How to Use" section listing all input/output modes with their default hotkeys.

---

### P2 — Provider catalog partially undocumented

**Files:** `src/features/providers/catalog.ts`, `src/manifest.ts`

The manifest declares `host_permissions` for:
- `api.moonshot.ai` (Kimi/Moonshot AI)
- `openrouter.ai`
- `api.z.ai`

The README badge mentions "Codex native bridge" but does not explain which AI providers are supported, how to configure them, or that `api.z.ai` is included.

**Recommendation:** Document supported providers and their configuration in the README.

---

### P2 — Settings/options page undocumented

**Files:** `src/options/options-app.tsx`, `src/features/settings/schema.ts`

The extension has a full options page (`src/options/index.html`) with settings for:
- Hotkey customization (multiple hotkeys for input/output actions)
- Selection color customization (background color, text color, opacity)
- Overlay style (color, opacity, size, background box, shadow, animation, offsets)
- Behavior toggles (toasts enabled)

None of these settings are documented.

**Recommendation:** Add a "Configuration" section to the README covering the options page.

---

### P2 — Native host bridge undocumented

**Files:** `native-host/onairo-codex-host.mjs`, `native-host/install-host.mjs`

The `native-host/` directory contains a Codex native messaging host and an install script. The README mentions "Codex native bridge" in a badge but provides no setup instructions, no explanation of what the bridge does, and no reference to the install script.

**Recommendation:** Add a "Native Host Setup" section with installation steps and what the bridge enables.

---

### P3 — `docs/` directory contains only GitHub prep notes

**File:** `docs/github-prep.md`

The only documentation file is `github-prep.md`, which appears to be internal release preparation notes. There are no user-facing docs for features, settings, or architecture.

**Recommendation:** Either populate `docs/` with feature documentation or remove it and keep everything in the README for a project this size.

---

### P3 — Content script architecture not explained

**File:** `src/content/index.ts` (613 lines)

The content script is the largest file in the project and handles:
- Hotkey-based input triggers
- Screen capture overlay with drag-select
- Toast notifications
- Tooltip rendering
- Answer overlay with configurable animation
- Selection color customization
- Clipboard read (text and image)

None of this architecture is documented. The README's project structure section does not exist.

**Recommendation:** Add a brief architecture section explaining the popup/background/content script split.

---

## Metrics

| Metric | Value |
|--------|-------|
| Total source files | ~30 |
| Documentation files | 2 (README.md, docs/github-prep.md) |
| README length | ~115 lines |
| Documented features | 2 (install, dev setup) |
| Undocumented features | 8+ (input modes, output modes, providers, settings, native host, hotkeys, overlays, capture) |
| Doc-to-code ratio | Very low |

## Priority Summary

| Severity | Count | Category |
|----------|-------|----------|
| P0 Critical | 0 | — |
| P1 High | 1 | All input/output modes undocumented |
| P2 Medium | 3 | Providers, settings page, native host |
| P3 Low | 2 | Empty docs dir, architecture undocumented |

The README is good as a minimal install guide but needs a "Features" section and "Configuration" section to match the extension's actual capabilities. The 5 input modes and 5 output modes are the core value proposition and should be front and center.
