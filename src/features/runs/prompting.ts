import type {
  OutputFormat,
  ResponseMode,
  RunProfile,
} from "@/features/settings/schema"

const LENGTH_PRESETS = {
  short: "Respond in one concise sentence. No intro.",
  medium: "Respond in one compact paragraph. Plain text only. No intro.",
  long: "Respond in one fuller paragraph. Plain text only. No intro.",
  extraLong: "Respond in about three short paragraphs. Plain text only. No intro.",
}

export function detectQuestionType(text: string): Exclude<ResponseMode, "auto"> {
  const lower = text.toLowerCase().trim()
  const lines = text.trim().split("\n")

  const multipleChoicePatterns = [/[a-d]\s*[).]/i, /^\s*[a-d]\s*[:.-]/im, /[①②③④⑤]/, /\([a-d]\)/i]
  const hasMultipleChoice = multipleChoicePatterns.some((pattern) => pattern.test(text))
  const hasMultipleOptions = lines.filter((line) => /^\s*[a-d][).:\s]/i.test(line)).length >= 2

  if (hasMultipleChoice || hasMultipleOptions) return "singleAnswer"

  const trueFalsePatterns = [/\b(true|false)\b/i, /\b(verdadero|falso)\b/i, /\b(correct|incorrect)\b/i]
  if (trueFalsePatterns.some((pattern) => pattern.test(text))) return "singleAnswer"

  const fillBlankPatterns = [/_{3,}/, /\[___+\]/, /\(\s*\)/, /fill\s+in/i, /complete\s+the/i]
  if (fillBlankPatterns.some((pattern) => pattern.test(text))) return "shortAnswer"

  const shortAnswerPatterns = [/^(what|who|when|where|which)\s+is\b/i, /^(define|explain)\s+\w+$/i, /in\s+one\s+word/i]
  if (shortAnswerPatterns.some((pattern) => pattern.test(lower)) && text.length < 200) return "shortAnswer"

  return "technical"
}

export function detectLanguage(sample: string, profile: RunProfile): "en-US" | "es-ES" {
  if (!profile.autoLangDetect) return profile.language
  const source = sample.slice(0, 800).toLowerCase()
  const spanishHints = [" el ", " la ", " para ", " que ", " de ", " por ", "¿", "¡", "ción", "ñ", "á", "é", "í", "ó", "ú"]
  const englishHints = [" the ", " and ", " with ", " for ", " of ", " to ", " in ", " on ", " is ", " are "]
  const spanishScore = spanishHints.filter((hint) => source.includes(hint)).length
  const englishScore = englishHints.filter((hint) => source.includes(hint)).length
  if (spanishScore > englishScore + 1) return "es-ES"
  if (englishScore > spanishScore + 1) return "en-US"
  return profile.language
}

export function buildSystemPrompt(
  profile: RunProfile,
  lang: "en-US" | "es-ES",
): string {
  const mode = profile.mode
  const format: OutputFormat =
    mode === "singleAnswer" || mode === "shortAnswer" ? "json" : profile.outputFormat
  const languageLine = lang === "es-ES" ? "Language: Español (España)." : "Language: English."
  const modeLine =
    mode === "technical"
      ? lang === "es-ES"
        ? "Modo: técnico, preciso y conciso."
        : "Mode: technical assistant. Use precise terminology and stay concise."
      : mode === "student"
        ? lang === "es-ES"
          ? "Modo: estudiante. Lenguaje sencillo, claro y natural."
          : "Mode: student helper. Use simple, clear language."
        : mode === "singleAnswer"
          ? lang === "es-ES"
            ? "Modo: respuesta única."
            : "Mode: single answer."
          : mode === "shortAnswer"
            ? lang === "es-ES"
              ? "Modo: respuesta corta."
              : "Mode: short answer."
            : lang === "es-ES"
              ? "Modo: automático."
              : "Mode: automatic."

  const formatLine =
    format === "json"
      ? "Output format: JSON only. No code fences, markdown, or extra keys."
      : "Output format: plain text only. No markdown, no bullets, no intro text."
  const jsonRule =
    format === "json" ? 'Return only {"answer":"..."} with no additional keys.' : ""
  const lengthRule =
    mode === "singleAnswer" || mode === "shortAnswer"
      ? "Ignore length; answer must be minimal."
      : LENGTH_PRESETS[profile.length]

  return [
    "You are an AI assistant operating inside Onairo, a browser-native relay tool.",
    languageLine,
    modeLine,
    formatLine,
    `Length target: ${lengthRule}`,
    "Behavior rules:",
    "Respond only with the requested content.",
    "Do not add greetings, filler, or markdown.",
    jsonRule,
  ]
    .filter(Boolean)
    .join("\n")
}

