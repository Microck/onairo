# Test Gap Analysis Report — Onairo

**Generated:** 2026-04-03 · **Tool:** Nightshift v3 (GLM 5.1) · **Task:** test-gap

---

## Executive Summary

Onairo is a Chrome MV3 browser extension with 29 TypeScript source files (plus 2 native-host ESM scripts). The test suite contains **2 test files with 4 test cases total**, covering only a fraction of the codebase. The project's core business logic — question detection, language detection, prompt assembly, output post-processing, provider orchestration, settings merging, and the native host protocol — operates with **zero or near-zero test coverage**.

**Test-to-source ratio:** 2 test files / 29 source files = **6.9% file coverage**

The most critical gaps are in the prompting pipeline (`detectLanguage`, `buildSystemPrompt`, `stripMarkdownAndFiller`), the run engine (`executeInputRun`, `deriveEffectiveProfile`), the provider client (`runHostedProvider`, `runCodexBridge`, `flattenModelMessage`), and settings storage (`mergeSync`, `mergeLocal`, `getLastRun` expiration). These modules contain complex branching logic, regex-based parsing, and multi-step data transformations — exactly the kind of code that silently breaks without tests.

This report identifies **25 specific test gaps** ranked P0–P3 with actionable recommendations.

---

## Architecture Overview

| Layer | Files | Role |
|---|---|---|
| **Background** | `src/background/index.ts` | Service worker: message routing, context menus, run orchestration |
| **Content Script** | `src/content/index.ts` (613 lines) | Hotkeys, clipboard, capture overlay, toast/tooltip/overlay UI, typing simulation |
| **Providers** | `catalog.ts`, `client.ts` | Provider descriptors + HTTP/native API client |
| **Run Engine** | `engine.ts`, `prompting.ts` | Input processing, prompt assembly, output post-processing |
| **Settings** | `schema.ts`, `storage.ts` | Type definitions, defaults, Chrome storage wrappers |
| **UI** | `popup-app.tsx`, `options-app.tsx`, 10 shadcn components | React UIs for popup and options page |
| **Native Host** | `onairo-codex-host.mjs`, `install-host.mjs` | Native messaging bridge to Codex CLI |

---

## Existing Test Coverage

| File | Tests | What's Covered |
|---|---|---|
| `src/features/providers/catalog.test.ts` | 2 | Hosted providers are vision-capable; codex is text-only |
| `src/features/runs/prompting.test.ts` | 4 | `detectQuestionType` (1 case: multiple choice), `extractJsonAnswer` (1 case), `extractSingleLetterAnswer` (1 case: "Correct answer: C"), `postProcessOutput` (1 case: json single-answer) |

**Total: 6 test assertions across 2 files.**

---

## Findings

### Severity Scale

- **P0** — Critical: core business logic, complex branching, high breakage risk
- **P1** — High: important logic paths with moderate complexity
- **P2** — Medium: utility functions, integration points
- **P3** — Low: UI components, boilerplate

### Findings Table

