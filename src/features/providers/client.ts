import { getProviderDescriptor } from "@/features/providers/catalog"
import type {
  HostedProviderConfig,
  HostedProviderId,
  LocalSettings,
  ProviderId,
} from "@/features/settings/schema"

export interface ProviderRunRequest {
  providerId: ProviderId
  localSettings: LocalSettings
  model: string
  systemPrompt: string
  userText: string
  imageDataUrl?: string
}

export interface ProviderRunResult {
  providerLabel: string
  model: string
  output: string
  rawOutput: string
  finishReason: string
  usageLabel: string
}

interface OpenAIMessagePart {
  type: "text" | "image_url"
  text?: string
  image_url?: { url: string }
}

export async function runProvider(
  request: ProviderRunRequest,
): Promise<ProviderRunResult> {
  if (request.providerId === "codex") {
    return runCodexBridge(request.localSettings, request.systemPrompt, request.userText)
  }

  return runHostedProvider(request)
}

async function runHostedProvider(
  request: ProviderRunRequest,
): Promise<ProviderRunResult> {
  const config = request.localSettings[request.providerId as HostedProviderId] as HostedProviderConfig
  if (!config.apiKey.trim()) {
    throw new Error(`Missing API key for ${getProviderDescriptor(request.providerId).label}.`)
  }

  const url = new URL(config.endpointPath, ensureTrailingSlash(config.baseUrl)).toString()
  await ensureOriginPermission(url)

  const userContent: string | OpenAIMessagePart[] = request.imageDataUrl
    ? [
        { type: "text", text: request.userText },
        { type: "image_url", image_url: { url: request.imageDataUrl } },
      ]
    : request.userText

  const body = {
    model: request.model,
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: userContent },
    ],
    stream: false,
    temperature: Number.isFinite(config.temperature) ? config.temperature : 0.2,
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  }

  if (request.providerId === "openrouter") {
    headers["HTTP-Referer"] = "https://onairo.app"
    headers["X-OpenRouter-Title"] = "Onairo"
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`${getProviderDescriptor(request.providerId).label} API error: ${response.status} ${await response.text()}`)
  }

  const data = await response.json()
  const message = data?.choices?.[0]?.message?.content ?? data?.output_text ?? data?.text ?? ""
  const finishReason = data?.choices?.[0]?.finish_reason ?? "stop"
  const usage = data?.usage
  return {
    providerLabel: getProviderDescriptor(request.providerId).label,
    model: request.model,
    output: flattenModelMessage(message),
    rawOutput: JSON.stringify(data),
    finishReason,
    usageLabel: usage
      ? `tok p${usage.prompt_tokens ?? 0}/c${usage.completion_tokens ?? 0}/t${usage.total_tokens ?? 0}`
      : "",
  }
}

async function runCodexBridge(
  localSettings: LocalSettings,
  systemPrompt: string,
  userText: string,
): Promise<ProviderRunResult> {
  if (!localSettings.codex.enabled) {
    throw new Error("Codex bridge is disabled in settings.")
  }

  const response = await chrome.runtime.sendNativeMessage(localSettings.codex.hostName, {
    type: "run",
    provider: "codex",
    timeoutMs: localSettings.codex.timeoutMs,
    payload: {
      prompt: `${systemPrompt}\n\n${userText}`.trim(),
      model: localSettings.codex.model,
      cwd: localSettings.codex.workingDirectory,
      reasoningEffort: localSettings.codex.reasoningEffort,
    },
  })

  if (!response?.ok) {
    throw new Error(response?.error || "Codex bridge failed.")
  }

  return {
    providerLabel: "Codex Bridge",
    model: localSettings.codex.model,
    output: String(response.output || "").trim(),
    rawOutput: JSON.stringify(response),
    finishReason: response.finishReason || "stop",
    usageLabel: response.usageLabel || "",
  }
}

function flattenModelMessage(
  message: string | Array<{ type?: string; text?: string }> | null | undefined,
): string {
  if (typeof message === "string") return message.trim()
  if (!Array.isArray(message)) return ""
  return message
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim()
}

function ensureTrailingSlash(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
}

export async function ensureOriginPermission(targetUrl: string): Promise<void> {
  const url = new URL(targetUrl)
  const pattern = `${url.origin}/*`
  const alreadyGranted = await chrome.permissions.contains({ origins: [pattern] })
  if (alreadyGranted) return
  const requested = await chrome.permissions.request({ origins: [pattern] })
  if (!requested) {
    throw new Error(`Permission denied for ${url.origin}.`)
  }
}