export function buildUserText(directive: string, text: string, lang: "en-US" | "es-ES"): string {
  const label = lang === "es-ES" ? "Texto" : "Text"
  const replyLine = lang === "es-ES" ? "Responde de forma concisa." : "Reply concisely."
  return `${directive}\n\n${label}:\n"""${text}"""\n\n${replyLine}`
}

export function buildUserImageDirective(directive: string): string {
  return directive
}

export function postProcessOutput(
  raw: string,
  mode: Exclude<ResponseMode, "auto">,
  format: OutputFormat,
  profile: RunProfile,
): string {
  if (mode === "singleAnswer" || mode === "shortAnswer" || format === "json") {
    const json = extractJsonAnswer(raw)
    if (json) return json
  }

  let output = stripMarkdownAndFiller(raw)
  if (profile.length === "short") {
    output = output.replace(/\s*\n\s*/g, " ").trim()
  }
  return output
}

export function stripMarkdownAndFiller(value: string): string {
  let output = String(value || "")
  output = output.replace(/^```(?:json)?\s*|\s*```$/gim, "").trim()
  output = output.replace(/^\s*[*_#>\-]+/gm, "").trim()
  output = output.replace(/^answer\s*[:\-]\s*/i, "")
  output = output.replace(/^respuesta\s*[:\-]\s*/i, "")
  output = output.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
  return output
}

export function extractJsonAnswer(value: string): string | null {
  const source = String(value || "").trim()
  try {
    const parsed = JSON.parse(source)
    if (parsed && typeof parsed.answer !== "undefined") {
      return String(parsed.answer || "").trim()
    }
  } catch {
    return null
  }
  return null
}

export function extractSingleLetterAnswer(text: string): string {
  const source = String(text || "").trim()
  const upper = source.toUpperCase()
  const directPatterns = [
    /ANSWER[^A-Z0-9]{0,6}([A-D](?:\s*(?:,|AND|&|\/|\\)\s*[A-D])*)/i,
    /CORRECT(?:\s+ANSWER)?[^A-Z0-9]{0,6}([A-D](?:\s*(?:,|AND|&|\/|\\)\s*[A-D])*)/i,
    /CHOICE[^A-Z0-9]{0,6}([A-D](?:\s*(?:,|AND|&|\/|\\)\s*[A-D])*)/i,
  ]
  for (const pattern of directPatterns) {
    const match = pattern.exec(upper)
    if (match?.[1]) {
      return match[1]
        .replace(/\s*(?:AND|&|\/|\\)\s*/g, ",")
        .replace(/\s+/g, "")
        .split(",")
        .filter((item) => /^[A-D]$/.test(item))
        .join(", ")
        .toLowerCase()
    }
  }

  const standalone = /(^|[^A-Z])([A-D])(?=(?:\)|\.|:|,|\s|$))/g
  const matches = [...upper.matchAll(standalone)].map((match) => match[2].toLowerCase())
  const unique = [...new Set(matches)]
  return unique.length === 1 ? unique[0] : unique.slice(0, 2).join(", ")
}