| # | Severity | File | Line | Description | Recommendation |
|---|---|---|---|---|---|
| 1 | **P0** | `src/features/runs/prompting.ts` | 36-46 | `detectLanguage()` — Spanish/English heuristic scoring with threshold logic. Zero tests. Language misclassification silently degrades all prompt quality. | Test: English text → en-US, Spanish text → es-ES, mixed/ambiguous → profile fallback, autoLangDetect=false bypass |
| 2 | **P0** | `src/features/runs/prompting.ts` | 14-34 | `detectQuestionType()` — Only 1 test case (multiple choice). Missing: true/false patterns, fill-blank (`___`), short answer (`what is`), long technical text fallback. | Add 8-10 cases covering each branch: `[a-d]` patterns, `true/false`, `___` blanks, `what is X` <200 chars, long text → "technical" |
| 3 | **P0** | `src/features/runs/prompting.ts` | 154-179 | `extractSingleLetterAnswer()` — Complex regex with 3 direct patterns + standalone detection. Only 1 test. Multi-letter answers (`"A and B"`), edge cases (`"ANSWER: A,B"`), empty input all untested. | Add cases: "ANSWER: A", "CHOICE is B", "A) ... B) ..." with standalone, multi-answer "A and C", no-match fallback, empty string |
| 4 | **P0** | `src/features/runs/prompting.ts` | 48-101 | `buildSystemPrompt()` — Constructs entire system prompt based on mode × language matrix. Zero tests. Any mode/language combination bug affects all users. | Test all 10 mode×language combos (5 modes × 2 langs), verify JSON format rule appears for singleAnswer/shortAnswer, length presets per mode |
| 5 | **P0** | `src/features/runs/prompting.ts` | 131-139 | `stripMarkdownAndFiller()` — Regex-based markdown/filler removal. Zero tests. Malformed output from providers will leak through unchecked. | Test: code fences (```json...```), bullet lines, heading prefixes, "answer: " prefix, "respuesta: " prefix, excessive whitespace normalization |
| 6 | **P0** | `src/features/runs/prompting.ts` | 113-129 | `postProcessOutput()` — Only 1 test (json singleAnswer). Missing: plain format passthrough, short-mode newline flattening, non-json modes. | Add: plain format no extraction, short length collapses newlines, json parse failure falls back to stripMarkdownAndFiller |
| 7 | **P0** | `src/features/runs/engine.ts` | 170-184 | `deriveEffectiveProfile()` — Auto-mode detection with fallback to `autoModeFallback` / `autoModeFallbackLength`. Zero tests. Wrong mode selection corrupts all downstream prompt/output logic. | Test: explicit mode passthrough, auto→singleAnswer, auto→shortAnswer, auto→fallback with custom fallback length |
| 8 | **P0** | `src/features/runs/engine.ts` | 50-135 | `executeInputRun()` — Central orchestration: settings snapshot → profile derivation → model selection → provider call → post-processing → storage. Zero tests. This is the single most important code path. | Integration test with mocked `getSettingsSnapshot`, `runProvider`, `setLastRun`. Cover: text input, image input (vision model), image+codex error, auto-copy/overlay flags |
| 9 | **P0** | `src/features/providers/client.ts` | 33-105 | `runHostedProvider()` — API key validation, URL construction, OpenRouter header injection, response parsing with multiple fallback paths (`choices[0].message.content`, `output_text`, `text`). Zero tests. | Test: missing API key throws, URL construction with/without trailing slash, OpenRouter gets extra headers, various response shapes parsed correctly, HTTP error handling |
| 10 | **P0** | `src/features/providers/client.ts` | 107-140 | `runCodexBridge()` — Native messaging to Codex host. Zero tests. Error path when `response.ok` is false untested. | Test: disabled throws, successful response, error response propagation, prompt assembly format |
| 11 | **P0** | `src/features/providers/client.ts` | 142-151 | `flattenModelMessage()` — Handles string, array of parts, and null/undefined. Zero tests. | Test: string → trimmed string, array of text parts → joined, null → "", undefined → "" |
| 12 | **P0** | `src/features/settings/storage.ts` | 86-101 | `mergeSync()` — Deep merges partial settings with defaults. Zero tests. Missing or partial settings objects could produce malformed config. | Test: empty partial → full defaults, partial overlay only, nested partial (e.g. only behavior.autoCopy), all fields present |
| 13 | **P0** | `src/features/settings/storage.ts` | 103-116 | `mergeLocal()` — Deep merges partial local settings. Zero tests. Same risk as mergeSync. | Test: empty partial → full defaults, partial provider config, codex-only override |
| 14 | **P1** | `src/features/settings/storage.ts` | 67-76 | `getLastRun()` — Expiration check: if `expiresAt` is past due, clears and returns null. Zero tests. Stale runs silently persist if this logic breaks. | Test: no stored run → null, valid run → returned, expired run → cleared + null, null expiresAt → returned |
| 15 | **P1** | `src/features/settings/storage.ts` | 50-65 | `exportSettingsSnapshot()` — API key redaction when `includeSecrets=false`. Zero tests. Leaking API keys in exports is a security issue. | Test: includeSecrets=true keeps keys, includeSecrets=false blanks all 4 API keys, codex config untouched |
| 16 | **P1** | `src/features/runs/engine.ts` | 137-160 | `continueLastRun()` — Continuation text assembly from previous run. Zero tests. | Test: no previous run throws, continuation text format, explicit providerId override |
| 17 | **P1** | `src/features/runs/engine.ts` | 186-203 | `getPromptForInput()` — Maps InputKind to prompt string. Zero tests. Wrong mapping sends wrong directive. | Test: each of the 6 InputKind values maps to correct prompt field |
| 18 | **P1** | `src/features/runs/prompting.ts` | 103-107 | `buildUserText()` — Text wrapping with language-specific labels. Zero tests. | Test: en-US label, es-ES label, directive + text + replyLine structure |
| 19 | **P1** | `src/background/index.ts` | 233-243 | `imageUrlToDataUrl()` — Fetch + blob → base64 conversion. Zero tests. | Test: successful conversion, non-OK response throws, base64 encoding correctness |
| 20 | **P1** | `src/background/index.ts` | 54-111 | Message listener — Routes `onairo-run-action` and `onairo-popup-action` messages. Zero tests. Critical dispatch logic. | Test: run-action dispatches executeInputRun, popup-action dispatch-tab-action, continue-last, get-popup-state, unknown type returns false |
| 21 | **P1** | `src/content/index.ts` | 568-586 | `matchesHotkey()` — Parses combo strings like "Ctrl+Shift+T" and matches against KeyboardEvent. Zero tests. Broken hotkey matching breaks all keyboard shortcuts. | Test: exact match, modifier-only match, case insensitivity, no key match, missing modifiers |
| 22 | **P1** | `native-host/onairo-codex-host.mjs` | 16-46 | `drainMessages()` + `handleMessage()` — Native messaging protocol: length-prefixed JSON message parsing. Zero tests. | Unit test: single complete message parsed, partial message buffered, multiple messages in one chunk, invalid JSON → error response |
| 23 | **P1** | `native-host/onairo-codex-host.mjs` | 81-142 | `runCodex()` — Codex CLI invocation with argument assembly. Zero tests. | Test: missing prompt error, argument assembly (model, reasoning effort), default model behavior |
| 24 | **P2** | `src/content/index.ts` | 352-384 | `cropCapture()` — Canvas cropping math with scale/offset calculations. Zero tests. | Test: known video/overlay dimensions + start/end coords → expected crop bounds, edge coordinates clamped to [0,1] |
| 25 | **P2** | `src/content/index.ts` | 518-531 | `insertAtCaret()` — Text insertion into input/textarea/contenteditable. Zero tests. | Test: textarea with existing text, input[type=text], contenteditable fallback, no active element → no-op |
| 26 | **P2** | `src/content/index.ts` | 534-558 | `typeText()` — Character-by-character typing simulation with timing, accent stripping, humanization. Zero tests. | Test: noAccents strips diacritics, delay calculation, empty text no-op |
| 27 | **P2** | `src/content/index.ts` | 588-601 | `hexToRgba()` + `escapeHtml()` — Small utility functions. Zero tests. | Test: hex conversion, HTML entity escaping (&, <, >) |
| 28 | **P2** | `src/content/index.ts` | 462-475 | `applySelectionColors()` — Dynamic CSS injection for selection colors. Zero tests. | Test: both enabled → rgba values, background disabled → "inherit", text disabled → "inherit" |
| 29 | **P3** | `src/popup/popup-app.tsx` | 1-256 | Popup UI — React component. No tests. | Component render test with mocked chrome APIs, verify provider select, quick action buttons, continue-last flow |
| 30 | **P3** | `src/options/options-app.tsx` | 1-1554 | Options UI — Large React component. No tests. | Component render test, settings round-trip, import/export, reset to defaults |
| 31 | **P3** | `native-host/install-host.mjs` | 32-82 | `parseArgs()` + `resolveManifestDirectories()` — CLI arg parsing. No tests. | Test: --extension-id, --browser chrome/chromium/both, missing extension-id, unknown arg throws |

