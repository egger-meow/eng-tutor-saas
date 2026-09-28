export type ReadingBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'dialogue'; speaker: string; text: string }
  | { type: 'notice'; heading?: string; text: string }
  | { type: 'schedule-row'; timeOrStep: string; event: string; detail?: string }

export type ReadingGenre =
  | 'article'
  | 'narrative'
  | 'dialogue'
  | 'notice'
  | 'schedule'
  | 'instructions'
  | 'mini-report'
  | string

export type AdaptiveExtensionPurpose =
  | 'strategy'
  | 'reasoning'
  | 'pronunciation'
  | 'real-world-application'
  | 'creative-depth'
  | string

export type AdaptiveExtensionPlacement = 'after-reading' | 'after-practice' | string

export interface AdaptiveExtension {
  id: string
  placement: AdaptiveExtensionPlacement
  purpose: AdaptiveExtensionPurpose
  titleZh: string
  contentZh: string
  taskZh?: string | null
  taskWritingLines?: number
}

export type VocabularyStatus = 'new' | 'review' | 'repeated-miss' | 'extension'

export interface VocabularyItem {
  id: string
  word: string
  partOfSpeech: string
  meaningZh?: string
  definition?: string
  pronunciationHint?: string | null
  exampleEn?: string
  exampleZh?: string
  example?: string
  status?: VocabularyStatus
}

export type OpeningActivity =
  | { type: 'question'; titleZh: string; prompt: string; writingLines?: number }
  | { type: 'observation'; titleZh: string; examples: string[]; noticeZh: string }
  | { type: 'reading-purpose'; titleZh: string; purposeZh: string }
  | { type: 'direct-reading' }
  | { type: 'custom'; [key: string]: unknown }

export interface OpeningSection {
  goalsZh?: string[]
  howToUseZh?: string
  activity?: OpeningActivity
  warmUp?: string
}

export interface ReadingSection {
  title?: string
  contextZh?: string
  genre?: ReadingGenre
  blocks?: ReadingBlock[]
  passage?: string
  wordCount?: number
  readingTipsZh?: string[]
  sourceNote?: string | null
}

export type InstructionBlock =
  | { type: 'prose'; titleZh?: string; textZh: string }
  | { type: 'bullets'; titleZh?: string; itemsZh: string[] }
  | { type: 'comparison'; titleZh?: string; headers: string[]; rows: string[][]; takeawayZh?: string }
  | { type: 'steps'; titleZh?: string; itemsZh: string[] }
  | { type: 'worked-example'; titleZh?: string; example: string; walkthroughZh: string }
  | { type: 'error-analysis'; titleZh?: string; wrong: string; corrected: string; whyZh: string }
  | { type: 'custom'; [key: string]: unknown }

export interface InstructionTopic {
  id: string
  titleZh: string
  blocks?: InstructionBlock[]
  explanationZh?: string
  patterns?: string[]
  workedExamples?: Array<{ example: string; walkthroughZh: string }>
  commonMistakes?: Array<{ wrong: string; corrected: string; whyZh: string }>
}

export interface ResponseGridCell {
  text?: string
  responseUnitId?: string
  placeholder?: string
}

export interface SequenceItem {
  stepNumber?: number | string
  label?: string
  content?: string
  placeholder?: string
  responseUnitId?: string
  relationToNext?: string
}

export interface ResponseLayoutRow {
  label?: string
  values?: string[]
  cells?: ResponseGridCell[]
}

export type ResponseLayout =
  | { type: 'lines'; lineCount?: number }
  | { type: 'table'; headers: string[]; rows: ResponseLayoutRow[] }
  | { type: 'organizer'; headers: string[]; rows: ResponseLayoutRow[] }
  | { type: 'sequence'; layoutDirection?: 'vertical' | 'horizontal'; items: SequenceItem[] }
  | { type: 'custom'; [key: string]: unknown }

export interface Question {
  id: string
  questionId?: string
  targetIds?: string[]
  itemType?: string
  prompt: string
  options?: string[]
  writingLines?: number
  difficulty?: 'supported' | 'on-level' | 'stretch' | string
  responseLayout?: ResponseLayout
  [key: string]: unknown
}

export interface PracticeStage {
  id: string
  stage?: 'guided' | 'independent' | 'cap-transfer' | 'production' | 'retrieval' | string
  titleZh: string
  instructionsZh?: string
  hintZh?: string | null
  questions: Question[]
}

export interface HomeworkSection {
  purposeZh: string
  estimatedMinutes?: number
  questions: Question[]
}

export interface StudentLesson {
  opening?: OpeningSection
  vocabulary?: VocabularyItem[]
  reading?: ReadingSection
  adaptiveExtension?: AdaptiveExtension | null
  instruction?: InstructionTopic[]
  practice?: PracticeStage[]
  selfCheckZh?: string[]
  homework?: HomeworkSection
  [key: string]: unknown
}

export interface StudentMaterialProjection {
  id: string
  child_id: string
  child_name: string
  material_week: string
  week_number: number
  revision: number
  title: string
  student_lesson: StudentLesson
  student_pdf_path: string
  release_at: string
}

export type DraftAnswers = Record<string, string>
export type DraftSelfCheck = string[]

export interface MaterialDraft {
  answers: DraftAnswers
  self_check: DraftSelfCheck
  version: number
  updated_at: string | null
}

export interface SaveDraftResult {
  saved: boolean
  version: number
  updated_at: string
  conflict: boolean
  server_answers: DraftAnswers | null
  server_self_check: DraftSelfCheck | null
}

export type SaveDraftStatus = 'idle' | 'saving' | 'saved' | 'unsaved' | 'conflict' | 'error'
