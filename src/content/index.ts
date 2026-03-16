import type { SyncSettings } from "@/features/settings/schema"
import { getSyncSettings } from "@/features/settings/storage"
import type { PageAction, RuntimeMessage } from "@/types/messages"

let settings: SyncSettings
let toastEl: HTMLDivElement | null = null
let tooltipEl: HTMLDivElement | null = null
let hoveredImageSrc = ""

void init()

async function init(): Promise<void> {
  settings = await getSyncSettings()
  buildUiShell()
  wireEvents()
  applySelectionColors()
}

function wireEvents(): void {
  document.addEventListener(
    "mouseover",
    (event) => {
      const target = event.target
      if (target instanceof HTMLImageElement && target.src) {
        hoveredImageSrc = target.src
      }
    },
    true,
  )

  window.addEventListener(
    "keydown",
    (event) => {
      if (matchesHotkey(event, settings.hotkeys.inputSelectedText)) {
        event.preventDefault()
        void inputSelectedText()
      } else if (matchesHotkey(event, settings.hotkeys.inputClipboardText)) {
        event.preventDefault()
        void inputClipboardText()
      } else if (matchesHotkey(event, settings.hotkeys.inputImage)) {
        event.preventDefault()
        void inputImage()
      } else if (matchesHotkey(event, settings.hotkeys.captureArea)) {
        event.preventDefault()
        void startCaptureOverlay()
      } else if (matchesHotkey(event, settings.hotkeys.pasteOutputText)) {
        event.preventDefault()
        void chrome.runtime.sendMessage({
          type: "onairo-popup-action",
          action: "dispatch-tab-action",
          tabAction: "pasteOutputText",
        } satisfies RuntimeMessage)
      } else if (matchesHotkey(event, settings.hotkeys.typeOutputText)) {
        event.preventDefault()
        void chrome.runtime.sendMessage({
          type: "onairo-popup-action",
          action: "dispatch-tab-action",
          tabAction: "typeOutputText",
        } satisfies RuntimeMessage)
      } else if (matchesHotkey(event, settings.hotkeys.copyOutputText)) {
        event.preventDefault()
        void chrome.runtime.sendMessage({
          type: "onairo-popup-action",
          action: "dispatch-tab-action",
          tabAction: "copyOutputText",
        } satisfies RuntimeMessage)
      } else if (matchesHotkey(event, settings.hotkeys.showOutputTooltip)) {
        event.preventDefault()
        void chrome.runtime.sendMessage({
          type: "onairo-popup-action",
          action: "dispatch-tab-action",
          tabAction: "showOutputTooltip",
        } satisfies RuntimeMessage)
      } else if (matchesHotkey(event, settings.hotkeys.showAnswerOverlay)) {
        event.preventDefault()
        void chrome.runtime.sendMessage({
          type: "onairo-popup-action",
          action: "dispatch-tab-action",
          tabAction: "showAnswerOverlay",
        } satisfies RuntimeMessage)
      }
    },
    true,
  )

  chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
    if (message.type === "onairo-page-action") {
      void handlePageAction(message.action)
      return true
    }

    if (message.type === "onairo-ui-toast") {
      showToast(message.message)
      return true
    }

    if (message.type === "onairo-ui-tooltip") {
      showTooltip(message.body, message.meta)
      return true
    }

    if (message.type === "onairo-ui-copy") {
      void copyToClipboard(message.text)
      return true
    }

    if (message.type === "onairo-ui-paste") {
      insertAtCaret(message.text)
      return true
    }

    if (message.type === "onairo-ui-type") {
      void typeText(message.text)
      return true
    }

    if (message.type === "onairo-ui-overlay") {
      showAnswerOverlay(message)
      return true
    }

    return false
  })

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes.onairo_sync_settings?.newValue) return
    settings = changes.onairo_sync_settings.newValue as SyncSettings
    applySelectionColors()
  })
}

