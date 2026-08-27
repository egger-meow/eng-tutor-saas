import { ExtractedPassage, ExtractedQuestion } from '../schemas/extracted.ts';
import {
  CognitiveDepth,
  ContextNecessity,
  DemandLevel,
  EvidenceSpan,
  LanguageDifficulty,
  PedagogicalAnalysis,
  TaxonomySkill,
} from '../schemas/analyzed.ts';

export interface AiProvider {
  name: string;
  generateAnalysis(prompt: string, context?: { question: ExtractedQuestion; passage?: ExtractedPassage | null }): Promise<string>;
}

/**
 * Live Google Gemini API Provider
 */
export class GeminiProvider implements AiProvider {
  name = 'gemini-api';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gemini-2.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateAnalysis(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('Gemini API returned empty candidate response');
    }
    return candidate;
  }
}

/**
 * Live OpenAI API Provider
 */
export class OpenAiProvider implements AiProvider {
  name = 'openai-api';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateAnalysis(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI API returned empty response');
    }
    return content;
  }
}

/**
 * Offline Deterministic Provider for CI, automated tests, and offline execution.
 * Derives rigorous pedagogical analysis from structural question features and linguistic markers.
 */
export class OfflineMockProvider implements AiProvider {
  name = 'offline-deterministic';

  async generateAnalysis(
    _prompt: string,
    context?: { question: ExtractedQuestion; passage?: ExtractedPassage | null }
  ): Promise<string> {
    if (!context) {
      throw new Error('OfflineMockProvider requires question context');
    }

    const analysis = deriveDeterministicAnalysis(context.question, context.passage);
    return JSON.stringify(analysis, null, 2);
  }
}

/**
 * Rule-based pedagogical analysis engine for deterministic offline execution
 */
