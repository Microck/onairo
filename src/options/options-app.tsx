import { CircleHelp, Download, RefreshCcw, Save, Upload } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PROVIDERS } from "@/features/providers/catalog"
import {
  DEFAULT_LOCAL_SETTINGS,
  DEFAULT_SYNC_SETTINGS,
  type CodexBridgeConfig,
  type HostedProviderConfig,
  type HostedProviderId,
  type Hotkeys,
  type LocalSettings,
  type Prompts,
  type ProviderId,
  type SettingsSnapshot,
  type SyncSettings,
} from "@/features/settings/schema"
import {
  applySettingsSnapshot,
  exportSettingsSnapshot,
  getSettingsSnapshot,
} from "@/features/settings/storage"

type OptionsSection =
  | "providers"
  | "prompting"
  | "stealth"
  | "shortcuts"
  | "system"

const SECTION_ITEMS = [
  { id: "providers", label: "Providers", blurb: "Routing, models, bridge" },
  { id: "prompting", label: "Prompting", blurb: "Mode, language, directives" },
  { id: "stealth", label: "Stealth", blurb: "Overlay, selection, typing" },
  { id: "shortcuts", label: "Shortcuts", blurb: "Keyboard triggers" },
  { id: "system", label: "System", blurb: "Import, export, reset" },
] as const satisfies Array<{
  id: OptionsSection
  label: string
  blurb: string
}>

const PROVIDER_EDITOR_IDS = ["kimi", "openrouter", "zai", "custom", "codex"] as const satisfies ProviderId[]

const PROMPT_FIELDS = [
  { key: "inputSelectedText", label: "Selected text" },
  { key: "inputClipboardText", label: "Clipboard text" },
  { key: "inputImage", label: "Image" },
  { key: "captureArea", label: "Capture area" },
  { key: "continueLast", label: "Continue last" },
] as const satisfies Array<{ key: keyof Prompts; label: string }>

const HOTKEY_FIELDS = [
  { key: "inputSelectedText", label: "Selected text" },
  { key: "inputClipboardText", label: "Clipboard text" },
  { key: "inputImage", label: "Image input" },
  { key: "captureArea", label: "Capture area" },
  { key: "pasteOutputText", label: "Paste output" },
  { key: "typeOutputText", label: "Type output" },
  { key: "copyOutputText", label: "Copy output" },
  { key: "showOutputTooltip", label: "Show tooltip" },
  { key: "showAnswerOverlay", label: "Show overlay" },
] as const satisfies Array<{ key: keyof Hotkeys; label: string }>