async function handlePageAction(action: PageAction): Promise<void> {
  switch (action) {
    case "inputSelectedText":
      await inputSelectedText()
      break
    case "inputClipboardText":
      await inputClipboardText()
      break
    case "inputImage":
      await inputImage()
      break
    case "captureArea":
      await startCaptureOverlay()
      break
    case "pasteOutputText":
    case "typeOutputText":
    case "copyOutputText":
    case "showOutputTooltip":
    case "showAnswerOverlay":
      await handleLastOutputAction(action)
      break
  }
}

async function handleLastOutputAction(
  action: "pasteOutputText" | "typeOutputText" | "copyOutputText" | "showOutputTooltip" | "showAnswerOverlay",
): Promise<void> {
  const response = await chrome.runtime.sendMessage({
    type: "onairo-popup-action",
    action: "get-popup-state",
  } satisfies RuntimeMessage)
  const lastRun = response?.lastRun
  if (!lastRun?.output) {
    showToast("No output yet.")
    return
  }

  if (action === "pasteOutputText") {
    insertAtCaret(lastRun.output)
  } else if (action === "typeOutputText") {
    await typeText(lastRun.output)
  } else if (action === "copyOutputText") {
    await copyToClipboard(lastRun.output)
    showToast("Copied.")
  } else if (action === "showOutputTooltip") {
    showTooltip(lastRun.output, lastRun.meta || "")
  } else {
    showAnswerOverlay({
      type: "onairo-ui-overlay",
      answer: lastRun.output,
      color: settings.overlay.color,
      opacity: settings.overlay.opacity,
      size: settings.overlay.size,
      backgroundBox: settings.overlay.backgroundBox,
      shadow: settings.overlay.shadow,
      animate: settings.overlay.animate,
      offsetTop: settings.overlay.offsetTop,
      offsetRight: settings.overlay.offsetRight,
    })
  }
}

async function inputSelectedText(): Promise<void> {
  let text = String(window.getSelection()?.toString() || "").trim()
  if (!text) {
    text = await readClipboardText()
  }
  if (!text) {
    showToast("No selection or clipboard text.")
    return
  }
  await chrome.runtime.sendMessage({
    type: "onairo-run-action",
    action: "text",
    payload: {
      inputKind: "selectedText",
      source: "selected-text",
      text,
    },
  } satisfies RuntimeMessage)
}

async function inputClipboardText(): Promise<void> {
  const text = await readClipboardText()
  if (!text) {
    showToast("Clipboard text is empty.")
    return
  }
  await chrome.runtime.sendMessage({
    type: "onairo-run-action",
    action: "text",
    payload: {
      inputKind: "clipboardText",
      source: "clipboard-text",
      text,
    },
  } satisfies RuntimeMessage)
}

async function inputImage(): Promise<void> {
  const clipboardImage = await readClipboardImage()
  if (clipboardImage) {
    await chrome.runtime.sendMessage({
      type: "onairo-run-action",
      action: "image",
      payload: {
        inputKind: "clipboardImage",
        source: "clipboard-image",
        imageDataUrl: clipboardImage,
      },
    } satisfies RuntimeMessage)
    return
  }

  if (hoveredImageSrc) {
    await chrome.runtime.sendMessage({
      type: "onairo-run-action",
      action: "image",
      payload: {
        inputKind: "contextImage",
        source: "hovered-image",
        imageDataUrl: await imageUrlToDataUrl(hoveredImageSrc),
      },
    } satisfies RuntimeMessage)
    return
  }

  showToast("No clipboard image or hovered image.")
}

