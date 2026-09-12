import {
  parsePromptLayout,
  renderSentenceTokens,
  renderInstructionTokens,
} from './assessment-prompt-parser'

export interface AssessmentPromptBlockProps {
  prompt: string
  className?: string
}

/**
 * Presentation component that renders assessment prompts with visual hierarchy,
 * separating instructions from sentence examples and highlighting target words and blanks.
 */
export function AssessmentPromptBlock({
  prompt,
  className = '',
}: AssessmentPromptBlockProps) {
  const layout = parsePromptLayout(prompt)

  switch (layout.kind) {
    case 'contextual_reading':
      return (
        <div
          className={`assessment-prompt assessment-prompt-container assessment-prompt-contextual ${className}`.trim()}
          data-testid="assessment-prompt-block"
        >
          <div className="assessment-prompt-instruction">
            {layout.instruction}
          </div>
          <blockquote className="assessment-context-sentence">
            “{renderSentenceTokens(layout.contextSentence ?? '')}”
          </blockquote>
          <h1 className="assessment-context-question">
            {renderInstructionTokens(layout.question ?? '')}
          </h1>
        </div>
      )

    case 'instruction_and_sentence':
      return (
        <div
          className={`assessment-prompt assessment-prompt-container assessment-prompt-instructional ${className}`.trim()}
          data-testid="assessment-prompt-block"
        >
          <h1 className="assessment-prompt-instruction">
            {renderInstructionTokens(layout.instruction ?? '')}:
          </h1>
          <div className="assessment-sentence-block">
            <p className="assessment-sentence-line">
              “{renderSentenceTokens(layout.contextSentence ?? '')}”
            </p>
            {layout.dialogueResponse && (
              <p className="assessment-sentence-line assessment-dialogue-line">
                {renderSentenceTokens(layout.dialogueResponse)}
              </p>
            )}
          </div>
        </div>
      )

    case 'dialogue':
      return (
        <div
          className={`assessment-prompt assessment-prompt-container assessment-prompt-dialogue ${className}`.trim()}
          data-testid="assessment-prompt-block"
        >
          <h1 className="sr-only">{prompt}</h1>
          <div className="assessment-sentence-block assessment-dialogue-block">
            {layout.dialogueLines?.map((line, idx) => (
              <p
                key={idx}
                className={`assessment-sentence-line ${idx > 0 ? 'assessment-dialogue-line' : ''}`}
              >
                {idx === 0 ? (
                  <>“{renderSentenceTokens(line)}”</>
                ) : (
                  renderSentenceTokens(line)
                )}
              </p>
            ))}
          </div>
        </div>
      )

    case 'fill_in_the_blank':
      return (
        <div
          className={`assessment-prompt assessment-prompt-container assessment-prompt-fill-blank ${className}`.trim()}
          data-testid="assessment-prompt-block"
        >
          <h1 className="assessment-prompt-sentence">
            {renderSentenceTokens(layout.contextSentence ?? '')}
          </h1>
        </div>
      )

    case 'standard':
    default:
      return (
        <div
          className={`assessment-prompt assessment-prompt-container assessment-prompt-standard ${className}`.trim()}
          data-testid="assessment-prompt-block"
        >
          <h1 className="assessment-prompt-question">
            {renderInstructionTokens(layout.question ?? '')}
          </h1>
        </div>
      )
  }
}
