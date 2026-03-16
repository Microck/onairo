import { describe, expect, it } from "vitest"
import { PROVIDERS, getProviderDescriptor, isHostedProvider } from "@/features/providers/catalog"

describe("provider catalog", () => {
  it("keeps hosted providers vision-capable by default", () => {
    const hostedProviders = Object.values(PROVIDERS).filter((provider) =>
      isHostedProvider(provider.id),
    )

    expect(hostedProviders.map((provider) => provider.id)).toEqual([
      "kimi",
      "openrouter",
      "zai",
      "custom",
    ])
    expect(hostedProviders.every((provider) => provider.supportsVision)).toBe(true)
    expect(hostedProviders.every((provider) => provider.supportsContinuation)).toBe(true)
  })

  it("marks codex as text-only", () => {
    expect(getProviderDescriptor("codex")).toMatchObject({
      id: "codex",
      supportsVision: false,
      supportsClipboardImage: false,
      supportsContinuation: true,
    })
  })
})
