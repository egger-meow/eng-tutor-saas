import fs from 'node:fs';
import { ExtractedPassage, ExtractedQuestion } from '../schemas/extracted.ts';
import {
  CognitiveDepth,
  DemandLevel,
  DistractorPattern,
  EvidenceNecessity,
  EvidenceReference,
  EvidenceSpan,
  LanguageDifficulty,
  OptionAnalysisItem,
  PedagogicalAnalysis,
  ReasoningComplexity,
  TaxonomySkill,
} from '../schemas/analyzed.ts';

export interface ImageAttachment {
  mimeType: string;
  base64Data: string;
}

export interface AiProvider {
  name: string;
  modelName: string;
  generateAnalysis(
    prompt: string,
    context?: {
      question?: ExtractedQuestion;
      passage?: ExtractedPassage | null;
      images?: ImageAttachment[];
    }
  ): Promise<string>;
  generateCriticReview?(
    prompt: string,
    context?: {
      question?: ExtractedQuestion;
      passage?: ExtractedPassage | null;
      images?: ImageAttachment[];
    }
  ): Promise<string>;
  generateCrossYearSynthesis?(prompt: string): Promise<string>;
  generateRecipeCriticReview?(prompt: string): Promise<string>;
}

export class ApiKeyMissingError extends Error {
  constructor() {
    super(
      'Missing AI API key (GEMINI_API_KEY or OPENAI_API_KEY). ' +
      'Historical exam digestion requires live model execution to prevent synthetic distortion. ' +
      'Offline mock provider is strictly quarantined to tests.'
    );
    this.name = 'ApiKeyMissingError';
  }
}

/**
 * Live Google Gemini API Provider with Multimodal Support
 */
export class GeminiProvider implements AiProvider {
  name = 'gemini';
  modelName: string;
  private apiKey: string;

  constructor(apiKey: string, model = 'gemini-2.5-flash') {
    this.apiKey = apiKey;
    this.modelName = model;
  }

  async generateAnalysis(
    prompt: string,
    context?: { images?: ImageAttachment[] }
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

    const parts: any[] = [{ text: prompt }];
    if (context?.images && context.images.length > 0) {
      for (const img of context.images) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.base64Data,
          },
        });
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
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

  async generateCriticReview(
    prompt: string,
    context?: { images?: ImageAttachment[] }
  ): Promise<string> {
    return this.generateAnalysis(prompt, context);
  }

  async generateCrossYearSynthesis(prompt: string): Promise<string> {
    return this.generateAnalysis(prompt);
  }

  async generateRecipeCriticReview(prompt: string): Promise<string> {
    return this.generateAnalysis(prompt);
  }
}

/**
 * Live OpenAI API Provider with Multimodal Support
 */
export class OpenAiProvider implements AiProvider {
  name = 'openai';
  modelName: string;
  private apiKey: string;

  constructor(apiKey: string, model = 'gpt-4o') {
    this.apiKey = apiKey;
    this.modelName = model;
  }

