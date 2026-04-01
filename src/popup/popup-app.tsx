import {
  ArrowRight,
  Clipboard,
  Copy,
  Eye,
  Image,
  MousePointerClick,
  ScanLine,
  Send,
  Settings2,
  Type,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PROVIDERS } from "@/features/providers/catalog"
import { updateSyncSettings } from "@/features/settings/storage"
import type { LastRunRecord, ProviderId, SettingsSnapshot } from "@/features/settings/schema"
import type { PageAction, RuntimeMessage } from "@/types/messages"

interface PopupState {
  snapshot: SettingsSnapshot
  lastRun: LastRunRecord | null
}

export function PopupApp() {
  const [state, setState] = useState<PopupState | null>(null)
  const [followUp, setFollowUp] = useState("")
  const logoUrl = chrome.runtime.getURL("logo-mark.png")

  async function refresh(): Promise<void> {
    const response = await chrome.runtime.sendMessage({
      type: "onairo-popup-action",
      action: "get-popup-state",
    } satisfies RuntimeMessage)
    if (!response?.ok) {
      toast.error(response?.error || "Failed to load popup state.")
      return
    }
    setState({
      snapshot: response.snapshot,
      lastRun: response.lastRun,
    })
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [])

  async function dispatchTabAction(tabAction: PageAction): Promise<void> {
    const response = await chrome.runtime.sendMessage({
      type: "onairo-popup-action",
      action: "dispatch-tab-action",
      tabAction,
    } satisfies RuntimeMessage)
    if (!response?.ok) {
      toast.error(response?.error || "Action failed.")
      return
    }
    window.close()
  }

  async function continueLast(): Promise<void> {
    if (!followUp.trim()) {
      toast.error("Add a follow-up first.")
      return
    }
    const response = await chrome.runtime.sendMessage({
      type: "onairo-popup-action",
      action: "continue-last",
      followUp,
      providerId: state?.snapshot.sync.behavior.defaultProviderId,
    } satisfies RuntimeMessage)
    if (!response?.ok) {
      toast.error(response?.error || "Continue failed.")
      return
    }
    window.close()
  }

  async function updateProvider(providerId: ProviderId): Promise<void> {
    const nextSync = await updateSyncSettings((current) => ({
      ...current,
      behavior: { ...current.behavior, defaultProviderId: providerId },
    }))
    setState((current) =>
      current
        ? {
            ...current,
            snapshot: { ...current.snapshot, sync: nextSync },
          }
        : current,
    )
  }

  const providerId = state?.snapshot.sync.behavior.defaultProviderId || "kimi"
  const provider = PROVIDERS[providerId]

  return (
    <div className="min-h-screen w-[380px] px-3 py-3">
      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <section className="rounded-lg border border-border bg-background px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <img src={logoUrl} alt="Onairo logo" className="mt-0.5 size-10 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Onairo
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                  Quiet relay
                </h1>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  One-shot browser capture in, clean answer out.
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-lg"
              onClick={() => chrome.runtime.openOptionsPage()}
              aria-label="Open settings"
            >
              <Settings2 className="size-4" />
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Active provider
            </p>
            <Select value={providerId} onValueChange={(value) => void updateProvider(value as ProviderId)}>
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PROVIDERS).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Quick actions
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{provider.label}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <QuickAction icon={MousePointerClick} label="Selected text" onClick={() => void dispatchTabAction("inputSelectedText")} />
            <QuickAction icon={Clipboard} label="Clipboard text" onClick={() => void dispatchTabAction("inputClipboardText")} />
            <QuickAction icon={Image} label="Clipboard image" onClick={() => void dispatchTabAction("inputImage")} disabled={!provider.supportsClipboardImage} />
            <QuickAction icon={ScanLine} label="Capture area" onClick={() => void dispatchTabAction("captureArea")} disabled={!provider.supportsVision} />
            <QuickAction icon={Copy} label="Copy last" onClick={() => void dispatchTabAction("copyOutputText")} />
            <QuickAction icon={Type} label="Type last" onClick={() => void dispatchTabAction("typeOutputText")} />
            <QuickAction icon={ArrowRight} label="Paste last" onClick={() => void dispatchTabAction("pasteOutputText")} />
            <QuickAction icon={Eye} label="Show overlay" onClick={() => void dispatchTabAction("showAnswerOverlay")} />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background px-4 py-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Continue last
              </p>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Manual follow-up</h2>
                <p className="text-xs leading-5 text-muted-foreground">
                  Manual follow-up using the last run only.
                </p>
              </div>
            </div>
            <Textarea
              value={followUp}
              onChange={(event) => setFollowUp(event.target.value)}
              placeholder="Add a precise follow-up..."
              className="min-h-[88px] rounded-lg"
            />
            <Button className="w-full rounded-lg" onClick={() => void continueLast()}>
              <Send className="size-4" />
              Continue last
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background px-4 py-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Last output
                </p>
                <h2 className="mt-1 text-sm font-semibold text-foreground">
                  Quick cache
                </h2>
                <p className="text-xs leading-5 text-muted-foreground">
                  {state?.lastRun?.meta || "No run yet."}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => void dispatchTabAction("showOutputTooltip")}
              >
                Show
              </Button>
            </div>
            <ScrollArea className="h-28 rounded-lg border border-border bg-background p-3">
              <div className="text-sm leading-6 text-foreground/90">
                {state?.lastRun?.output || "Run something from the page to populate the quick output cache."}
              </div>
            </ScrollArea>
          </div>
        </section>
      </div>
    </div>
  )
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof MousePointerClick
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      variant="ghost"
      className="h-auto rounded-lg border border-border bg-background px-3 py-3 text-left hover:bg-card"
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex w-full items-start gap-2">
        <Icon className="mt-0.5 size-4 shrink-0" />
        <span className="text-xs font-semibold leading-5">{label}</span>
      </div>
    </Button>
  )
}
