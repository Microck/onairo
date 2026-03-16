import { describe, expect, it } from "vitest"
import {
  detectQuestionType,
  extractJsonAnswer,
  extractSingleLetterAnswer,
  postProcessOutput,
} from "@/features/runs/prompting"
import { DEFAULT_SYNC_SETTINGS } from "@/features/settings/schema"

describe("prompting helpers", () => {
  it("detects multiple choice text as single-answer mode", () => {
    expect(detectQuestionType("Which is correct?\nA) First\nB) Second")).toBe(
      "singleAnswer",
    )
  })

  it("extracts answers from json payloads", () => {
    expect(extractJsonAnswer('{"answer":"B"}')).toBe("B")
  })

  it("extracts letter answers from verbose text", () => {
    expect(extractSingleLetterAnswer("Correct answer: C")).toBe("c")
  })

  it("post-processes single-answer json payloads", () => {
    expect(
      postProcessOutput(
        '{"answer":"D"}',
        "singleAnswer",
        "json",
        DEFAULT_SYNC_SETTINGS.profile,
      ),
    ).toBe("D")
  })
})
