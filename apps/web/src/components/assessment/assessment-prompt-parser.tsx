import type { ReactNode } from 'react'

export type PromptLayoutKind =
  | 'contextual_reading'
  | 'instruction_and_sentence'
  | 'dialogue'
  | 'fill_in_the_blank'
  | 'standard'

export interface ParsedPromptLayout {
  kind: PromptLayoutKind
  instruction?: string
  contextSentence?: string
  question?: string
  dialogueResponse?: string
  dialogueLines?: string[]
  rawText: string
}

/**
 * Parses raw assessment prompt strings into structured layout parts.
 * Uses conservative, deterministic heuristics and falls back safely to 'standard'
 * or 'fill_in_the_blank' without ever losing text content.
 */
export function parsePromptLayout(rawPrompt: string): ParsedPromptLayout {
  const p = rawPrompt.trim()

  // 1. Contextual Reading: Read the sentence: "..." What does "..." mean here?
  const ctxMatch = p.match(/^Read the sentence:\s*["“]([^"”]+)["”]\s*(.+)$/i)
  if (ctxMatch) {
    return {
      kind: 'contextual_reading',
      instruction: 'Read the sentence:',
      contextSentence: ctxMatch[1].trim(),
      question: ctxMatch[2].trim(),
      rawText: rawPrompt,
    }
  }

  // 2. Instruction + Quoted sentence (with optional dialogue response)
  const instrMatch = p.match(
    /^([^:\n]+):\s*["“]([^"”]+)["”](?:\s*([—–-]\s*["“][^"”]+["”]))?$/
  )
  if (instrMatch) {
    return {
      kind: 'instruction_and_sentence',
      instruction: instrMatch[1].trim(),
      contextSentence: instrMatch[2].trim(),
      dialogueResponse: instrMatch[3]?.trim(),
      rawText: rawPrompt,
    }
  }

  // 3. Dialogue exchange: "..." — "..."
  const diagMatch = p.match(/^["“]([^"”]+)["”]\s*([—–-]\s*["“][^"”]+["”])$/)
  if (diagMatch) {
    return {
      kind: 'dialogue',
      dialogueLines: [diagMatch[1].trim(), diagMatch[2].trim()],
      rawText: rawPrompt,
    }
  }

  // 4. Fill in the blank (standalone sentence containing 3+ underscores)
  if (/_{3,}/.test(p)) {
    return {
      kind: 'fill_in_the_blank',
      contextSentence: p,
      rawText: rawPrompt,
    }
  }

  // 5. Standard question / prompt fallback
  return {
    kind: 'standard',
    question: p,
    rawText: rawPrompt,
  }
}

/**
 * Renders sentence text, transforming blanks (e.g. `______`) into visual slot indicators,
 * and optional parenthetical clues (e.g. `(mouse)`) into styled tags.
 */
export function renderSentenceTokens(text: string): ReactNode[] {
  // Matches blank underscores (3+) or parenthetical clues like (mouse)
  const tokenRegex = /(_{3,}|\([a-zA-Z]{2,}\))/g
  const parts = text.split(tokenRegex)

  return parts.map((part, idx) => {
    if (/^_{3,}$/.test(part)) {
      return (
        <span
          key={`blank-${idx}`}
          className="assessment-blank-slot"
          aria-label="填空處"
        >
          ______
        </span>
      )
    }

    if (/^\([a-zA-Z]{2,}\)$/.test(part)) {
      return (
        <span key={`clue-${idx}`} className="assessment-sentence-clue">
          {part}
        </span>
      )
    }

    return part
  })
}

/**
 * Renders instruction or question text, highlighting quoted target words (e.g. `"see"`)
 * and choice options (e.g. `(I or me)`).
 */
export function renderInstructionTokens(text: string): ReactNode[] {
  // Matches quoted words/phrases: "word" or “word”, and choice pairs: (X or Y)
  const tokenRegex = /(["“][^"”]+["”]|(?:\([a-zA-Z]+\s+or\s+[a-zA-Z]+\)))/g
  const parts = text.split(tokenRegex)

  return parts.map((part, idx) => {
    if (/^["“][^"”]+["”]$/.test(part)) {
      return (
        <strong key={`target-${idx}`} className="assessment-target-word">
          {part}
        </strong>
      )
    }

    if (/^\([a-zA-Z]+\s+or\s+[a-zA-Z]+\)$/.test(part)) {
      return (
        <span key={`choice-${idx}`} className="assessment-target-choice">
          {part}
        </span>
      )
    }

    return part
  })
}
