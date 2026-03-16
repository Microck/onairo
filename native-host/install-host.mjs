#!/usr/bin/env node

import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const args = parseArgs(process.argv.slice(2))

if (args.help || !args.extensionId) {
  printUsage()
  process.exit(args.help ? 0 : 1)
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const hostPath = path.join(scriptDirectory, "onairo-codex-host.mjs")
const manifest = {
  name: args.hostName,
  description: "Onairo Codex CLI native-messaging bridge",
  path: hostPath,
  type: "stdio",
  allowed_origins: [`chrome-extension://${args.extensionId}/`],
}

for (const manifestDirectory of resolveManifestDirectories(args.browser)) {
  await fs.mkdir(manifestDirectory, { recursive: true })
  const manifestPath = path.join(manifestDirectory, `${args.hostName}.json`)
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
  console.log(`Wrote ${manifestPath}`)
}

function parseArgs(argv) {
  const parsed = {
    browser: "both",
    extensionId: "",
    help: false,
    hostName: "dev.onairo.codex",
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === "--help" || argument === "-h") {
      parsed.help = true
      continue
    }
    if (argument === "--extension-id") {
      parsed.extensionId = argv[index + 1] || ""
      index += 1
      continue
    }
    if (argument === "--browser") {
      parsed.browser = argv[index + 1] || "both"
      index += 1
      continue
    }
    if (argument === "--host-name") {
      parsed.hostName = argv[index + 1] || parsed.hostName
      index += 1
      continue
    }
    throw new Error(`Unknown argument: ${argument}`)
  }

  return parsed
}

function resolveManifestDirectories(browser) {
  const home = os.homedir()
  switch (browser) {
    case "chromium":
      return [path.join(home, ".config", "chromium", "NativeMessagingHosts")]
    case "chrome":
      return [path.join(home, ".config", "google-chrome", "NativeMessagingHosts")]
    case "both":
      return [
        path.join(home, ".config", "chromium", "NativeMessagingHosts"),
        path.join(home, ".config", "google-chrome", "NativeMessagingHosts"),
      ]
    default:
      throw new Error(`Unsupported browser: ${browser}`)
  }
}

function printUsage() {
  console.log(`Usage: node native-host/install-host.mjs --extension-id <id> [--browser chromium|chrome|both] [--host-name dev.onairo.codex]

This writes the native-messaging manifest for the current unpacked Onairo extension ID.`)
}
