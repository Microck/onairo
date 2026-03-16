import type { ProviderId } from "@/features/settings/schema"

export type PageAction =
  | "inputSelectedText"
  | "inputClipboardText"
  | "inputImage"
  | "captureArea"
  | "pasteOutputText"
  | "typeOutputText"
  | "copyOutputText"
  | "showOutputTooltip"
  | "showAnswerOverlay"

export type RuntimeMessage =
  | {
      type: "onairo-run-action"
      action: "text" | "image" | "capture"
      payload: {
        inputKind: "selectedText" | "clipboardText" | "clipboardImage" | "contextImage" | "captureArea"
        source: string
        text?: string
        imageDataUrl?: string
        providerId?: ProviderId
      }
    }
  | {
      type: "onairo-popup-action"
      action: "dispatch-tab-action" | "continue-last" | "get-popup-state"
      tabAction?: PageAction
      providerId?: ProviderId
      followUp?: string
    }
  | {
      type: "onairo-page-action"
      action: PageAction
    }
  | {
      type: "onairo-ui-toast"
      message: string
    }
  | {
      type: "onairo-ui-tooltip"
      body: string
      meta: string
    }
  | {
      type: "onairo-ui-overlay"
      answer: string
      color: string
      opacity: number
      size: number
      backgroundBox: boolean
      shadow: boolean
      animate: boolean
      offsetTop: number
      offsetRight: number
    }
  | {
      type: "onairo-ui-paste"
      text: string
    }
  | {
      type: "onairo-ui-copy"
      text: string
    }
  | {
      type: "onairo-ui-type"
      text: string
    }
