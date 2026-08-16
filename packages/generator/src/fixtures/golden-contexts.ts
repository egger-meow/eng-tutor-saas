export interface GoldenChildContext {
  id: string
  name: string
  description: string
  child: {
    grade: number
    gradeStage: 'incoming_grade_7' | 'grade_7' | 'grade_8' | 'grade_9'
    textbookVersion: string
    preferences: {
      interests: string[]
      avoidTopics: string[]
    }
  }
  profile: {
    nickname: string
    targetGoals: string[]
    diagnosticNotes?: string
  }
  learningState: {
    schoolProgress: string | null
    recentDifficulty: 'too-easy' | 'appropriate' | 'too-hard' | 'unknown'
    feedbackSummary: string
    recurringMistakes: string[]
    reviewDue: string[]
  }
  vocabularyCapsule: {
    dueForReview: string[]
    weakRecent: string[]
    uncertain: string[]
    recentlyMastered: string[]
    historicalCount: number
  }
  grammarCapsule: {
    dueForReview: string[]
    weakRecent: string[]
    uncertain: string[]
    historicalCount: number
  }
  feedback: {
    completionScore?: number
    difficultyRating?: 'too-easy' | 'appropriate' | 'too-hard'
    parentNote?: string
  } | null
  qualityTrends?: Record<string, number>
  retryContext?: {
    previousAttemptNumber: number
    failureType: string
    findings: string[]
  }
}

export const goldenContextA: GoldenChildContext = {
  id: 'golden-case-a-g7-minecraft',
  name: 'Case A: Incoming G7 + Weak Grammar Foundation + Minecraft',
  description: 'Incoming Grade 7 learner transitioning from elementary. Grammar foundation on be-verbs and singular/plural is shaky. Passionate about Minecraft crafting and redstone.',
  child: {
    grade: 7,
    gradeStage: 'incoming_grade_7',
    textbookVersion: 'Kang Hsuan Book 1',
    preferences: {
      interests: ['Minecraft', 'building redstone machines', 'crafting'],
      avoidTopics: ['fairy tales', 'babysitting'],
    },
  },
  profile: {
    nickname: 'Alex',
    targetGoals: ['Build solid junior-high grammar base', 'Overcome confusion between is/are/am'],
    diagnosticNotes: 'Often writes "He are" or forgets be-verbs in sentences like "The block red".',
  },
  learningState: {
    schoolProgress: 'Starter Unit: Pronouns & Be-verbs',
    recentDifficulty: 'appropriate',
    feedbackSummary: '剛升國一，對長篇英文有點排斥，但如果有麥塊情境會願意讀。be 動詞單複數常搞混。',
    recurringMistakes: ['be-verb agreement with singular subjects', 'omitting be-verbs before adjectives'],
    reviewDue: ['pronouns (he/she/they)'],
  },
  vocabularyCapsule: {
    dueForReview: ['block', 'tool'],
    weakRecent: ['build', 'machine'],
    uncertain: ['material', 'inventory'],
    recentlyMastered: ['craft', 'mine'],
    historicalCount: 24,
  },
  grammarCapsule: {
    dueForReview: ['subject-pronoun-matching'],
    weakRecent: ['be-verb-singular-plural'],
    uncertain: ['be-verb-questions'],
    historicalCount: 6,
  },
  feedback: {
    completionScore: 80,
    difficultyRating: 'appropriate',
    parentNote: '希望能把 is/are 的觀念講得更簡單清楚，不要只有死背文法名詞。',
  },
}

export const goldenContextB: GoldenChildContext = {
  id: 'golden-case-b-g7-reading-basketball',
  name: 'Case B: G7 + Strong Reading + Basketball',
  description: 'Grade 7 student with higher reading speed and confidence. Needs deeper CAP reading inference and distractor challenge beyond surface word searching.',
  child: {
    grade: 7,
    gradeStage: 'grade_7',
    textbookVersion: 'Han Lin Book 1',
    preferences: {
      interests: ['basketball', 'NBA analytics', 'team tactics'],
      avoidTopics: ['fashion', 'celebrity gossip'],
    },
  },
  profile: {
    nickname: 'Leo',
    targetGoals: ['Train CAP inference skills', 'Avoid falling for surface keyword traps'],
    diagnosticNotes: 'Reads fast but often picks choices that share matching keywords without checking the whole sentence.',
  },
  learningState: {
    schoolProgress: 'Unit 3: Daily routines & Sports',
    recentDifficulty: 'too-easy',
    feedbackSummary: '上週閱讀太容易，一兩分鐘就做完。題目太像單純找字，希望有更多需要推論因果的會考題。',
    recurringMistakes: ['surface keyword match trap', 'ignoring qualifying words like rarely/often'],
    reviewDue: ['adverbs of frequency'],
  },
  vocabularyCapsule: {
    dueForReview: ['practice', 'strategy'],
    weakRecent: ['opponent', 'advantage'],
    uncertain: ['decision', 'assist'],
    recentlyMastered: ['score', 'court', 'team'],
    historicalCount: 52,
  },
  grammarCapsule: {
    dueForReview: ['frequency-adverb-placement'],
    weakRecent: ['present-simple-third-person-s'],
    uncertain: ['question-word-how-often'],
    historicalCount: 14,
  },
  feedback: {
    completionScore: 100,
    difficultyRating: 'too-easy',
    parentNote: '題目太簡單了，小孩想要更有挑戰性的閱讀思考題。',
  },
}

