import type {
  HostedProviderId,
  ProviderId,
} from "@/features/settings/schema"

export interface ProviderDescriptor {
  id: ProviderId
  label: string
  kind: "hosted" | "native"
  supportsVision: boolean
  supportsContinuation: boolean
  supportsClipboardImage: boolean
}

export const PROVIDERS: Record<ProviderId, ProviderDescriptor> = {
  kimi: {
    id: "kimi",
    label: "Kimi",
    kind: "hosted",
    supportsVision: true,
    supportsContinuation: true,
    supportsClipboardImage: true,
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    kind: "hosted",
    supportsVision: true,
    supportsContinuation: true,
    supportsClipboardImage: true,
  },
  zai: {
    id: "zai",
    label: "Z.ai",
    kind: "hosted",
    supportsVision: true,
    supportsContinuation: true,
    supportsClipboardImage: true,
  },
  custom: {
    id: "custom",
    label: "Custom OpenAI",
    kind: "hosted",
    supportsVision: true,
    supportsContinuation: true,
    supportsClipboardImage: true,
  },
  codex: {
    id: "codex",
    label: "Codex Bridge",
    kind: "native",
    supportsVision: false,
    supportsContinuation: true,
    supportsClipboardImage: false,
  },
}

export function getProviderDescriptor(id: ProviderId): ProviderDescriptor {
  return PROVIDERS[id]
}

export function isHostedProvider(id: ProviderId): id is HostedProviderId {
  return PROVIDERS[id].kind === "hosted"
}