async function startCaptureOverlay(): Promise<void> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    showToast("Screen capture is unavailable here.")
    return
  }

  const overlay = document.createElement("div")
  overlay.style.cssText = "position:fixed;inset:0;z-index:2147483646;cursor:crosshair;background:rgba(0,0,0,0.18);"
  const canvas = document.createElement("canvas")
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"
  overlay.appendChild(canvas)
  document.documentElement.appendChild(overlay)
  const context = canvas.getContext("2d")
  const state: { start?: { x: number; y: number }; end?: { x: number; y: number } } = {}
  resizeCanvas()

  let stream: MediaStream | null = null
  const video = document.createElement("video")
  video.playsInline = true

  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    video.srcObject = stream
    await video.play()
  } catch {
    cleanup()
    return
  }

  overlay.addEventListener("mousemove", (event) => {
    if (!state.start || !context) return
    state.end = { x: event.clientX, y: event.clientY }
    drawSelection()
  })

  overlay.addEventListener("click", async (event) => {
    if (!state.start) {
      state.start = { x: event.clientX, y: event.clientY }
      state.end = { x: event.clientX, y: event.clientY }
      drawSelection()
      return
    }

    state.end = { x: event.clientX, y: event.clientY }
    const crop = cropCapture(video, overlay, state.start, state.end)
    cleanup()
    await chrome.runtime.sendMessage({
      type: "onairo-run-action",
      action: "capture",
      payload: {
        inputKind: "captureArea",
        source: "capture-area",
        imageDataUrl: crop,
      },
    } satisfies RuntimeMessage)
  })

  window.addEventListener("keydown", onEscape, true)
  window.addEventListener("resize", resizeCanvas)

  function resizeCanvas(): void {
    canvas.width = overlay.clientWidth * window.devicePixelRatio
    canvas.height = overlay.clientHeight * window.devicePixelRatio
  }

  function drawSelection(): void {
    if (!context || !state.start || !state.end) return
    const dpr = window.devicePixelRatio || 1
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = "rgba(255,255,255,0.95)"
    context.lineWidth = 2 * dpr
    const x = Math.min(state.start.x, state.end.x) * dpr
    const y = Math.min(state.start.y, state.end.y) * dpr
    const width = Math.abs(state.end.x - state.start.x) * dpr
    const height = Math.abs(state.end.y - state.start.y) * dpr
    context.strokeRect(x, y, width, height)
  }

  function onEscape(event: KeyboardEvent): void {
    if (event.key === "Escape") cleanup()
  }

  function cleanup(): void {
    overlay.remove()
    stream?.getTracks().forEach((track) => track.stop())
    window.removeEventListener("keydown", onEscape, true)
    window.removeEventListener("resize", resizeCanvas)
  }
}

function cropCapture(
  video: HTMLVideoElement,
  overlay: HTMLDivElement,
  start: { x: number; y: number },
  end: { x: number; y: number },
): string {
  const bounds = overlay.getBoundingClientRect()
  const scale = Math.min(bounds.width / video.videoWidth, bounds.height / video.videoHeight)
  const displayedWidth = video.videoWidth * scale
  const displayedHeight = video.videoHeight * scale
  const dx = (bounds.width - displayedWidth) / 2
  const dy = (bounds.height - displayedHeight) / 2
  const x1 = clamp((Math.min(start.x, end.x) - dx) / displayedWidth, 0, 1)
  const x2 = clamp((Math.max(start.x, end.x) - dx) / displayedWidth, 0, 1)
  const y1 = clamp((Math.min(start.y, end.y) - dy) / displayedHeight, 0, 1)
  const y2 = clamp((Math.max(start.y, end.y) - dy) / displayedHeight, 0, 1)
  const crop = document.createElement("canvas")
  crop.width = Math.max(1, Math.round((x2 - x1) * video.videoWidth))
  crop.height = Math.max(1, Math.round((y2 - y1) * video.videoHeight))
  const context = crop.getContext("2d")
  context?.drawImage(
    video,
    Math.round(x1 * video.videoWidth),
    Math.round(y1 * video.videoHeight),
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  )
  return crop.toDataURL("image/jpeg", 0.9)
}