export const goldenContextC: GoldenChildContext = {
  id: 'golden-case-c-g8-recurring-grammar',
  name: 'Case C: G8 + Recurring Grammar Mistake + Low Completion',
  description: 'Grade 8 student struggling with Past Simple vs Present Perfect, showing low completion and fatigue when overwhelmed with text.',
  child: {
    grade: 8,
    gradeStage: 'grade_8',
    textbookVersion: 'Nani Book 3',
    preferences: {
      interests: ['badminton', 'cooking videos'],
      avoidTopics: ['politics', 'horror stories'],
    },
  },
  profile: {
    nickname: 'Kelly',
    targetGoals: ['Differentiate since/for triggers', 'Rebuild self-study momentum with digestible steps'],
    diagnosticNotes: 'Freezes when seeing long grammar rules. Needs intuitive trigger-pattern pairs.',
  },
  learningState: {
    schoolProgress: 'Unit 2: Present Perfect & Life Experiences',
    recentDifficulty: 'too-hard',
    feedbackSummary: '看到 since 和 for 就頭暈，上週作業只寫了一半就放棄。需要更清楚的中文解題心法。',
    recurringMistakes: ['confusing since + starting point with for + duration', 'using base verb instead of p.p.'],
    reviewDue: ['irregular past participles'],
  },
  vocabularyCapsule: {
    dueForReview: ['experience', 'already', 'yet'],
    weakRecent: ['recipe', 'tournament'],
    uncertain: ['participate', 'delicious'],
    recentlyMastered: ['cook', 'match'],
    historicalCount: 88,
  },
  grammarCapsule: {
    dueForReview: ['present-perfect-since-for'],
    weakRecent: ['past-participle-forms'],
    uncertain: ['have-gone-vs-have-been'],
    historicalCount: 22,
  },
  feedback: {
    completionScore: 50,
    difficultyRating: 'too-hard',
    parentNote: '上次份量有點多，而且文法解說太抽象，孩子看不太懂為什麼要用 have been。',
  },
  qualityTrends: {
    cognitiveOverload: 2,
  },
}

export const goldenContextD: GoldenChildContext = {
  id: 'golden-case-d-feedback-missing',
  name: 'Case D: Feedback Missing (Calibration Baseline)',
  description: 'Regular Grade 7 student whose family did not submit feedback before cutoff. Engine must proceed with stable continuation without assuming total mastery.',
  child: {
    grade: 7,
    gradeStage: 'grade_7',
    textbookVersion: 'Kang Hsuan Book 2',
    preferences: {
      interests: ['drawing webcomics', 'space science'],
      avoidTopics: [],
    },
  },
  profile: {
    nickname: 'Sam',
    targetGoals: ['Continuous steady reading & grammar rhythm'],
  },
  learningState: {
    schoolProgress: 'Unit 4: There is / There are & Prepositions',
    recentDifficulty: 'unknown',
    feedbackSummary: '上週未收到家長回饋，維持正常教學節奏與適度複習。',
    recurringMistakes: ['confusing there is with there are for plural nouns'],
    reviewDue: ['prepositions of place (between, behind, next to)'],
  },
  vocabularyCapsule: {
    dueForReview: ['planet', 'telescope'],
    weakRecent: ['galaxy', 'distance'],
    uncertain: ['character', 'sketch'],
    recentlyMastered: ['star', 'moon', 'draw'],
    historicalCount: 40,
  },
  grammarCapsule: {
    dueForReview: ['there-is-there-are'],
    weakRecent: ['prepositions-of-place'],
    uncertain: ['any-vs-some'],
    historicalCount: 12,
  },
  feedback: null,
}

export const goldenContextE: GoldenChildContext = {
  id: 'golden-case-e-semantic-retry',
  name: 'Case E: Retry After Semantic Quality Rejection',
  description: 'A job retrying attempt 2 after Critic rejected attempt 1 due to tautological explanations and silly distractors.',
  child: {
    grade: 8,
    gradeStage: 'grade_8',
    textbookVersion: 'Han Lin Book 4',
    preferences: {
      interests: ['climate change', 'ocean conservation', 'scuba diving'],
      avoidTopics: [],
    },
  },
  profile: {
    nickname: 'Mia',
    targetGoals: ['Master passive voice reading and CAP analysis'],
  },
  learningState: {
    schoolProgress: 'Unit 1: Passive Voice in Environment News',
    recentDifficulty: 'appropriate',
    feedbackSummary: '想多練習閱讀中出現被動語態的句子理解。',
    recurringMistakes: ['confusing passive subject with the doer'],
    reviewDue: ['past participles with by-phrase'],
  },
  vocabularyCapsule: {
    dueForReview: ['protect', 'damage'],
    weakRecent: ['coral', 'temperature'],
    uncertain: ['species', 'threaten'],
    recentlyMastered: ['ocean', 'plastic', 'recycle'],
    historicalCount: 95,
  },
  grammarCapsule: {
    dueForReview: ['passive-voice-present-simple'],
    weakRecent: ['passive-voice-past-simple'],
    uncertain: ['by-agent-omission'],
    historicalCount: 26,
  },
  feedback: {
    completionScore: 85,
    difficultyRating: 'appropriate',
    parentNote: '上次解析寫得太隨便，只寫「因為選C所以選C」，希望解析可以真正說明錯誤選項為什麼錯。',
  },
  retryContext: {
    previousAttemptNumber: 1,
    failureType: 'QUALITY_REJECTED',
    findings: [
      'Question C1 options A, B, D contained obvious silly giveaways rather than plausible student reasoning traps.',
      'Answer C1 explanationZh was circular ("答案 C，因為文章最後說 C 是對的") without citing paragraph evidence or de-biasing Option B.',
    ],
  },
}

export const ALL_GOLDEN_CONTEXTS = [
  goldenContextA,
  goldenContextB,
  goldenContextC,
  goldenContextD,
  goldenContextE,
]
