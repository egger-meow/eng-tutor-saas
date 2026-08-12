import type { ChildWithProfile } from '../hooks/use-parent-data'
import type { ChildProfileInput } from './child-profiles'

export const profileStepCount = 6

export type ProfileDraft = {
  displayName: string
  grade: number
  gradeStage: 'incoming_grade_7' | 'grade_7' | 'grade_8' | 'grade_9'
  baselineLevel: string
  readingLevel: string
  vocabularyLevel: string
  grammarLevel: string
  textbookVersion: string
  currentChapter: string
  upcomingTest: string
  interests: string[]
  favoriteStories: string
  favoriteGames: string
  favoriteMusic: string
  activities: string
  currentFascinations: string
  changedInterests: string
  dislikedTopics: string
  weeklyMinutes: number
  sessionPreference: string
  learningGoals: string
  knownWeaknesses: string
  parentExpectations: string
  notes: string
}

export const emptyProfileDraft: ProfileDraft = {
  displayName: '', grade: 7, gradeStage: 'grade_7', baselineLevel: '', readingLevel: '', vocabularyLevel: '', grammarLevel: '',
  textbookVersion: '', currentChapter: '', upcomingTest: '', interests: [], favoriteStories: '', favoriteGames: '',
  favoriteMusic: '', activities: '', currentFascinations: '', changedInterests: '', dislikedTopics: '', weeklyMinutes: 90,
  sessionPreference: '', learningGoals: '', knownWeaknesses: '', parentExpectations: '', notes: '',
}

export function validateProfileStep(step: number, draft: ProfileDraft): Record<string, string> {
  const errors: Record<string, string> = {}
  if (step === 1 && !draft.displayName.trim()) errors.displayName = '請填寫孩子暱稱。'
  if (step === 1 && !['incoming_grade_7', 'grade_7', 'grade_8', 'grade_9'].includes(draft.gradeStage)) errors.grade = '請選擇目前就學階段。'
  if (step === 2 && !draft.baselineLevel) errors.baselineLevel = '請選擇整體程度。'
  if (step === 5 && (draft.weeklyMinutes < 20 || draft.weeklyMinutes > 1200)) errors.weeklyMinutes = '每週時間請填 20 到 1200 分鐘。'
  if (step === 6 && !draft.learningGoals.trim()) errors.learningGoals = '請至少填寫一項學習目標。'
  return errors
}

export function profileDraftFromChild(child: ChildWithProfile): ProfileDraft {
  const preferences = child.profile?.preferences ?? {}
  const strings = (key: string) => typeof preferences[key] === 'string' ? preferences[key] as string : ''
  const list = Array.isArray(preferences.interests) ? preferences.interests.filter((item): item is string => typeof item === 'string') : []
  return {
    ...emptyProfileDraft,
    displayName: child.display_name,
    grade: child.grade,
    gradeStage: child.grade_stage,
    textbookVersion: child.textbook_version ?? '',
    baselineLevel: child.profile?.baseline_level ?? '',
    readingLevel: child.profile?.reading_level ?? '',
    vocabularyLevel: child.profile?.vocabulary_level ?? '',
    grammarLevel: child.profile?.grammar_level ?? '',
    weeklyMinutes: child.profile?.weekly_minutes ?? 90,
    learningGoals: child.profile?.learning_goals ?? '',
    currentChapter: child.profile?.school_progress ?? '',
    parentExpectations: child.profile?.parent_expectations ?? '',
    interests: list,
    favoriteStories: strings('favoriteStories'),
    favoriteGames: strings('favoriteGames'),
    favoriteMusic: strings('favoriteMusic'),
    activities: strings('activities'),
    currentFascinations: strings('currentFascinations'),
    changedInterests: strings('changedInterests'),
    upcomingTest: strings('upcomingTest'),
    dislikedTopics: strings('dislikedTopics'),
    sessionPreference: strings('sessionPreference'),
    knownWeaknesses: strings('knownWeaknesses'),
    notes: strings('notes'),
  }
}

export function toChildProfileInput(draft: ProfileDraft): ChildProfileInput {
  return {
    baseline_level: draft.baselineLevel || null,
    reading_level: draft.readingLevel || null,
    vocabulary_level: draft.vocabularyLevel || null,
    grammar_level: draft.grammarLevel || null,
    weekly_minutes: draft.weeklyMinutes,
    learning_goals: draft.learningGoals.trim() || null,
    school_progress: draft.currentChapter.trim() || null,
    parent_expectations: draft.parentExpectations.trim() || null,
    preferences: {
      schemaVersion: 2,
      interests: draft.interests,
      favoriteStories: draft.favoriteStories.trim(),
      favoriteGames: draft.favoriteGames.trim(),
      favoriteMusic: draft.favoriteMusic.trim(),
      activities: draft.activities.trim(),
      currentFascinations: draft.currentFascinations.trim(),
      changedInterests: draft.changedInterests.trim(),
      upcomingTest: draft.upcomingTest.trim(),
      dislikedTopics: draft.dislikedTopics.trim(),
      sessionPreference: draft.sessionPreference,
      knownWeaknesses: draft.knownWeaknesses.trim(),
      notes: draft.notes.trim(),
    },
  }
}

export function readDraft(key: string): ProfileDraft | null {
  try {
    const value = window.sessionStorage.getItem(key)
    if (!value) return null
    return { ...emptyProfileDraft, ...JSON.parse(value) } as ProfileDraft
  } catch { return null }
}

export function saveDraft(key: string, draft: ProfileDraft) {
  window.sessionStorage.setItem(key, JSON.stringify(draft))
}
