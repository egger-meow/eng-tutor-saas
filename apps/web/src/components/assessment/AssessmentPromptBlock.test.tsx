import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AssessmentPromptBlock } from './AssessmentPromptBlock'
import {
  parsePromptLayout,
  renderSentenceTokens,
  renderInstructionTokens,
} from './assessment-prompt-parser'

describe('AssessmentPromptBlock Component', () => {
  describe('parsePromptLayout', () => {
    it('classifies contextual reading items', () => {
      const parsed = parsePromptLayout(
        'Read the sentence: "Walk two blocks, and the post office is on your right." What does "right" mean here?'
      )
      expect(parsed.kind).toBe('contextual_reading')
      expect(parsed.instruction).toBe('Read the sentence:')
      expect(parsed.contextSentence).toBe(
        'Walk two blocks, and the post office is on your right.'
      )
      expect(parsed.question).toBe('What does "right" mean here?')
    })

    it('classifies instruction and quoted sentence items', () => {
      const parsed = parsePromptLayout(
        'Type the simple past tense of "see": "Last Friday evening, my friends and I ______ an exciting basketball match on television."'
      )
      expect(parsed.kind).toBe('instruction_and_sentence')
      expect(parsed.instruction).toBe('Type the simple past tense of "see"')
      expect(parsed.contextSentence).toBe(
        'Last Friday evening, my friends and I ______ an exciting basketball match on television.'
      )
      expect(parsed.dialogueResponse).toBeUndefined()
    })

    it('classifies instruction with sentence and dialogue response', () => {
      const parsed = parsePromptLayout(
        'Fill in the question word asking for location: "______ did you buy those handmade pottery cups?" — "At the Yingge Old Street."'
      )
      expect(parsed.kind).toBe('instruction_and_sentence')
      expect(parsed.instruction).toBe('Fill in the question word asking for location')
      expect(parsed.contextSentence).toBe('______ did you buy those handmade pottery cups?')
      expect(parsed.dialogueResponse).toBe('— "At the Yingge Old Street."')
    })

    it('classifies standalone dialogue items', () => {
      const parsed = parsePromptLayout(
        '"______ is the local night market from our hotel?" — "It is about three kilometers away."'
      )
      expect(parsed.kind).toBe('dialogue')
      expect(parsed.dialogueLines).toEqual([
        '______ is the local night market from our hotel?',
        '— "It is about three kilometers away."',
      ])
    })

    it('classifies standalone sentence with blanks as fill_in_the_blank', () => {
      const parsed = parsePromptLayout(
        'The young puppy was very ______; it sniffed every corner of the new living room.'
      )
      expect(parsed.kind).toBe('fill_in_the_blank')
      expect(parsed.contextSentence).toBe(
        'The young puppy was very ______; it sniffed every corner of the new living room.'
      )
    })

    it('classifies direct questions as standard', () => {
      const parsed = parsePromptLayout(
        'Which place is specifically designed for students to borrow books and study quietly?'
      )
      expect(parsed.kind).toBe('standard')
      expect(parsed.question).toBe(
        'Which place is specifically designed for students to borrow books and study quietly?'
      )
    })
  })

  describe('renderSentenceTokens', () => {
    it('wraps underscores in a styled blank slot', () => {
      const nodes = renderSentenceTokens('Puppy was very ______ and sweet.')
      const html = renderToStaticMarkup(<>{nodes}</>)

      expect(html).toContain('Puppy was very')
      expect(html).toContain('class="assessment-blank-slot"')
      expect(html).toContain('aria-label="填空處"')
      expect(html).toContain('______')
      expect(html).toContain('and sweet.')
    })

    it('wraps parenthetical clue words in a styled clue tag', () => {
      const nodes = renderSentenceTokens('The old house had several ______ (mouse) hiding.')
      const html = renderToStaticMarkup(<>{nodes}</>)

      expect(html).toContain('class="assessment-sentence-clue"')
      expect(html).toContain('(mouse)')
    })
  })

  describe('renderInstructionTokens', () => {
    it('highlights quoted target words', () => {
      const nodes = renderInstructionTokens('Type the simple past tense of "see":')
      const html = renderToStaticMarkup(<>{nodes}</>)

      expect(html).toContain('Type the simple past tense of')
      expect(html).toContain('class="assessment-target-word"')
      expect(html).toContain('&quot;see&quot;')
    })

    it('highlights choice option pairs in parentheses', () => {
      const nodes = renderInstructionTokens(
        'Choose the correct pronoun (I or me) to complete the subject:'
      )
      const html = renderToStaticMarkup(<>{nodes}</>)

      expect(html).toContain('class="assessment-target-choice"')
      expect(html).toContain('(I or me)')
    })
  })

  describe('AssessmentPromptBlock rendering', () => {
    it('renders contextual reading prompt with instruction, quote block, and question', () => {
      const prompt =
        'Read the sentence: "The express train leaves the station at ten o’clock sharp." What does "leaves" mean here?'
      const html = renderToStaticMarkup(<AssessmentPromptBlock prompt={prompt} />)

      expect(html).toContain('assessment-prompt-contextual')
      expect(html).toContain('assessment-prompt-instruction')
      expect(html).toContain('Read the sentence:')
      expect(html).toContain('assessment-context-sentence')
      expect(html).toContain('The express train leaves the station at ten o’clock sharp.')
      expect(html).toContain('assessment-context-question')
      expect(html).toContain('assessment-target-word')
      expect(html).toContain('&quot;leaves&quot;')
    })

    it('renders instruction and sentence prompt with distinct instruction and sentence block', () => {
      const prompt =
        'Type the simple past tense of "see": "Last Friday evening, my friends and I ______ an exciting basketball match on television."'
      const html = renderToStaticMarkup(<AssessmentPromptBlock prompt={prompt} />)

      expect(html).toContain('assessment-prompt-instructional')
      expect(html).toContain('assessment-prompt-instruction')
      expect(html).toContain('Type the simple past tense of')
      expect(html).toContain('assessment-target-word')
      expect(html).toContain('&quot;see&quot;')
      expect(html).toContain('assessment-sentence-block')
      expect(html).toContain('assessment-blank-slot')
      expect(html).toContain('Last Friday evening, my friends and I')
    })

    it('renders dialogue items with distinct lines and blank slots', () => {
      const prompt =
        '"______ is the local night market from our hotel?" — "It is about three kilometers away."'
      const html = renderToStaticMarkup(<AssessmentPromptBlock prompt={prompt} />)

      expect(html).toContain('assessment-prompt-dialogue')
      expect(html).toContain('assessment-blank-slot')
      expect(html).toContain('assessment-dialogue-line')
      expect(html).toContain('It is about three kilometers away.')
    })

    it('renders standard reading comprehension questions with target word highlights', () => {
      const prompt =
        'In the passage, what does the word "stretch" mean in the phrase "stretch down the sidewalk"?'
      const html = renderToStaticMarkup(<AssessmentPromptBlock prompt={prompt} />)

      expect(html).toContain('assessment-prompt-standard')
      expect(html).toContain('assessment-target-word')
      expect(html).toContain('&quot;stretch&quot;')
      expect(html).toContain('&quot;stretch down the sidewalk&quot;')
    })

    it('safely renders unformatted plain prompts without breaking', () => {
      const prompt = 'What is the main topic of the passage?'
      const html = renderToStaticMarkup(<AssessmentPromptBlock prompt={prompt} />)

      expect(html).toContain('assessment-prompt-standard')
      expect(html).toContain('What is the main topic of the passage?')
    })
  })
})
