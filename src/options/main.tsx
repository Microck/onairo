import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Toaster } from "sonner"
import "@/styles.css"
import { OptionsApp } from "@/options/options-app"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OptionsApp />
    <Toaster richColors position="top-right" />
  </StrictMode>,
)
