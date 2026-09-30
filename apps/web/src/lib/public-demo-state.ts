import { demoQuestions } from '../content/public-demo'
import type { DraftAnswers } from '../types/student-material'

export const DEMO_STORAGE_KEY = 'paper-english:public-synthetic-demo:v1'
export type DemoState = { answers: DraftAnswers; selfCheck: string[]; submitted: boolean }
export const emptyDemoState = (): DemoState => ({ answers: {}, selfCheck: [], submitted: false })
export function readDemoState(): DemoState {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(DEMO_STORAGE_KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return emptyDemoState()
    const state = raw as Partial<DemoState>
    const allowed = new Set(demoQuestions.map((question) => question.questionId))
    const answers = Object.fromEntries(Object.entries(state.answers ?? {}).filter(([key, value]) => allowed.has(key) && typeof value === 'string' && value.length <= 5000))
    return { answers, selfCheck: Array.isArray(state.selfCheck) ? state.selfCheck.filter((item) => typeof item === 'string').slice(0, 2) : [], submitted: state.submitted === true }
  } catch { return emptyDemoState() }
}
export function saveDemoState(state: DemoState): boolean {
  try { window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state)); return true }
  catch { return false }
}
