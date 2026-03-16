#!/usr/bin/env node

import { spawn } from "node:child_process"
import os from "node:os"

const stdin = process.stdin
stdin.resume()

let inputBuffer = Buffer.alloc(0)

stdin.on("data", (chunk) => {
  inputBuffer = Buffer.concat([inputBuffer, chunk])
  void drainMessages()
})

async function drainMessages() {
  while (inputBuffer.length >= 4) {
    const messageLength = inputBuffer.readUInt32LE(0)
    if (inputBuffer.length < messageLength + 4) {
      return
    }

    const payload = inputBuffer.subarray(4, messageLength + 4)
    inputBuffer = inputBuffer.subarray(messageLength + 4)

    let message
    try {
      message = JSON.parse(payload.toString("utf8"))
    } catch (error) {
      writeMessage({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      })
      continue
    }

    try {
      writeMessage(await handleMessage(message))
    } catch (error) {
      writeMessage({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

async function handleMessage(message) {
  switch (message?.type) {
    case "health":
      return runHealthcheck()
    case "run":
      return runCodex(message)
    default:
      return {
        ok: false,
        error: `Unsupported message type: ${String(message?.type || "unknown")}`,
      }
  }
}

async function runHealthcheck() {
  const probe = await runCommand("codex", ["--version"], {
    timeoutMs: 5_000,
    cwd: resolveCodexWorkingDirectory(),
  })

  if (probe.exitCode !== 0) {
    return {
      ok: false,
      error: probe.stderr.trim() || probe.stdout.trim() || "Codex CLI is unavailable.",
    }
  }

  return {
    ok: true,
    version: probe.stdout.trim() || "unknown",
  }
}

async function runCodex(message) {
  const prompt = String(message?.payload?.prompt || "").trim()
  if (!prompt) {
    return { ok: false, error: "Missing prompt." }
  }

  const timeoutMs = clampTimeout(message?.timeoutMs)
  const model = String(message?.payload?.model || "default").trim()
  const workingDirectory = String(message?.payload?.cwd || "").trim()
  const reasoningEffort = normalizeReasoningEffort(message?.payload?.reasoningEffort)

  const args = [
    "exec",
    "--skip-git-repo-check",
    "--ephemeral",
    "--color",
    "never",
    "-c",
    'sandbox_mode="read-only"',
    "-c",
    'approval_policy="never"',
    "-c",
    `model_reasoning_effort=${reasoningEffort}`,
  ]

  if (model && model !== "default") {
    args.push("--model", model)
  }

  args.push("-")

  const result = await runCommand("codex", args, {
    timeoutMs,
    cwd: resolveCodexWorkingDirectory(workingDirectory),
    stdinText: prompt,
  })

  const output = result.stdout.trim()

  if (result.exitCode !== 0) {
    return {
      ok: false,
      error: result.stderr.trim() || result.stdout.trim() || "Codex execution failed.",
      exitCode: result.exitCode,
    }
  }

  if (!output) {
    return {
      ok: false,
      error: "Codex completed without returning output.",
    }
  }

  return {
    ok: true,
    output,
    model: model || "default",
    finishReason: result.timedOut ? "timeout" : "stop",
    usageLabel: "",
  }
}

function resolveCodexWorkingDirectory(override) {
  const explicit = String(override || "").trim()
  if (explicit) return explicit
  return process.env.ONAIRO_CODEX_CWD || os.homedir()
}

function normalizeReasoningEffort(value) {
  const effort = String(value || "").trim()
  if (effort === "low" || effort === "high") return effort
  return "medium"
}

function clampTimeout(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 60_000
  return Math.min(Math.max(parsed, 5_000), 10 * 60 * 1000)
}

function writeMessage(message) {
  const serialized = Buffer.from(JSON.stringify(message), "utf8")
  const header = Buffer.alloc(4)
  header.writeUInt32LE(serialized.length, 0)
  process.stdout.write(header)
  process.stdout.write(serialized)
}

async function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""
    let settled = false
    let timedOut = false

    const timeout = setTimeout(() => {
      timedOut = true
      child.kill("SIGTERM")
      setTimeout(() => child.kill("SIGKILL"), 1_000).unref()
    }, options.timeoutMs)

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8")
    })

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8")
    })

    child.on("error", (error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(error)
    })

    child.on("close", (exitCode) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve({
        exitCode: exitCode ?? 1,
        stdout,
        stderr,
        timedOut,
      })
    })

    if (options.stdinText) {
      child.stdin.write(options.stdinText)
    }
    child.stdin.end()
  })
}