function buildUiShell(): void {
  toastEl = document.createElement("div")
  toastEl.style.cssText =
    "position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147483647;padding:8px 12px;border-radius:999px;background:rgba(17,24,39,0.92);color:white;font:12px 'JetBrains Mono',monospace;display:none;"
  tooltipEl = document.createElement("div")
  tooltipEl.style.cssText =
    "position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:min(420px,95vw);max-height:55vh;overflow:auto;border-radius:16px;border:1px solid rgba(148,163,184,.3);background:rgba(255,255,255,.96);backdrop-filter:blur(14px);box-shadow:0 22px 60px rgba(15,23,42,.24);display:none;"
  document.documentElement.appendChild(toastEl)
  document.documentElement.appendChild(tooltipEl)
}

function showToast(message: string): void {
  if (!settings.behavior.toastsEnabled || !toastEl) return
  toastEl.textContent = message
  toastEl.style.display = "block"
  window.clearTimeout(Number(toastEl.dataset.timer || "0"))
  const timer = window.setTimeout(() => {
    if (toastEl) toastEl.style.display = "none"
  }, 1800)
  toastEl.dataset.timer = String(timer)
}

function showTooltip(body: string, meta: string): void {
  if (!tooltipEl) return
  tooltipEl.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(148,163,184,.2);">
      <div style="font:600 12px 'JetBrains Mono',monospace;color:#0f172a;">Onairo Output</div>
      <button id="onairo-tooltip-close" style="border:none;background:transparent;cursor:pointer;color:#475569;font:600 12px 'JetBrains Mono',monospace;">close</button>
    </div>
    <div style="padding:12px 14px;font:500 12px 'JetBrains Mono',monospace;color:#334155;white-space:pre-wrap;">${escapeHtml(meta)}</div>
    <div style="padding:0 14px 14px;font:14px/1.5 'Space Grotesk',sans-serif;color:#0f172a;white-space:pre-wrap;">${escapeHtml(body)}</div>
  `
  tooltipEl.style.display = "block"
  document.getElementById("onairo-tooltip-close")?.addEventListener("click", () => {
    if (tooltipEl) tooltipEl.style.display = "none"
  })
}

function showAnswerOverlay(message: Extract<RuntimeMessage, { type: "onairo-ui-overlay" }>): void {
  const existing = document.getElementById("onairo-answer-overlay")
  existing?.remove()
  const overlay = document.createElement("div")
  overlay.id = "onairo-answer-overlay"
  overlay.textContent = message.answer.trim()
  overlay.style.cssText = [
    "position:fixed",
    `top:${Math.max(0, message.offsetTop)}px`,
    `right:${Math.max(0, message.offsetRight)}px`,
    "z-index:2147483647",
    `font-size:${message.size}px`,
    "font-weight:700",
    "font-family:'JetBrains Mono', monospace",
    `color:${message.color}`,
    `opacity:${message.opacity}`,
    "user-select:none",
    "cursor:pointer",
    "text-align:center",
    message.shadow ? "text-shadow:2px 2px 4px rgba(0,0,0,0.35)" : "text-shadow:none",
    message.backgroundBox
      ? "padding:8px 16px;border-radius:12px;background:rgba(0,0,0,0.25);backdrop-filter:blur(4px)"
      : "",
  ].join(";")
  if (message.animate) {
    overlay.animate(
      [
        { opacity: 0, transform: "translateY(-10px)" },
        { opacity: message.opacity, transform: "translateY(0)" },
      ],
      { duration: 220, easing: "ease-out" },
    )
  }
  overlay.addEventListener("click", () => overlay.remove())
  document.documentElement.appendChild(overlay)
  window.setTimeout(() => overlay.remove(), 5000)
}

function applySelectionColors(): void {
  const style = document.getElementById("onairo-selection-colors") || document.createElement("style")
  style.id = "onairo-selection-colors"
  const bg = settings.selectionColors.backgroundEnabled
    ? hexToRgba(settings.selectionColors.backgroundColor, settings.selectionColors.backgroundOpacity)
    : "inherit"
  const text = settings.selectionColors.textEnabled
    ? hexToRgba(settings.selectionColors.textColor, settings.selectionColors.textOpacity)
    : "inherit"
  style.textContent = `::selection, body ::selection { background-color: ${bg} !important; color: ${text} !important; }`
  if (!style.parentNode) {
    document.head.appendChild(style)
  }
}

async function readClipboardText(): Promise<string> {
  try {
    return (await navigator.clipboard.readText()) || ""
  } catch {
    return ""
  }
}

async function readClipboardImage(): Promise<string> {
  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      const type = item.types.find((value) => value.startsWith("image/"))
      if (!type) continue
      const blob = await item.getType(type)
      const buffer = await blob.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
      return `data:${type};base64,${base64}`
    }
  } catch {
    return ""
  }
  return ""
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.opacity = "0"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    document.execCommand("copy")
    textArea.remove()
  }
}

function insertAtCaret(text: string): void {
  const active = document.activeElement
  if (!active) return
  if (active instanceof HTMLTextAreaElement || (active instanceof HTMLInputElement && /^(text|search|url|email|tel)$/i.test(active.type))) {
    const start = active.selectionStart ?? active.value.length
    const end = active.selectionEnd ?? active.value.length
    active.value = `${active.value.slice(0, start)}${text}${active.value.slice(end)}`
    active.selectionStart = active.selectionEnd = start + text.length
    active.dispatchEvent(new Event("input", { bubbles: true }))
    return
  }
  if ((active as HTMLElement).isContentEditable) {
    document.execCommand("insertText", false, text)
  }
}

async function typeText(text: string): Promise<void> {
  const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | HTMLElement | null
  if (!active) {
    showToast("Focus a text field first.")
    return
  }
  const source = settings.typing.noAccents
    ? text.normalize("NFD").replace(/\p{Diacritic}+/gu, "")
    : text
  const charsPerMinute = settings.typing.wordsPerMinute * 5
  const baseDelay = 60000 / Math.max(1, charsPerMinute)
  for (let index = 0; index < source.length; index += 1) {
    insertAtCaret(source[index] || "")
    const character = source[index] || ""
    let delay = baseDelay
    if (settings.typing.specialCharacterSlowdown && /[.!?\n]/.test(character)) {
      delay *= 1.8
    }
    if (settings.typing.thinkingPauses && /\s/.test(character) && Math.random() < 0.15) {
      delay += randomBetween(settings.typing.thinkingPauseMinMs, settings.typing.thinkingPauseMaxMs)
    }
    delay *= 1 + (Math.random() - 0.5) * (settings.typing.humanization / 10)
    await wait(Math.max(15, delay))
  }
}

async function imageUrlToDataUrl(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl)
  const blob = await response.blob()
  const buffer = await blob.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
  return `data:${blob.type || "image/png"};base64,${base64}`
}

function matchesHotkey(event: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split("+").map((part) => part.trim())
  const modifiers = {
    alt: parts.includes("alt"),
    shift: parts.includes("shift"),
    ctrl: parts.includes("ctrl") || parts.includes("control"),
    meta: parts.includes("meta") || parts.includes("cmd"),
  }
  const key = parts.find(
    (part) => !["alt", "shift", "ctrl", "control", "meta", "cmd"].includes(part),
  )
  return (
    modifiers.alt === event.altKey &&
    modifiers.shift === event.shiftKey &&
    modifiers.ctrl === event.ctrlKey &&
    modifiers.meta === event.metaKey &&
    (!key || event.key.toLowerCase() === key)
  )
}

function hexToRgba(hex: string, opacity: number): string {
  const value = hex.replace("#", "")
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${opacity / 100})`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * Math.max(0, max - min)
}