export function OptionsApp() {
  const [sync, setSync] = useState<SyncSettings>(DEFAULT_SYNC_SETTINGS)
  const [local, setLocal] = useState<LocalSettings>(DEFAULT_LOCAL_SETTINGS)
  const [includeSecrets, setIncludeSecrets] = useState(false)
  const [section, setSection] = useState<OptionsSection>("providers")
  const [editorProviderId, setEditorProviderId] = useState<ProviderId>("kimi")
  const [promptEditorKey, setPromptEditorKey] = useState<keyof Prompts>("inputSelectedText")
  const logoUrl = chrome.runtime.getURL("logo-mark.png")

  async function load(): Promise<void> {
    const snapshot = await getSettingsSnapshot()
    setSync(snapshot.sync)
    setLocal(snapshot.local)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [])

  async function save(): Promise<void> {
    await applySettingsSnapshot({ sync, local })
    toast.success("Settings saved.")
  }

  async function reset(): Promise<void> {
    setSync(DEFAULT_SYNC_SETTINGS)
    setLocal(DEFAULT_LOCAL_SETTINGS)
    await applySettingsSnapshot({
      sync: DEFAULT_SYNC_SETTINGS,
      local: DEFAULT_LOCAL_SETTINGS,
    })
    toast.success("Defaults restored.")
  }

  async function exportJson(): Promise<void> {
    const data = await exportSettingsSnapshot(includeSecrets)
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `onairo-settings-${new Date().toISOString().replaceAll(":", "-")}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(
      includeSecrets ? "Full settings export created." : "Safe settings export created.",
    )
  }

  async function importJson(file: File): Promise<void> {
    const parsed = JSON.parse(await file.text()) as SettingsSnapshot
    await applySettingsSnapshot(parsed)
    setSync(parsed.sync)
    setLocal(parsed.local)
    toast.success("Settings imported.")
  }

  function updateHostedProvider(
    providerId: HostedProviderId,
    patch: Partial<HostedProviderConfig>,
  ): void {
    setLocal((current) => ({
      ...current,
      [providerId]: { ...current[providerId], ...patch },
    }))
  }

  function updateCodexBridge(patch: Partial<CodexBridgeConfig>): void {
    setLocal((current) => ({
      ...current,
      codex: { ...current.codex, ...patch },
    }))
  }

  function updatePromptField(key: keyof Prompts, value: string): void {
    setSync((current) => ({
      ...current,
      prompts: { ...current.prompts, [key]: value },
    }))
  }

  function updateHotkeyField(key: keyof Hotkeys, value: string): void {
    setSync((current) => ({
      ...current,
      hotkeys: { ...current.hotkeys, [key]: value },
    }))
  }

  const hostedProvider = editorProviderId === "codex" ? null : local[editorProviderId as HostedProviderId]
  const activePrompt = sync.prompts[promptEditorKey]
  const selectionBackground = sync.selectionColors.backgroundEnabled
    ? hexToRgba(
        sync.selectionColors.backgroundColor,
        sync.selectionColors.backgroundOpacity,
      )
    : "transparent"
  const selectionForeground = sync.selectionColors.textEnabled
    ? hexToRgba(sync.selectionColors.textColor, sync.selectionColors.textOpacity)
    : "inherit"
  const previewOutput = buildPreviewOutput(sync)
  const codexCommandPreview = buildCodexCommandPreview(local.codex)

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-[100dvh] px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <header className="flex flex-col gap-5 rounded-lg border border-border bg-card px-5 py-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <img src={logoUrl} alt="Onairo logo" className="size-12 shrink-0" />
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Onairo
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Settings
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Plain controls, live previews, and no ornamental chrome.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="rounded-lg" onClick={() => void exportJson()}>
              <Download className="size-4" />
              Export
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm">
              <Upload className="size-4" />
              Import
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void importJson(file)
                  event.currentTarget.value = ""
                }}
              />
            </label>
            <Button className="rounded-lg" onClick={() => void save()}>
              <Save className="size-4" />
              Save
            </Button>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[180px_minmax(0,1fr)_280px]">
          <aside className="space-y-2">
            {SECTION_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={[
                  "w-full rounded-lg border px-3 py-3 text-left transition-colors",
                  section === item.id
                    ? "border-foreground/12 bg-card text-foreground"
                    : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground",
                ].join(" ")}
              >
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="mt-1 text-xs leading-5">{item.blurb}</div>
              </button>
            ))}
          </aside>

          <main className="space-y-6">
            {section === "providers" ? (
              <>
                <Surface
                  eyebrow="Routing"
                  title="Provider routing"
                  description="Keep one active default, but edit every provider from the same sparse editor."
                >
                  <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                    <Field label="Default provider" tooltip="The provider used by default for popup actions, hotkeys, and context-menu flows.">
                      <Select
                        value={sync.behavior.defaultProviderId}
                        onValueChange={(value) =>
                          setSync((current) => ({
                            ...current,
                            behavior: {
                              ...current.behavior,
                              defaultProviderId: value as ProviderId,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(PROVIDERS).map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Secrets in export" tooltip="Controls whether exported config files include API keys and local bridge secrets.">
                      <ToggleRow
                        title="Include API keys"
                        description="Leave this off for safer backups and sharable config files."
                        checked={includeSecrets}
                        onCheckedChange={setIncludeSecrets}
                      />
                    </Field>
                  </div>
                </Surface>

                <Surface
                  eyebrow="Adapters"
                  title="Provider editor"
                  description="Switch providers without leaving the page. What you edit is mirrored instantly in the preview rail."
                >
                  <div className="mb-5 flex flex-wrap gap-2">
                    {PROVIDER_EDITOR_IDS.map((providerId) => (
                      <button
                        key={providerId}
                        type="button"
                        onClick={() => setEditorProviderId(providerId)}
                          className={[
                            "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                            editorProviderId === providerId
                            ? "border-foreground/12 bg-muted text-foreground"
                              : "border-border bg-background text-muted-foreground hover:text-foreground",
                          ].join(" ")}
                      >
                        {PROVIDERS[providerId].label}
                      </button>
                    ))}
                  </div>

                  {hostedProvider ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <ToggleField
                        label="Enabled"
                        description="Show this provider in the live router."
                        checked={hostedProvider.enabled}
                        onCheckedChange={(checked) =>
                          updateHostedProvider(editorProviderId as HostedProviderId, {
                            enabled: checked,
                          })
                        }
                      />
                      <Field label="Temperature" tooltip="Lower values stay tighter and more deterministic. Higher values allow more variation.">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          className="rounded-lg"
                          value={hostedProvider.temperature}
                          onChange={(event) =>
                            updateHostedProvider(editorProviderId as HostedProviderId, {
                              temperature: Number(event.target.value) || 0,
                            })
                          }
                        />
                      </Field>
                      <Field label="API key">
                        <Input
                          type="password"
                          className="rounded-lg"
                          value={hostedProvider.apiKey}
                          onChange={(event) =>
                            updateHostedProvider(editorProviderId as HostedProviderId, {
                              apiKey: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Base URL">
                        <Input
                          className="rounded-lg"
                          value={hostedProvider.baseUrl}
                          onChange={(event) =>
                            updateHostedProvider(editorProviderId as HostedProviderId, {
                              baseUrl: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Endpoint path">
                        <Input
                          className="rounded-lg"
                          value={hostedProvider.endpointPath}
                          onChange={(event) =>
                            updateHostedProvider(editorProviderId as HostedProviderId, {
                              endpointPath: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Text model">
                        <Input
                          className="rounded-lg"
                          value={hostedProvider.textModel}
                          onChange={(event) =>
                            updateHostedProvider(editorProviderId as HostedProviderId, {
                              textModel: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Vision model">
                        <Input
                          className="rounded-lg"
                          value={hostedProvider.visionModel}
                          onChange={(event) =>
                            updateHostedProvider(editorProviderId as HostedProviderId, {
                              visionModel: event.target.value,
                            })
                          }
                        />
                      </Field>
                      {editorProviderId === "custom" ? (
                        <Field label="Display label">
                          <Input
                            className="rounded-lg"
                            value={local.custom.label}
                            onChange={(event) =>
                              setLocal((current) => ({
                                ...current,
                                custom: {
                                  ...current.custom,
                                  label: event.target.value,
                                },
                              }))
                            }
                          />
                        </Field>
                      ) : null}
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <ToggleField
                        label="Enabled"
                        description="Expose the local bridge in routing and popup flows."
                        checked={local.codex.enabled}
                        onCheckedChange={(checked) =>
                          updateCodexBridge({ enabled: checked })
                        }
                      />
                      <Field label="Reasoning effort" tooltip="Tells the Codex bridge how much reasoning budget to spend before answering.">
                        <Select
                          value={local.codex.reasoningEffort}
                          onValueChange={(value) =>
                            updateCodexBridge({
                              reasoningEffort: value as CodexBridgeConfig["reasoningEffort"],
                            })
                          }
                        >
                          <SelectTrigger className="rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">low</SelectItem>
                            <SelectItem value="medium">medium</SelectItem>
                            <SelectItem value="high">high</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Host name">
                        <Input
                          className="rounded-lg"
                          value={local.codex.hostName}
                          onChange={(event) =>
                            updateCodexBridge({ hostName: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="Model label">
                        <Input
                          className="rounded-lg"
                          value={local.codex.model}
                          onChange={(event) =>
                            updateCodexBridge({ model: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="Timeout ms">
                        <Input
                          type="number"
                          className="rounded-lg"
                          value={local.codex.timeoutMs}
                          onChange={(event) =>
                            updateCodexBridge({
                              timeoutMs: Number(event.target.value) || 60_000,
                            })
                          }
                        />
                      </Field>
                      <Field label="Working directory" tooltip="Optional absolute path to run Codex in. Leave empty to use the default home directory.">
                        <Input
                          className="rounded-lg"
                          placeholder="Optional absolute path"
                          value={local.codex.workingDirectory}
                          onChange={(event) =>
                            updateCodexBridge({
                              workingDirectory: event.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>
                  )}
                </Surface>
              </>
            ) : null}

            {section === "prompting" ? (
              <>
                <Surface
                  eyebrow="Response shape"
                  title="Prompt profile"
                  description="Use one compact profile block instead of scattered toggles."
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Language">
                      <Select
                        value={sync.profile.language}
                        onValueChange={(value) =>
                          setSync((current) => ({
                            ...current,
                            profile: {
                              ...current.profile,
                              language: value as SyncSettings["profile"]["language"],
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en-US">English</SelectItem>
                          <SelectItem value="es-ES">Español</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Mode" tooltip="Shapes the cleanup pass after the model responds, from direct technical output to answer-only modes.">
                      <Select
                        value={sync.profile.mode}
                        onValueChange={(value) =>
                          setSync((current) => ({
                            ...current,
                            profile: {
                              ...current.profile,
                              mode: value as SyncSettings["profile"]["mode"],
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">auto</SelectItem>
                          <SelectItem value="technical">technical</SelectItem>
                          <SelectItem value="student">student</SelectItem>
                          <SelectItem value="singleAnswer">singleAnswer</SelectItem>
                          <SelectItem value="shortAnswer">shortAnswer</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Output format" tooltip="Plain returns raw text. JSON wraps the result in a minimal structured shape.">
                      <Select
                        value={sync.profile.outputFormat}
                        onValueChange={(value) =>
                          setSync((current) => ({
                            ...current,
                            profile: {
                              ...current.profile,
                              outputFormat: value as SyncSettings["profile"]["outputFormat"],
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="plain">plain</SelectItem>
                          <SelectItem value="json">json</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Length">
                      <Select
                        value={sync.profile.length}
                        onValueChange={(value) =>
                          setSync((current) => ({
                            ...current,
                            profile: {
                              ...current.profile,
                              length: value as SyncSettings["profile"]["length"],
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">short</SelectItem>
                          <SelectItem value="medium">medium</SelectItem>
                          <SelectItem value="long">long</SelectItem>
                          <SelectItem value="extraLong">extraLong</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Auto fallback mode" tooltip="Used only when automatic mode detection cannot decide how the answer should be shaped.">
                      <Select
                        value={sync.profile.autoModeFallback}
                        onValueChange={(value) =>
                          setSync((current) => ({
                            ...current,
                            profile: {
                              ...current.profile,
                              autoModeFallback: value as SyncSettings["profile"]["autoModeFallback"],
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">technical</SelectItem>
                          <SelectItem value="student">student</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Auto fallback length">
                      <Select
                        value={sync.profile.autoModeFallbackLength}
                        onValueChange={(value) =>
                          setSync((current) => ({
                            ...current,
                            profile: {
                              ...current.profile,
                              autoModeFallbackLength: value as SyncSettings["profile"]["autoModeFallbackLength"],
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">short</SelectItem>
                          <SelectItem value="medium">medium</SelectItem>
                          <SelectItem value="long">long</SelectItem>
                          <SelectItem value="extraLong">extraLong</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Max chars">
                      <Input
                        type="number"
                        className="rounded-lg"
                        value={sync.profile.maxChars}
                        onChange={(event) =>
                          setSync((current) => ({
                            ...current,
                            profile: {
                              ...current.profile,
                              maxChars: Number(event.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </Field>
                    <ToggleField
                      label="Auto language detect"
                      tooltip="Detect English or Spanish from the selected input instead of forcing the configured language."
                      description="Detect English or Spanish from the selected text."
                      checked={sync.profile.autoLangDetect}
                      onCheckedChange={(checked) =>
                        setSync((current) => ({
                          ...current,
                          profile: { ...current.profile, autoLangDetect: checked },
                        }))
                      }
                    />
                    <ToggleField
                      label="Trim input"
                      tooltip="Removes stray whitespace before the prompt is assembled."
                      description="Remove leading and trailing whitespace before sending."
                      checked={sync.profile.trimInput}
                      onCheckedChange={(checked) =>
                        setSync((current) => ({
                          ...current,
                          profile: { ...current.profile, trimInput: checked },
                        }))
                      }
                    />
                  </div>
                </Surface>

                <Surface
                  eyebrow="Directives"
                  title="Prompt editor"
                  description="Edit one prompt at a time. The preview rail updates the sample response shape live."
                >
                  <div className="mb-4 flex flex-wrap gap-2">
                    {PROMPT_FIELDS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setPromptEditorKey(item.key)}
                        className={[
                          "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                          promptEditorKey === item.key
                            ? "border-foreground/12 bg-muted text-foreground"
                            : "border-border bg-background text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <Field label={PROMPT_FIELDS.find((item) => item.key === promptEditorKey)?.label || "Prompt"}>
                    <Textarea
                      value={activePrompt}
                      className="min-h-[220px] rounded-lg"
                      onChange={(event) =>
                        updatePromptField(promptEditorKey, event.target.value)
                      }
                    />
                  </Field>
                </Surface>
              </>
            ) : null}

            {section === "stealth" ? (
              <>
                <Surface
                  eyebrow="Automation"
                  title="Output and typing"
                  description="Everything that changes how the answer lands back into the page."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <ToggleField
                      label="Auto-copy"
                      tooltip="Copies successful output back into the clipboard immediately after a run."
                      description="Copy successful output back to the clipboard."
                      checked={sync.behavior.autoCopy}
                      onCheckedChange={(checked) =>
                        setSync((current) => ({
                          ...current,
                          behavior: { ...current.behavior, autoCopy: checked },
                        }))
                      }
                    />
                    <ToggleField
                      label="Toasts"
                      description="Show quiet success and error toasts at the page edge."
                      checked={sync.behavior.toastsEnabled}
                      onCheckedChange={(checked) =>
                        setSync((current) => ({
                          ...current,
                          behavior: { ...current.behavior, toastsEnabled: checked },
                        }))
                      }
                    />
                    <Field label="Auto-clear ms">
                      <Input
                        type="number"
                        className="rounded-lg"
                        value={sync.behavior.autoClearMs}
                        onChange={(event) =>
                          setSync((current) => ({
                            ...current,
                            behavior: {
                              ...current.behavior,
                              autoClearMs: Number(event.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </Field>
                    <Field label="Typing WPM" tooltip="Controls the simulated typing speed when output is typed into the page.">
                      <Input
                        type="number"
                        className="rounded-lg"
                        value={sync.typing.wordsPerMinute}
                        onChange={(event) =>
                          setSync((current) => ({
                            ...current,
                            typing: {
                              ...current.typing,
                              wordsPerMinute: Number(event.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </Field>
                    <Field label="Thinking pause min ms">
                      <Input
                        type="number"
                        className="rounded-lg"
                        value={sync.typing.thinkingPauseMinMs}
                        onChange={(event) =>
                          setSync((current) => ({
                            ...current,
                            typing: {
                              ...current.typing,
                              thinkingPauseMinMs: Number(event.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </Field>
                    <Field label="Thinking pause max ms">
                      <Input
                        type="number"
                        className="rounded-lg"
                        value={sync.typing.thinkingPauseMaxMs}
                        onChange={(event) =>
                          setSync((current) => ({
                            ...current,
                            typing: {
                              ...current.typing,
                              thinkingPauseMaxMs: Number(event.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </Field>
                    <Field label="Humanization" tooltip="Adds slight timing variation to reduce robotic typing cadence.">
                      <Input
                        type="number"
                        className="rounded-lg"
                        value={sync.typing.humanization}
                        onChange={(event) =>
                          setSync((current) => ({
                            ...current,
                            typing: {
                              ...current.typing,
                              humanization: Number(event.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </Field>
                    <ToggleField
                      label="Thinking pauses"
                      description="Pause occasionally at spaces during simulated typing."
                      checked={sync.typing.thinkingPauses}
                      onCheckedChange={(checked) =>
                        setSync((current) => ({
                          ...current,
                          typing: { ...current.typing, thinkingPauses: checked },
                        }))
                      }
                    />
                    <ToggleField
                      label="Slow punctuation"
                      description="Add extra delay for punctuation and line breaks."
                      checked={sync.typing.specialCharacterSlowdown}
                      onCheckedChange={(checked) =>
                        setSync((current) => ({
                          ...current,
                          typing: {
                            ...current.typing,
                            specialCharacterSlowdown: checked,
                          },
                        }))
                      }
                    />
                    <ToggleField
                      label="Strip accents"
                      description="Useful when target fields dislike composed characters."
                      checked={sync.typing.noAccents}
                      onCheckedChange={(checked) =>
                        setSync((current) => ({
                          ...current,
                          typing: { ...current.typing, noAccents: checked },
                        }))
                      }
                    />
                  </div>
                </Surface>

                <Surface
                  eyebrow="Overlay"
                  title="On-page stealth visuals"
                  description="Restore the full overlay and selection controls instead of only exposing two color fields."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Overlay color" tooltip="Sets the answer overlay color used on-page for short responses and answer letters.">
                      <div className="flex items-center gap-3">
                        <Input
                          type="color"
                          className="h-12 w-16 rounded-lg p-1"
                          value={sync.overlay.color}
                          onChange={(event) =>
                            setSync((current) => ({
                              ...current,
                              overlay: { ...current.overlay, color: event.target.value },
                            }))
                          }
                        />
                        <Input
                          className="rounded-lg"
                          value={sync.overlay.color}
                          onChange={(event) =>
                            setSync((current) => ({
                              ...current,
                              overlay: { ...current.overlay, color: event.target.value },
                            }))
                          }
                        />
                      </div>
                    </Field>
                    <Field label="Overlay size">
                      <Input
                        type="number"
                        className="rounded-lg"
                        value={sync.overlay.size}
                        onChange={(event) =>
                          setSync((current) => ({
                            ...current,
                            overlay: {
                              ...current.overlay,
                              size: Number(event.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </Field>
                    <Field label="Overlay opacity">
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        className="rounded-lg"
                        value={sync.overlay.opacity}
                        onChange={(event) =>
                          setSync((current) => ({
                            ...current,
                            overlay: {
                              ...current.overlay,
                              opacity: Number(event.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </Field>
                    <Field label="Top offset">
                      <Input
                        type="number"
                        className="rounded-lg"
                        value={sync.overlay.offsetTop}
                        onChange={(event) =>
                          setSync((current) => ({
                            ...current,
                            overlay: {
                              ...current.overlay,
                              offsetTop: Number(event.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </Field>
                    <Field label="Right offset">
                      <Input
                        type="number"
                        className="rounded-lg"
                        value={sync.overlay.offsetRight}
                        onChange={(event) =>
                          setSync((current) => ({
                            ...current,
                            overlay: {
                              ...current.overlay,
                              offsetRight: Number(event.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </Field>
                    <ToggleField
                      label="Auto-show overlay"
                      description="Show the answer overlay automatically for short answer modes."
                      checked={sync.overlay.autoShowOnAnswers}
                      onCheckedChange={(checked) =>
                        setSync((current) => ({
                          ...current,
                          overlay: {
                            ...current.overlay,
                            autoShowOnAnswers: checked,
                          },
                        }))
                      }
                    />
                    <ToggleField
                      label="Background box"
                      description="Render the overlay on a translucent backing plate."
                      checked={sync.overlay.backgroundBox}
                      onCheckedChange={(checked) =>
                        setSync((current) => ({
                          ...current,
                          overlay: { ...current.overlay, backgroundBox: checked },
                        }))
                      }
                    />
                    <ToggleField
                      label="Shadow"
                      description="Add a small contrast shadow behind overlay text."
                      checked={sync.overlay.shadow}
                      onCheckedChange={(checked) =>
                        setSync((current) => ({
                          ...current,
                          overlay: { ...current.overlay, shadow: checked },
                        }))
                      }
                    />
                    <ToggleField
                      label="Animate"
                      description="Use a subtle vertical ease when the overlay appears."
                      checked={sync.overlay.animate}
                      onCheckedChange={(checked) =>
                        setSync((current) => ({
                          ...current,
                          overlay: { ...current.overlay, animate: checked },
                        }))
                      }
                    />
                    <ToggleField
                      label="Prefer letters"
                      tooltip="When possible, extracts A/B/C/D style answers before rendering the overlay."
                      description="Try to extract A/B/C/D before rendering overlay text."
                      checked={sync.overlay.preferLetters}
                      onCheckedChange={(checked) =>
                        setSync((current) => ({
                          ...current,
                          overlay: { ...current.overlay, preferLetters: checked },
                        }))
                      }
                    />
                  </div>
                </Surface>

                <Surface
                  eyebrow="Selection"
                  title="Selection styling"
                  description="What the page highlight actually looks like when you invoke the extension."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <ToggleField
                      label="Background highlight"
                      description="Turn custom selection background on or off."
                      checked={sync.selectionColors.backgroundEnabled}
                      onCheckedChange={(checked) =>
                        setSync((current) => ({
                          ...current,
                          selectionColors: {
                            ...current.selectionColors,
                            backgroundEnabled: checked,
                          },
                        }))
                      }
                    />
                    <Field label="Background color" tooltip="Preview and configure the injected selection highlight background color.">
                      <div className="flex items-center gap-3">
                        <Input
                          type="color"
                          className="h-12 w-16 rounded-lg p-1"
                          value={sync.selectionColors.backgroundColor}
                          onChange={(event) =>
                            setSync((current) => ({
                              ...current,
                              selectionColors: {
                                ...current.selectionColors,
                                backgroundColor: event.target.value,
                              },
                            }))
                          }
                        />
                        <Input
                          className="rounded-lg"
                          value={sync.selectionColors.backgroundColor}
                          onChange={(event) =>
                            setSync((current) => ({
                              ...current,
                              selectionColors: {
                                ...current.selectionColors,
                                backgroundColor: event.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </Field>
                    <Field label="Background opacity">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        className="rounded-lg"
                        value={sync.selectionColors.backgroundOpacity}
                        onChange={(event) =>
                          setSync((current) => ({
                            ...current,
                            selectionColors: {
                              ...current.selectionColors,
                              backgroundOpacity: Number(event.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </Field>
                    <ToggleField
                      label="Text recolor"
                      description="Apply a custom foreground color inside the selection."
                      checked={sync.selectionColors.textEnabled}
                      onCheckedChange={(checked) =>
                        setSync((current) => ({
                          ...current,
                          selectionColors: {
                            ...current.selectionColors,
                            textEnabled: checked,
                          },
                        }))
                      }
                    />
                    <Field label="Text color">
                      <div className="flex items-center gap-3">
                        <Input
                          type="color"
                          className="h-12 w-16 rounded-lg p-1"
                          value={sync.selectionColors.textColor}
                          onChange={(event) =>
                            setSync((current) => ({
                              ...current,
                              selectionColors: {
                                ...current.selectionColors,
                                textColor: event.target.value,
                              },
                            }))
                          }
                        />
                        <Input
                          className="rounded-lg"
                          value={sync.selectionColors.textColor}
                          onChange={(event) =>
                            setSync((current) => ({
                              ...current,
                              selectionColors: {
                                ...current.selectionColors,
                                textColor: event.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </Field>
                    <Field label="Text opacity">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        className="rounded-lg"
                        value={sync.selectionColors.textOpacity}
                        onChange={(event) =>
                          setSync((current) => ({
                            ...current,
                            selectionColors: {
                              ...current.selectionColors,
                              textOpacity: Number(event.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </Field>
                  </div>
                </Surface>
              </>
            ) : null}

            {section === "shortcuts" ? (
              <Surface
                eyebrow="Hotkeys"
                title="Keyboard triggers"
                description="Restore the old shortcut surface, but keep it visually quiet."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {HOTKEY_FIELDS.map((item) => (
                    <Field
                      key={item.key}
                      label={item.label}
                      tooltip="Use the same chord format as the legacy extension, for example Ctrl+Shift+T."
                    >
                      <Input
                        className="rounded-lg"
                        value={sync.hotkeys[item.key]}
                        onChange={(event) =>
                          updateHotkeyField(item.key, event.target.value)
                        }
                      />
                    </Field>
                  ))}
                </div>
              </Surface>
            ) : null}

            {section === "system" ? (
              <>
                <Surface
                  eyebrow="State"
                  title="Config lifecycle"
                  description="Imports, exports, and defaults without burying the actions in another tab stack."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <ToggleField
                      label="Export secrets"
                      description="Include API keys when exporting the full config snapshot."
                      checked={includeSecrets}
                      onCheckedChange={setIncludeSecrets}
                    />
                    <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
                      The exported file includes both synced and local settings. Keeping secrets off
                      makes it portable; turning them on makes it restore-ready.
                    </div>
                  </div>
                </Surface>

                <Surface
                  eyebrow="Reset"
                  title="Hard reset"
                  description="One destructive action, isolated and obvious."
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="destructive" className="rounded-lg" onClick={() => void reset()}>
                      <RefreshCcw className="size-4" />
                      Restore defaults
                    </Button>
                  </div>
                </Surface>
              </>
            ) : null}
          </main>

          <aside className="hidden xl:block">
            <div className="sticky top-6 space-y-4">
              <PreviewSurface
                eyebrow="Live route"
                title={PROVIDERS[sync.behavior.defaultProviderId].label}
                description="Current default path"
              >
                <div className="space-y-3 text-sm text-muted-foreground">
                  <PreviewRow
                    label="Text model"
                    value={
                      sync.behavior.defaultProviderId === "codex"
                        ? local.codex.model
                        : local[sync.behavior.defaultProviderId as HostedProviderId].textModel
                    }
                  />
                  <PreviewRow
                    label="Mode"
                    value={`${sync.profile.mode} · ${sync.profile.outputFormat} · ${sync.profile.length}`}
                  />
                  <PreviewRow
                    label="Auto copy"
                    value={sync.behavior.autoCopy ? "on" : "off"}
                  />
                  <PreviewRow
                    label="Toasts"
                    value={sync.behavior.toastsEnabled ? "on" : "off"}
                  />
                </div>
              </PreviewSurface>

              <PreviewSurface
                eyebrow="Page preview"
                title="Selection + overlay"
                description="What the stealth layer currently looks like"
              >
                <div className="relative overflow-hidden rounded-lg border border-border bg-card p-5">
                  <div className="absolute right-4 top-4 text-center">
                    <div
                      className="font-mono font-bold"
                      style={{
                        color: sync.overlay.color,
                        opacity: sync.overlay.opacity,
                        fontSize: `${Math.max(20, Math.min(sync.overlay.size, 46))}px`,
                        textShadow: sync.overlay.shadow
                          ? "1px 1px 4px rgba(0,0,0,0.25)"
                          : "none",
                        background: sync.overlay.backgroundBox
                          ? "rgba(7,20,31,0.12)"
                          : "transparent",
                        borderRadius: "14px",
                        padding: sync.overlay.backgroundBox ? "4px 10px" : "0",
                      }}
                    >
                      {sync.overlay.preferLetters ? "b" : "PING"}
                    </div>
                  </div>
                  <div className="space-y-3 pr-16">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      selected text
                    </p>
                    <p className="text-sm leading-6 text-foreground/85">
                      The relay reads a page fragment, compresses it, and returns a quiet answer.
                    </p>
                    <p
                      className="inline rounded px-1.5 py-0.5 text-sm"
                      style={{
                        backgroundColor: selectionBackground,
                        color: selectionForeground,
                      }}
                    >
                      Highlight preview for the current selection colors.
                    </p>
                  </div>
                </div>
              </PreviewSurface>

              <PreviewSurface
                eyebrow="Response preview"
                title="Sample output"
                description="Live approximation of the response style"
              >
                <div className="space-y-3">
                  <div className="rounded-lg border border-border bg-background p-4 text-sm leading-6 text-foreground/90">
                    {previewOutput}
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4 text-xs leading-6 text-muted-foreground">
                    {activePrompt}
                  </div>
                </div>
              </PreviewSurface>

              <PreviewSurface
                eyebrow="Codex bridge"
                title="Local exec shape"
                description="What the bridge will send when Codex is active"
              >
                <ScrollArea className="h-[180px] rounded-lg border border-border bg-background p-4">
                  <pre className="m-0 whitespace-pre-wrap font-mono text-[11px] leading-5 text-muted-foreground">
                    {codexCommandPreview}
                  </pre>
                </ScrollArea>
              </PreviewSurface>
            </div>
          </aside>
        </div>
      </div>
    </div>
    </TooltipProvider>
  )
}

function Surface({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-card px-5 py-5 md:px-6">
      <div className="mb-5 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {eyebrow}
        </p>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function PreviewSurface({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-card px-4 py-4">
      <div className="mb-3 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
          {eyebrow}
        </p>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  tooltip,
  children,
}: {
  label: string
  tooltip?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </Label>
        {tooltip ? <InfoTooltip content={tooltip} /> : null}
      </div>
      {children}
    </div>
  )
}

function ToggleField({
  label,
  tooltip,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  tooltip?: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <ToggleRow
        title={label}
        tooltip={tooltip}
        description={description}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

function ToggleRow({
  title,
  tooltip,
  description,
  checked,
  onCheckedChange,
}: {
  title: string
  tooltip?: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1 pr-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {tooltip ? <InfoTooltip content={tooltip} /> : null}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          className="inline-flex size-4 items-center justify-center text-muted-foreground/80 transition-colors hover:text-foreground"
          aria-label="More information"
        >
          <CircleHelp className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px] text-pretty leading-5">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <span className="max-w-[180px] truncate text-right font-mono text-xs text-foreground/90">
        {value}
      </span>
    </div>
  )
}

function buildPreviewOutput(sync: SyncSettings): string {
  if (sync.profile.mode === "singleAnswer") {
    return sync.profile.outputFormat === "json" ? '{"answer":"b"}' : "b"
  }
  if (sync.profile.mode === "shortAnswer") {
    return sync.profile.outputFormat === "json"
      ? '{"answer":"paris"}'
      : "paris"
  }
  if (sync.profile.mode === "student") {
    return "Paris is the capital of France. Keep the answer short and clear."
  }
  return "Paris is the capital of France. The relay returns only the needed result, without filler or markdown."
}

function buildCodexCommandPreview(codex: LocalSettings["codex"]): string {
  const parts = [
    "codex exec",
    "--skip-git-repo-check",
    "--ephemeral",
    "--color never",
    '-c sandbox_mode="read-only"',
    '-c approval_policy="never"',
    `-c model_reasoning_effort=${codex.reasoningEffort}`,
  ]

  if (codex.model && codex.model !== "default") {
    parts.push(`--model ${codex.model}`)
  }

  parts.push("-")

  return [
    parts.join(" \\\n  "),
    "",
    `host_name = ${codex.hostName}`,
    `timeout_ms = ${codex.timeoutMs}`,
    `cwd = ${codex.workingDirectory || "$HOME"}`,
  ].join("\n")
}

function hexToRgba(hex: string, opacityPercent: number): string {
  const normalized = hex.replace("#", "")
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  const alpha = Math.min(Math.max(opacityPercent, 0), 100) / 100
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
