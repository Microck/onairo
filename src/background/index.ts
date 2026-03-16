import { ensureOriginPermission } from "@/features/providers/client"
import { continueLastRun, executeInputRun, getLastRunOutput } from "@/features/runs/engine"
import { getSettingsSnapshot } from "@/features/settings/storage"
import type { PageAction, RuntimeMessage } from "@/types/messages"

const MENU_IDS: Record<string, PageAction> = {
  onairo_selected: "inputSelectedText",
  onairo_clipboard_text: "inputClipboardText",
  onairo_clipboard_image: "inputImage",
  onairo_capture: "captureArea",
  onairo_paste: "pasteOutputText",
  onairo_type: "typeOutputText",
  onairo_copy: "copyOutputText",
  onairo_show: "showOutputTooltip",
  onairo_overlay: "showAnswerOverlay",
}

chrome.runtime.onInstalled.addListener(async () => {
  await recreateMenus()
})

chrome.runtime.onStartup.addListener(async () => {
  await recreateMenus()
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const tabId = tab?.id
  if (!tabId) return

  if (info.menuItemId === "onairo_context_image") {
    const source = String(info.srcUrl || "")
    if (!source) return
    await handleProviderRun(tabId, {
      type: "onairo-run-action",
      action: "image",
      payload: {
        inputKind: "contextImage",
        source: "context-image",
        imageDataUrl: await imageUrlToDataUrl(source),
      },
    })
    return
  }

  const action = MENU_IDS[String(info.menuItemId)]
  if (action) {
    await chrome.tabs.sendMessage(tabId, {
      type: "onairo-page-action",
      action,
    } satisfies RuntimeMessage)
  }
})

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  if (!message?.type) return false

  if (message.type === "onairo-run-action") {
    void (async () => {
      const tabId = sender.tab?.id || (await getActiveTabId())
      if (!tabId) return
      try {
        const result = await executeInputRun(message.payload)
        await finalizeTabRun(tabId, result)
      } catch (error) {
        await toastInTab(tabId, formatError(error))
      }
    })()
    sendResponse({ ok: true })
    return true
  }

  if (message.type === "onairo-popup-action") {
    void (async () => {
      const tabId = await getActiveTabId()
      if (!tabId) {
        sendResponse({ ok: false, error: "No active tab." })
        return
      }

      try {
        if (message.action === "dispatch-tab-action" && message.tabAction) {
          await chrome.tabs.sendMessage(tabId, {
            type: "onairo-page-action",
            action: message.tabAction,
          } satisfies RuntimeMessage)
          sendResponse({ ok: true })
          return
        }

        if (message.action === "continue-last") {
          const result = await continueLastRun(String(message.followUp || ""), message.providerId)
          await finalizeTabRun(tabId, result)
          sendResponse({ ok: true })
          return
        }

        if (message.action === "get-popup-state") {
          const [snapshot, lastRun] = await Promise.all([
            getSettingsSnapshot(),
            getLastRunOutput(),
          ])
          sendResponse({ ok: true, snapshot, lastRun })
        }
      } catch (error) {
        sendResponse({ ok: false, error: formatError(error) })
      }
    })()
    return true
  }

  return false
})

async function recreateMenus(): Promise<void> {
  try {
    await chrome.contextMenus.removeAll()
  } catch {
    return
  }

  chrome.contextMenus.create({
    id: "onairo_selected",
    title: "Onairo: Process selected text",
    contexts: ["selection"],
  })
  chrome.contextMenus.create({
    id: "onairo_context_image",
    title: "Onairo: Describe this image",
    contexts: ["image"],
  })
  chrome.contextMenus.create({
    id: "onairo_clipboard_text",
    title: "Onairo: Process clipboard text",
    contexts: ["page"],
  })
  chrome.contextMenus.create({
    id: "onairo_clipboard_image",
    title: "Onairo: Input image from clipboard",
    contexts: ["page"],
  })
  chrome.contextMenus.create({
    id: "onairo_capture",
    title: "Onairo: Capture area (A→B)",
    contexts: ["page"],
  })
  chrome.contextMenus.create({
    id: "onairo_separator",
    type: "separator",
    contexts: ["all"],
  })
  chrome.contextMenus.create({
    id: "onairo_paste",
    title: "Onairo: Paste last output",
    contexts: ["all"],
  })
  chrome.contextMenus.create({
    id: "onairo_type",
    title: "Onairo: Type last output",
    contexts: ["all"],
  })
  chrome.contextMenus.create({
    id: "onairo_copy",
    title: "Onairo: Copy last output",
    contexts: ["all"],
  })
  chrome.contextMenus.create({
    id: "onairo_show",
    title: "Onairo: Show last output",
    contexts: ["all"],
  })
  chrome.contextMenus.create({
    id: "onairo_overlay",
    title: "Onairo: Show answer overlay",
    contexts: ["all"],
  })
}

async function finalizeTabRun(
  tabId: number,
  result: Awaited<ReturnType<typeof executeInputRun>>,
): Promise<void> {
  if (result.shouldAutoCopy) {
    await chrome.tabs.sendMessage(tabId, {
      type: "onairo-ui-copy",
      text: result.output,
    } satisfies RuntimeMessage)
  }

  if (result.shouldAutoOverlay) {
    const snapshot = await getSettingsSnapshot()
    await chrome.tabs.sendMessage(tabId, {
      type: "onairo-ui-overlay",
      answer: result.overlayText,
      color: snapshot.sync.overlay.color,
      opacity: snapshot.sync.overlay.opacity,
      size: snapshot.sync.overlay.size,
      backgroundBox: snapshot.sync.overlay.backgroundBox,
      shadow: snapshot.sync.overlay.shadow,
      animate: snapshot.sync.overlay.animate,
      offsetTop: snapshot.sync.overlay.offsetTop,
      offsetRight: snapshot.sync.overlay.offsetRight,
    } satisfies RuntimeMessage)
  }

  const readyMessage = result.shouldAutoCopy
    ? `Copied from ${result.providerLabel}.`
    : `Answer ready from ${result.providerLabel}.`

  await toastInTab(tabId, readyMessage)
}

async function handleProviderRun(tabId: number, message: Extract<RuntimeMessage, { type: "onairo-run-action" }>): Promise<void> {
  try {
    const result = await executeInputRun(message.payload)
    await finalizeTabRun(tabId, result)
  } catch (error) {
    await toastInTab(tabId, formatError(error))
  }
}

async function getActiveTabId(): Promise<number | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  return tabs[0]?.id ?? null
}

async function toastInTab(tabId: number, message: string): Promise<void> {
  await chrome.tabs.sendMessage(tabId, {
    type: "onairo-ui-toast",
    message,
  } satisfies RuntimeMessage)
}

async function imageUrlToDataUrl(imageUrl: string): Promise<string> {
  await ensureOriginPermission(imageUrl)
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Image fetch failed: ${response.status}`)
  }
  const blob = await response.blob()
  const buffer = await blob.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
  return `data:${blob.type || "image/png"};base64,${base64}`
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
