export type ProviderId = "kimi" | "openrouter" | "zai" | "custom" | "codex"
export type ResponseMode =
  | "technical"
  | "student"
  | "singleAnswer"
  | "shortAnswer"
  | "auto"
export type OutputFormat = "plain" | "json"
export type OutputLength = "short" | "medium" | "long" | "extraLong"
export type InputKind =
  | "selectedText"
  | "clipboardText"
  | "clipboardImage"
  | "contextImage"
  | "captureArea"
  | "continueLast"
export type HostedProviderId = Exclude<ProviderId, "codex">
export type CodexReasoningEffort = "low" | "medium" | "high"

export interface RunProfile {
  language: "en-US" | "es-ES"
  mode: ResponseMode
  outputFormat: OutputFormat
  length: OutputLength
  autoLangDetect: boolean
  autoModeFallback: "technical" | "student"
  autoModeFallbackLength: OutputLength
  maxChars: number
  trimInput: boolean
}

export interface Prompts {
  inputSelectedText: string
  inputClipboardText: string
  inputImage: string
  captureArea: string
  continueLast: string
}

export interface SelectionColors {
  backgroundEnabled: boolean
  backgroundColor: string
  backgroundOpacity: number
  textEnabled: boolean
  textColor: string
  textOpacity: number
}

export interface TypingSettings {
  wordsPerMinute: number
  noAccents: boolean
  thinkingPauses: boolean
  thinkingPauseMinMs: number
  thinkingPauseMaxMs: number
  specialCharacterSlowdown: boolean
  humanization: number
}

export interface OverlaySettings {
  color: string
  opacity: number
  size: number
  backgroundBox: boolean
  autoShowOnAnswers: boolean
  shadow: boolean
  animate: boolean
  offsetTop: number
  offsetRight: number
  preferLetters: boolean
}

export interface Hotkeys {
  inputSelectedText: string
  inputClipboardText: string
  inputImage: string
  captureArea: string
  pasteOutputText: string
  typeOutputText: string
  copyOutputText: string
  showOutputTooltip: string
  showAnswerOverlay: string
}

export interface BehaviorSettings {
  autoCopy: boolean
  toastsEnabled: boolean
  autoClearMs: number
  defaultProviderId: ProviderId
}

export interface SyncSettings {
  profile: RunProfile
  prompts: Prompts
  selectionColors: SelectionColors
  typing: TypingSettings
  overlay: OverlaySettings
  hotkeys: Hotkeys
  behavior: BehaviorSettings
}

export interface HostedProviderConfig {
  enabled: boolean
  apiKey: string
  baseUrl: string
  endpointPath: string
  textModel: string
  visionModel: string
  temperature: number
}

export interface CodexBridgeConfig {
  enabled: boolean
  hostName: string
  timeoutMs: number
  model: string
  workingDirectory: string
  reasoningEffort: CodexReasoningEffort
}

export interface LocalSettings {
  kimi: HostedProviderConfig
  openrouter: HostedProviderConfig
  zai: HostedProviderConfig
  custom: HostedProviderConfig & { label: string }
  codex: CodexBridgeConfig
}

export interface LastRunRecord {
  id: string
  createdAt: number
  expiresAt: number | null
  providerId: ProviderId
  providerLabel: string
  model: string
  inputKind: InputKind
  source: string
  userFacingInput: string
  systemPrompt: string
  output: string
  rawOutput: string
  meta: string
}

export interface SettingsSnapshot {
  sync: SyncSettings
  local: LocalSettings
}

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  profile: {
    language: "en-US",
    mode: "technical",
    outputFormat: "plain",
    length: "medium",
    autoLangDetect: true,
    autoModeFallback: "technical",
    autoModeFallbackLength: "medium",
    maxChars: 1600,
    trimInput: true,
  },
  prompts: {
    inputSelectedText:
      "Focus only on the relevant content and answer in plain text without filler.",
    inputClipboardText:
      "Use only the necessary information from the clipboard and answer concisely.",
    inputImage:
      "Describe or answer about the image precisely and briefly. Prefer direct answers.",
    captureArea:
      "Explain the captured region and answer the task precisely in plain text.",
    continueLast:
      "Continue from the prior request and answer, staying concise and consistent.",
  },
  selectionColors: {
    backgroundEnabled: true,
    backgroundColor: "#29d3d3",
    backgroundOpacity: 25,
    textEnabled: false,
    textColor: "#000000",
    textOpacity: 100,
  },
  typing: {
    wordsPerMinute: 300,
    noAccents: false,
    thinkingPauses: false,
    thinkingPauseMinMs: 300,
    thinkingPauseMaxMs: 1200,
    specialCharacterSlowdown: true,
    humanization: 5,
  },
  overlay: {
    color: "#00ff66",
    opacity: 0.92,
    size: 72,
    backgroundBox: false,
    autoShowOnAnswers: false,
    shadow: true,
    animate: true,
    offsetTop: 20,
    offsetRight: 20,
    preferLetters: true,
  },
  hotkeys: {
    inputSelectedText: "Ctrl+Shift+T",
    inputClipboardText: "Ctrl+Shift+L",
    inputImage: "Ctrl+Shift+I",
    captureArea: "Ctrl+Shift+C",
    pasteOutputText: "Ctrl+Shift+P",
    typeOutputText: "Ctrl+Shift+K",
    copyOutputText: "Ctrl+Shift+Y",
    showOutputTooltip: "Ctrl+Shift+U",
    showAnswerOverlay: "Ctrl+Shift+A",
  },
  behavior: {
    autoCopy: true,
    toastsEnabled: true,
    autoClearMs: 10 * 60 * 1000,
    defaultProviderId: "kimi",
  },
}

export const DEFAULT_LOCAL_SETTINGS: LocalSettings = {
  kimi: {
    enabled: true,
    apiKey: "",
    baseUrl: "https://api.moonshot.ai",
    endpointPath: "/v1/chat/completions",
    textModel: "kimi-k2-0905-preview",
    visionModel: "moonshot-v1-128k-vision-preview",
    temperature: 0.2,
  },
  openrouter: {
    enabled: false,
    apiKey: "",
    baseUrl: "https://openrouter.ai",
    endpointPath: "/api/v1/chat/completions",
    textModel: "openai/gpt-4o-mini",
    visionModel: "openai/gpt-4o-mini",
    temperature: 0.2,
  },
  zai: {
    enabled: false,
    apiKey: "",
    baseUrl: "https://api.z.ai/api/paas/v4",
    endpointPath: "/chat/completions",
    textModel: "glm-5",
    visionModel: "glm-4.6v",
    temperature: 0.2,
  },
  custom: {
    label: "Custom OpenAI",
    enabled: false,
    apiKey: "",
    baseUrl: "https://api.openai.com",
    endpointPath: "/v1/chat/completions",
    textModel: "gpt-4o-mini",
    visionModel: "gpt-4o-mini",
    temperature: 0.2,
  },
  codex: {
    enabled: false,
    hostName: "dev.onairo.codex",
    timeoutMs: 60000,
    model: "default",
    workingDirectory: "",
    reasoningEffort: "medium",
  },
}