---

## Priority Recommendations

### Immediate (P0) — Add tests for these first

These are pure functions with complex logic, zero test coverage, and high impact on correctness:

1. **Create `src/features/runs/prompting.test.ts` (expand)**
   - `detectQuestionType()`: Add 8-10 cases covering all branches (multiple choice variants, true/false, fill-blank, short answer, technical fallback)
   - `detectLanguage()`: Add 5+ cases (English, Spanish, ambiguous → fallback, autoLangDetect disabled)
   - `buildSystemPrompt()`: Add 10 cases (5 modes × 2 languages), verify format/length rules
   - `stripMarkdownAndFiller()`: Add 6+ cases (code fences, bullets, answer prefix, whitespace)
   - `postProcessOutput()`: Add 4+ cases (plain, json, short flattening, fallback)
   - `extractSingleLetterAnswer()`: Add 5+ cases (direct patterns, multi-letter, empty, standalone)
   - `buildUserText()`: Add 2-3 cases

2. **Create `src/features/providers/client.test.ts`**
   - `flattenModelMessage()`: 4 cases (string, array, null, undefined)
   - `runHostedProvider()`: 5+ cases with mocked fetch (API key validation, URL construction, response parsing, OpenRouter headers, error handling)
   - `runCodexBridge()`: 3+ cases with mocked chrome.runtime.sendNativeMessage

