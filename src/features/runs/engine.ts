import { getProviderDescriptor } from "@/features/providers/catalog"
import { runProvider } from "@/features/providers/client"
import {
  buildSystemPrompt,
  buildUserImageDirective,
  buildUserText,
  detectLanguage,
  detectQuestionType,
  extractSingleLetterAnswer,
  postProcessOutput,
} from "@/features/runs/prompting"
import {
  getLastRun,
  getSettingsSnapshot,
  setLastRun,
} from "@/features/settings/storage"
import type {
  InputKind,
  LastRunRecord,
  LocalSettings,
  OutputFormat,
  ProviderId,
  Prompts,
  RunProfile,
} from "@/features/settings/schema"

export interface ExecuteInputOptions {
  providerId?: ProviderId
  inputKind: InputKind
  source: string
  text?: string
  imageDataUrl?: string
}

export interface ExecuteRunResult {
  output: string
  providerLabel: string
  model: string
  meta: string
  shouldAutoCopy: boolean
  shouldAutoOverlay: boolean
  overlayText: string
}

type EffectiveRunProfile = Omit<RunProfile, "mode"> & {
  mode: Exclude<RunProfile["mode"], "auto">
}

export async function executeInputRun(
  options: ExecuteInputOptions,
): Promise<ExecuteRunResult> {
  const snapshot = await getSettingsSnapshot()
  const providerId = options.providerId || snapshot.sync.behavior.defaultProviderId
  const descriptor = getProviderDescriptor(providerId)

  if (options.imageDataUrl && !descriptor.supportsVision) {
    throw new Error(`${descriptor.label} does not support image input.`)
  }

  const rawText = String(options.text || "").trim()
  const lang = detectLanguage(rawText, snapshot.sync.profile)
  const profile = deriveEffectiveProfile(snapshot.sync.profile, rawText)
  const systemPrompt = buildSystemPrompt(profile, lang)

  const model = options.imageDataUrl
    ? providerId === "codex"
      ? (() => {
          throw new Error("Codex bridge does not support image input.")
        })()
      : getVisionModel(providerId, snapshot.local)
    : getTextModel(providerId, snapshot.local)

  const providerResult = await runProvider({
    providerId,
    localSettings: snapshot.local,
    model,
    systemPrompt,
    userText: options.imageDataUrl
      ? buildUserImageDirective(getPromptForInput(snapshot.sync.prompts, options.inputKind))
      : buildUserText(getPromptForInput(snapshot.sync.prompts, options.inputKind), rawText, lang),
    imageDataUrl: options.imageDataUrl,
  })

  const format: OutputFormat =
    profile.mode === "singleAnswer" || profile.mode === "shortAnswer"
      ? "json"
      : profile.outputFormat

  const cleaned = postProcessOutput(
    providerResult.output,
    profile.mode,
    format,
    profile,
  )
  const overlayText = snapshot.sync.overlay.preferLetters
    ? extractSingleLetterAnswer(cleaned) || cleaned
    : cleaned

  const record: LastRunRecord = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    expiresAt: snapshot.sync.behavior.autoClearMs
      ? Date.now() + snapshot.sync.behavior.autoClearMs
      : null,
    providerId,
    providerLabel: providerResult.providerLabel,
    model,
    inputKind: options.inputKind,
    source: options.source,
    userFacingInput: options.imageDataUrl
      ? `[${options.source}] ${getPromptForInput(snapshot.sync.prompts, options.inputKind)}`
      : rawText,
    systemPrompt,
    output: cleaned,
    rawOutput: providerResult.rawOutput,
    meta: [providerResult.finishReason, options.source, providerResult.usageLabel]
      .filter(Boolean)
      .join(" · "),
  }

  await setLastRun(record)

  return {
    output: cleaned,
    providerLabel: providerResult.providerLabel,
    model,
    meta: record.meta,
    shouldAutoCopy: snapshot.sync.behavior.autoCopy,
    shouldAutoOverlay:
      snapshot.sync.overlay.autoShowOnAnswers &&
      (profile.mode === "singleAnswer" || profile.mode === "shortAnswer"),
    overlayText,
  }
}

export async function continueLastRun(
  followUp: string,
  explicitProviderId?: ProviderId,
): Promise<ExecuteRunResult> {
  const lastRun = await getLastRun()
  if (!lastRun) {
    throw new Error("No previous run is available.")
  }

  const providerId = explicitProviderId || lastRun.providerId
  const continuationText = [
    "Continue from the previous exchange.",
    `Previous request:\n"""${lastRun.userFacingInput}"""`,
    `Previous answer:\n"""${lastRun.output}"""`,
    `Follow-up:\n"""${followUp.trim()}"""`,
  ].join("\n\n")

  return executeInputRun({
    providerId,
    inputKind: "continueLast",
    source: `continue:${lastRun.source}`,
    text: continuationText,
  })
}

export async function getLastRunOutput(): Promise<LastRunRecord | null> {
  return getLastRun()
}



function deriveEffectiveProfile(profile: RunProfile, text: string): EffectiveRunProfile {
  if (profile.mode !== "auto") {
    const { mode, ...rest } = profile
    return { ...rest, mode }
  }
  const detected = detectQuestionType(text)
  if (detected === "singleAnswer" || detected === "shortAnswer") {
    return { ...profile, mode: detected }
  }
  return {
    ...profile,
    mode: profile.autoModeFallback,
    length: profile.autoModeFallbackLength,
  }
}

function getPromptForInput(
  prompts: Prompts,
  inputKind: InputKind,
): string {
  switch (inputKind) {
    case "selectedText":
      return prompts.inputSelectedText
    case "clipboardText":
      return prompts.inputClipboardText
    case "clipboardImage":
    case "contextImage":
      return prompts.inputImage
    case "captureArea":
      return prompts.captureArea
    case "continueLast":
      return prompts.continueLast
  }
}

function getTextModel(providerId: ProviderId, local: LocalSettings): string {
  if (providerId === "codex") return local.codex.model
  return local[providerId].textModel
}

function getVisionModel(providerId: Exclude<ProviderId, "codex">, local: LocalSettings): string {
  return local[providerId].visionModel
}
