import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@/styles.css"
import { Toaster } from "sonner"
import { PopupApp } from "@/popup/popup-app"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PopupApp />
    <Toaster richColors position="top-right" />
  </StrictMode>,
)