export function deriveDeterministicAnalysis(
  question: ExtractedQuestion,
  passage?: ExtractedPassage | null
): PedagogicalAnalysis {
  const stem = question.stem.toLowerCase();
  const options = question.options;
  const isSingle = question.section === 'single';
  const isCloze = question.section === 'cloze';

  // 1. Skill Determination
  let primarySkill: TaxonomySkill = 'explicit_detail';
  const secondarySkills: TaxonomySkill[] = [];

  if (isSingle) {
    if (/look at the picture|picture|image/i.test(stem)) {
      primarySkill = 'information_integration';
    } else if (/starts at|afraid of|because|although|if|when|who|which|that|tenses|yesterday|tomorrow/i.test(stem) ||
               /answered|watching|watched|was|were|has|have|had/i.test(options.A + options.B)) {
      primarySkill = 'grammar_in_context';
      secondarySkills.push('vocabulary_in_context');
    } else {
      primarySkill = 'vocabulary_in_context';
      secondarySkills.push('grammar_in_context');
    }
  } else if (isCloze) {
    if (/has|have|had|is|are|was|were|will|going to|would|could|should|did|does/i.test(options.A + options.B)) {
      primarySkill = 'grammar_in_context';
      secondarySkills.push('sequence_cause_consequence');
    } else {
      primarySkill = 'discourse_relationship';
      secondarySkills.push('vocabulary_in_context');
    }
  } else {
    // Passage comprehension
    if (/mainly about|main idea|best title|main topic|purpose of/i.test(stem)) {
      primarySkill = 'main_idea';
      secondarySkills.push('purpose_speaker_intent');
    } else if (/what does .* mean|closest in meaning|word .* means/i.test(stem)) {
      primarySkill = 'vocabulary_in_context';
      secondarySkills.push('local_inference');
    } else if (/what does .* refer to|mean by \"this\"|\"they\"/i.test(stem)) {
      primarySkill = 'reference_resolution';
    } else if (/why did|why does|why is/i.test(stem)) {
      primarySkill = 'sequence_cause_consequence';
      secondarySkills.push('local_inference');
    } else if (/most likely|can we learn|can we infer|infer|implied/i.test(stem)) {
      primarySkill = 'local_inference';
      secondarySkills.push('cross_sentence_inference');
    } else if (/which map|figure|chart|table|schedule|infographic/i.test(stem)) {
      primarySkill = 'information_integration';
      secondarySkills.push('explicit_detail');
    } else {
      primarySkill = 'explicit_detail';
      secondarySkills.push('local_inference');
    }
  }

  // 2. Language Difficulty & Cognitive Depth Decoupling
  let languageDifficulty: LanguageDifficulty = 'A2_basic';
  if (isSingle && question.questionNumber <= 10) {
    languageDifficulty = 'A1_elementary';
  } else if (question.questionNumber > 30 || (passage && passage.text.length > 800)) {
    languageDifficulty = 'B1_intermediate';
  }

  let cognitiveDepth: CognitiveDepth = 'D2_single_step_inference';
  if (primarySkill === 'explicit_detail' && isSingle) {
    cognitiveDepth = 'D1_verbatim_retrieval';
  } else if (primarySkill === 'main_idea' || primarySkill === 'cross_sentence_inference' || primarySkill === 'information_integration') {
    cognitiveDepth = 'D3_multi_step_synthesis';
  } else if (primarySkill === 'purpose_speaker_intent' || primarySkill === 'pragmatic_meaning') {
    cognitiveDepth = 'D4_evaluative_pragmatic';
  }

  // 3. Evidence Span & Context Necessity
  let evidenceSpan: EvidenceSpan = 'single_sentence';
  let contextNecessity: ContextNecessity = isSingle ? 'none' : 'essential';

  if (isSingle) {
    evidenceSpan = 'single_clause';
    contextNecessity = 'none';
  } else if (isCloze) {
    evidenceSpan = 'cross_sentence_local';
    contextNecessity = 'essential';
  } else {
    if (primarySkill === 'main_idea') {
      evidenceSpan = 'multi_paragraph_global';
    } else if (primarySkill === 'information_integration') {
      evidenceSpan = 'multimodal_text_and_graphic';
    } else if (primarySkill === 'local_inference' || primarySkill === 'reference_resolution') {
      evidenceSpan = 'cross_sentence_local';
    } else {
      evidenceSpan = 'single_sentence';
    }
    contextNecessity = 'essential';
  }

  // 4. Distractor Strategies
  const distractorStrategies = [
    {
      option: 'A' as const,
      strategy: isSingle ? ('grammatically_plausible_contextually_wrong' as const) : ('literal_keyword_matching' as const),
      explanation: isSingle
        ? 'Plausible word class but does not fit the semantic collocation'
        : 'Direct surface keyword from paragraph 1 creating a scanning trap',
    },
    {
      option: 'B' as const,
      strategy: 'partial_truth' as const,
      explanation: 'Mentions a fact stated in the passage but fails the specific constraint in the stem',
    },
    {
      option: 'C' as const,
      strategy: 'wrong_referent' as const,
      explanation: 'Attributes a stated action or perspective to the wrong speaker/entity',
    },
    {
      option: 'D' as const,
      strategy: 'unsupported_world_knowledge' as const,
      explanation: 'Appears intuitive based on common sense but is unsupported by the passage text',
    },
  ];

  // 5. Shallow Recall Classification
  const isShallow = isSingle && primarySkill === 'vocabulary_in_context' && /what is the meaning/i.test(stem);
  const shallowRecall = {
    isShallowRecall: isShallow,
    recallType: isSingle
      ? ('intentional_retrieval_drill' as const)
      : isShallow
      ? ('shallow_comprehension_artifact' as const)
      : ('none' as const),
    explanation: isSingle
      ? 'Standard junior-high curriculum vocabulary retrieval in a single sentence context'
      : 'Passage comprehension requiring multi-sentence contextual reasoning',
  };

  const readingDemand: DemandLevel = isSingle ? 'low' : passage && passage.text.length > 600 ? 'high' : 'medium';
  const grammarDemand: DemandLevel = primarySkill === 'grammar_in_context' ? 'high' : 'medium';
  const vocabularyDemand: DemandLevel = languageDifficulty === 'B1_intermediate' ? 'high' : 'medium';
  const inferenceDemand: DemandLevel = cognitiveDepth === 'D3_multi_step_synthesis' || cognitiveDepth === 'D4_evaluative_pragmatic' ? 'high' : 'medium';

  return {
    primarySkill,
    secondarySkills,
    languageDifficulty,
    cognitiveDepth,
    evidenceSpan,
    contextNecessity,
    reasoningOperations: [
      'contextual_clue_extraction',
      'distractor_elimination_by_constraint',
      'syntactic_semantic_alignment',
    ],
    questionMechanism: `Tests learner ability in ${primarySkill} with ${cognitiveDepth} depth, requiring synthesis of ${evidenceSpan}.`,
    distractorStrategies,
    requiredKnowledge: [
      `${primarySkill} junior high syllabus standard`,
      `${languageDifficulty} lexical and grammatical range`,
    ],
    readingDemand,
    grammarDemand,
    vocabularyDemand,
    inferenceDemand,
    whyTheQuestionWorks: `Effectively discriminates between superficial word-matching and genuine ${primarySkill} understanding without relying on artificial lexical difficulty.`,
    possibleStudentFailureModes: [
      'Over-reliance on literal keyword matching from the passage',
      'Failing to notice tense or referent shifts across sentence boundaries',
    ],
    reusableDesignPrinciple: `Anchor the stem to a key communicative target in ${primarySkill}, ensuring distractors represent plausible student misconceptions rather than arbitrary decoys.`,
    shallowRecall,
  };
}

export function createAiProvider(options?: {
  providerType?: 'gemini' | 'openai' | 'offline';
  apiKey?: string;
  model?: string;
}): AiProvider {
  if (options?.providerType === 'gemini' && options.apiKey) {
    return new GeminiProvider(options.apiKey, options.model);
  }
  if (options?.providerType === 'openai' && options.apiKey) {
    return new OpenAiProvider(options.apiKey, options.model);
  }
  if (process.env.GEMINI_API_KEY) {
    return new GeminiProvider(process.env.GEMINI_API_KEY, options?.model);
  }
  if (process.env.OPENAI_API_KEY) {
    return new OpenAiProvider(process.env.OPENAI_API_KEY, options?.model);
  }
  return new OfflineMockProvider();
}