  async generateAnalysis(
    prompt: string,
    context?: { images?: ImageAttachment[] }
  ): Promise<string> {
    const content: any[] = [{ type: 'text', text: prompt }];

    if (context?.images && context.images.length > 0) {
      for (const img of context.images) {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${img.mimeType};base64,${img.base64Data}`,
          },
        });
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [{ role: 'user', content }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content;
    if (!message) {
      throw new Error('OpenAI API returned empty response content');
    }
    return message;
  }

  async generateCriticReview(
    prompt: string,
    context?: { images?: ImageAttachment[] }
  ): Promise<string> {
    return this.generateAnalysis(prompt, context);
  }

  async generateCrossYearSynthesis(prompt: string): Promise<string> {
    return this.generateAnalysis(prompt);
  }

  async generateRecipeCriticReview(prompt: string): Promise<string> {
    return this.generateAnalysis(prompt);
  }
}

/**
 * Offline Mock Provider (STRICTLY QUARANTINED TO TEST SUITES)
 */
export class OfflineMockProvider implements AiProvider {
  name = 'offline-mock';
  modelName = 'rule-based-mock';

  async generateAnalysis(
    _prompt: string,
    context?: { question?: ExtractedQuestion; passage?: ExtractedPassage | null }
  ): Promise<string> {
    if (!context?.question) {
      throw new Error('OfflineMockProvider requires question context for deterministic derivation');
    }
    const derived = deriveDeterministicAnalysis(context.question, context.passage ?? null);
    return JSON.stringify(derived);
  }

  async generateCriticReview(
    _prompt: string,
    _context?: { question?: ExtractedQuestion; passage?: ExtractedPassage | null }
  ): Promise<string> {
    return JSON.stringify({
      criticStatus: 'passed',
      criticIssues: [],
      repairedFields: null,
    });
  }
}

export function createAiProvider(options?: { allowOfflineMock?: boolean }): AiProvider {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return new GeminiProvider(geminiKey);
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return new OpenAiProvider(openaiKey);
  }

  if (options?.allowOfflineMock) {
    return new OfflineMockProvider();
  }

  throw new ApiKeyMissingError();
}

/**
 * Deterministic psychometric analysis derivation adhering strictly to PedagogicalAnalysisSchema
 */
export function deriveDeterministicAnalysis(
  question: ExtractedQuestion,
  passage: ExtractedPassage | null
): PedagogicalAnalysis {
  const stem = question.stem.toLowerCase();
  const options = question.options;
  const isSingle = question.section === 'single';

  let primarySkill: TaxonomySkill = 'explicit_detail';
  let cognitiveDepth: CognitiveDepth = 'D2_single_step_inference';
  let languageDifficulty: LanguageDifficulty = 'A2_basic';
  let evidenceNecessity: EvidenceNecessity = question.visualEvidenceRequired || !isSingle ? 'essential' : 'none';
  let evidenceSpan: EvidenceSpan = question.visualEvidenceRequired ? 'multimodal_text_and_graphic' : 'single_sentence';
  let reasoningComplexity: ReasoningComplexity = 'simple_single_step';

  if (isSingle) {
    const isGrammar = /will|would|have|has|had|was|were|is|are|been|who|which|that|because|although|if|when|so/i.test(
      `${options.A} ${options.B} ${options.C} ${options.D}`
    );
    if (question.visualEvidenceRequired) {
      primarySkill = 'vocabulary_in_context';
      cognitiveDepth = 'D1_verbatim_retrieval';
      evidenceNecessity = 'essential';
      evidenceSpan = 'multimodal_text_and_graphic';
      reasoningComplexity = 'compound_dual_step';
    } else if (isGrammar) {
      primarySkill = 'grammar_in_context';
      cognitiveDepth = 'D2_single_step_inference';
      reasoningComplexity = 'simple_single_step';
    } else {
      primarySkill = 'vocabulary_in_context';
      cognitiveDepth = 'D1_verbatim_retrieval';
      reasoningComplexity = 'simple_single_step';
    }
    languageDifficulty = question.questionNumber <= 5 ? 'A1_elementary' : 'A2_basic';
  } else {
    reasoningComplexity = 'compound_dual_step';
    if (passage?.genre === 'cloze_passage') {
      primarySkill = 'grammar_in_context';
      cognitiveDepth = 'D2_single_step_inference';
      evidenceSpan = 'cross_sentence_local';
    } else if (/main idea|mainly about|title|best title|topic/i.test(stem)) {
      primarySkill = 'main_idea';
      cognitiveDepth = 'D3_multi_step_synthesis';
      evidenceSpan = 'multi_paragraph_global';
      reasoningComplexity = 'complex_multi_step_deduction';
    } else if (/why|reason|how.*feel|what does.*mean|infer|learn from/i.test(stem)) {
      primarySkill = 'local_inference';
      cognitiveDepth = 'D3_multi_step_synthesis';
      evidenceSpan = 'cross_sentence_local';
    } else if (/purpose|author.*write|writer.*tell/i.test(stem)) {
      primarySkill = 'purpose_speaker_intent';
      cognitiveDepth = 'D4_evaluative_pragmatic';
      evidenceSpan = 'multi_paragraph_global';
      reasoningComplexity = 'complex_multi_step_deduction';
    } else if (/map|direction|route|chart|step|recipe|fruit tea|how.*go/i.test(stem) || question.evidenceMode === 'spatial') {
      primarySkill = 'information_integration';
      cognitiveDepth = 'D3_multi_step_synthesis';
      evidenceSpan = 'multimodal_text_and_graphic';
    } else if (/word|mean|in line|closest in meaning/i.test(stem)) {
      primarySkill = 'vocabulary_in_context';
      cognitiveDepth = 'D2_single_step_inference';
      evidenceSpan = 'cross_sentence_local';
    } else {
      primarySkill = 'explicit_detail';
      cognitiveDepth = 'D2_single_step_inference';
      evidenceSpan = 'cross_sentence_local';
    }
    languageDifficulty = question.questionNumber <= 25 ? 'A2_basic' : 'B1_intermediate';
  }

  const reasoningOperations = isSingle
    ? question.visualEvidenceRequired
      ? ['visual_feature_scanning', 'lexical_semantic_matching', 'action_entity_verification']
      : ['syntactic_parsing', 'lexical_semantic_matching']
    : ['cross_sentence_coreference', 'hypothesis_elimination', 'evidence_synthesis'];

  const correctLetter = (question.answer || 'A') as 'A' | 'B' | 'C' | 'D';
  const letters: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

  const distractorStrategiesPool: DistractorPattern[] = [
    'literal_keyword_matching',
    'partial_truth',
    'wrong_referent',
    'wrong_chronology',
    'unsupported_world_knowledge',
    'grammatically_plausible_contextually_wrong',
  ];

  let distractorIdx = (question.questionNumber * 3) % distractorStrategiesPool.length;

  const defaultEvidenceRef: EvidenceReference = {
    type: question.visualEvidenceRequired ? 'visual_page_asset' : passage ? 'passage_text' : 'stem_clue',
    location: question.visualEvidenceRequired
      ? `Page ${question.page} illustration`
      : passage
      ? `Paragraph 1, lines 1-3`
      : `Question #${question.questionNumber} sentence stem`,
    quoteOrDescription: question.visualEvidenceRequired
      ? `Visual evidence depicted on page ${question.page}`
      : passage
      ? passage.text.slice(0, 80)
      : question.stem,
    role: 'primary_proof',
  };

  const optionAnalyses: OptionAnalysisItem[] = letters.map((letter) => {
    if (letter === correctLetter) {
      return {
        option: letter,
        isCorrect: true,
        correctRationale: `Option (${letter}) "${question.options[letter]}" directly aligns with the verified evidence in the text/visuals and uniquely fulfills all stem constraints.`,
        evidenceRefs: [defaultEvidenceRef],
      };
    }

    const strat = distractorStrategiesPool[distractorIdx % distractorStrategiesPool.length];
    distractorIdx++;

    const distractorRationaleMap: Record<DistractorPattern, string> = {
      literal_keyword_matching: `Tempts students by mirroring surface words from the context while asserting an unverified or contradictory proposition.`,
      partial_truth: `Reflects a genuine detail from the text but fails to answer the specific condition asked in the stem.`,
      wrong_referent: `Attributes an action, attribute, or statement from the text to the wrong subject or entity.`,
      wrong_chronology: `Swaps the temporal sequence or cause-and-effect relationship established in the passage.`,
      local_evidence_for_global_question: `Quotes a true local detail from paragraph 1 but fails to encompass the overall main idea or passage arc.`,
      unsupported_world_knowledge: `Plausible in everyday common sense, but entirely unsupported or contradicted by the passage facts.`,
      reversed_cause_effect: `Inverts cause and outcome in a causal chain stated in the text.`,
      grammatically_plausible_contextually_wrong: `Fits the blank syntactically but violates contextual meaning or discourse flow.`,
      overgeneralization: `Extrapolates a limited specific statement into an absolute universal claim.`,
      undergeneralization: `Narrows down a broad theme to a single minor example.`,
      irrelevant_distractor: `Presents unrelated content that does not address the text or stem.`,
      other: `Psychometric discriminator testing targeted contextual boundaries.`,
    };

    return {
      option: letter,
      isCorrect: false,
      distractorStrategy: strat,
      distractorRationale: distractorRationaleMap[strat] || `Option (${letter}) "${question.options[letter]}" is plausible but contradicted by evidence.`,
      evidenceRefs: [
        {
          ...defaultEvidenceRef,
          role: 'counter_evidence',
        },
      ],
      misconceptionTarget: `Confusing surface lexical match with semantic proposition`,
    };
  });

  const readingDemand: DemandLevel = isSingle ? 'low' : question.questionNumber > 30 ? 'high' : 'medium';
  const grammarDemand: DemandLevel = primarySkill === 'grammar_in_context' ? 'high' : 'medium';
  const vocabularyDemand: DemandLevel = languageDifficulty === 'B1_intermediate' ? 'high' : 'medium';
  const inferenceDemand: DemandLevel =
    cognitiveDepth === 'D4_evaluative_pragmatic' || cognitiveDepth === 'D3_multi_step_synthesis'
      ? 'high'
      : 'medium';
  const visualIntegrationDemand: DemandLevel = question.visualEvidenceRequired ? 'high' : 'low';

  const normalizedEvidenceMode: 'text_only' | 'visual_only' | 'multimodal_mixed' | 'spatial' =
    question.evidenceMode === 'visual_only'
      ? 'visual_only'
      : question.evidenceMode === 'spatial'
      ? 'spatial'
      : question.evidenceMode === 'text_visual' || question.evidenceMode === 'multi_document' || question.visualEvidenceRequired
      ? 'multimodal_mixed'
      : 'text_only';

  return {
    primarySkill,
    secondarySkills: isSingle ? [] : ['discourse_relationship'],
    languageDifficulty,
    cognitiveDepth,
    evidenceMode: normalizedEvidenceMode,
    evidenceNecessity,
    evidenceSpan,
    reasoningOperations,
    reasoningComplexity,
    optionAnalyses,
    readingDemand,
    grammarDemand,
    vocabularyDemand,
    inferenceDemand,
    visualIntegrationDemand,
    questionMechanism: isSingle
      ? question.visualEvidenceRequired
        ? 'Multimodal visual-lexical integration evaluating direct visual perception and vocabulary retrieval'
        : 'Targeted lexical/grammatical gap evaluation in an isolated communicative sentence'
      : 'Discourse-grounded reading comprehension with multi-sentence clue resolution',
    whyTheQuestionWorks: `Discriminates students who comprehend ${primarySkill} against surface word matchers.`,
    studentFailureModes: [
      'Scanning for identical keywords in the passage without constraint resolution',
      'Ignoring negative polarity or qualifying constraints in the stem',
    ],
    misconceptionsTargeted: [
      'Assuming word presence equals factual truth',
      'Superficial visual scanning without systematic feature verification',
    ],
    reusableDesignPrinciple: `Pair unambiguous evidence with distractors exploiting common optical scan heuristics.`,
    shallowRecall: {
      isShallowRecall: isSingle && primarySkill === 'vocabulary_in_context' && !question.visualEvidenceRequired,
      recallType: isSingle && primarySkill === 'vocabulary_in_context' && !question.visualEvidenceRequired
        ? 'intentional_retrieval_drill'
        : 'none',
      explanation: isSingle && primarySkill === 'vocabulary_in_context' && !question.visualEvidenceRequired
        ? 'Single-sentence targeted lexical recall'
        : 'Contextually bound reading evaluation',
    },
    difficultyAdjustment: {
      canSimplifyLanguageWithoutBreakingMechanism: true,
      simplificationConstraints: [
        'Must preserve core syntactic connective or prompt structure',
        'Must keep distractors aligned with parallel grammatical category',
      ],
      canIncreaseDepthWithoutIncreasingVocabulary: true,
      depthAdjustmentStrategies: [
        'Introduce multi-sentence constraint dependencies',
        'Require cross-paragraph inference rather than proximate sentence lookup',
      ],
    },
    analysisConfidence: 'high',
    uncertainties: [],
    evidenceReferences: [defaultEvidenceRef],
    criticStatus: 'passed',
    criticIssues: [],
  };
}