3. **Create `src/features/settings/storage.test.ts`**
   - `mergeSync()`: 3+ cases (empty, partial, nested partial)
   - `mergeLocal()`: 3+ cases
   - `getLastRun()`: 4 cases (null, valid, expired, no expiry)
   - `exportSettingsSnapshot()`: 2 cases (with/without secrets)

4. **Create `src/features/runs/engine.test.ts`**
   - `deriveEffectiveProfile()`: 4+ cases
   - `getPromptForInput()`: 6 cases
   - `executeInputRun()`: 3+ integration-style tests with mocked dependencies

### Short-term (P1)

5. **Create `src/background/index.test.ts`** — Message routing and helper functions
6. **Create `src/content/utils.test.ts`** — Extract and test pure functions: `matchesHotkey`, `hexToRgba`, `escapeHtml`, `clamp`
7. **Create `native-host/onairo-codex-host.test.mjs`** — Message parsing, argument assembly, timeout clamping

### Medium-term (P2)

8. Extract pure logic from `content/index.ts` into separate testable modules (e.g., `content/capture.ts`, `content/typing.ts`)
9. Add integration tests for capture area cropping math
10. Add tests for settings change propagation (storage → content script re-initialization)

### Long-term (P3)

11. Add React component tests for popup and options pages using `@testing-library/react`
12. Add E2E tests for full user flows (select text → provider run → toast)

---

## Coverage Estimate

| Module | Source Lines | Test Cases | Estimated Coverage |
|---|---|---|---|
| `providers/catalog.ts` | 64 | 2 | ~60% |
| `runs/prompting.ts` | 179 | 4 | ~15% |
| `runs/engine.ts` | 212 | 0 | 0% |
| `providers/client.ts` | 166 | 0 | 0% |
| `settings/storage.ts` | 116 | 0 | 0% |
| `settings/schema.ts` | 267 | 0 | N/A (types only) |
| `background/index.ts` | 247 | 0 | 0% |
| `content/index.ts` | 613 | 0 | 0% |
| `popup-app.tsx` | 256 | 0 | 0% |
| `options-app.tsx` | 1554 | 0 | 0% |
| `native-host/*.mjs` | 309 | 0 | 0% |

**Overall estimated line coverage: < 5%**

---

## Test Infrastructure Notes

- **Framework:** Vitest (already configured, `vitest run` in package.json)
- **Challenge:** Chrome API mocking needed for most modules (`chrome.storage`, `chrome.runtime`, `chrome.tabs`, `chrome.contextMenus`, `chrome.permissions`)
- **Recommendation:** Add `vitest-webextension` or create a shared `src/test-utils/chrome-mock.ts` that mocks the full `chrome` global
- **For native host:** Use Node.js built-in `test` runner or keep vitest with ESM support

---

*End of report. This analysis covers the state of the repository as of the current commit on `main`.*
