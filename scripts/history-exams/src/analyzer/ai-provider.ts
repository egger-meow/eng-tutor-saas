import fs from 'node:fs';
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
      question: ExtractedQuestion;
      passage?: ExtractedPassage | null;
      images?: ImageAttachment[];
    }
  ): Promise<string>;
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
}

/**
 * Offline Mock Provider (STRICTLY QUARANTINED TO TEST SUITES)
 */
export class OfflineMockProvider implements AiProvider {
  name = 'offline-mock';
  modelName = 'rule-based-mock';

  async generateAnalysis(
    _prompt: string,
    context?: { question: ExtractedQuestion; passage?: ExtractedPassage | null }
  ): Promise<string> {
    if (!context?.question) {
      throw new Error('OfflineMockProvider requires question context for deterministic derivation');
    }
    const derived = deriveDeterministicAnalysis(context.question, context.passage ?? null);
    return JSON.stringify(derived);
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
  let contextNecessity: ContextNecessity = isSingle ? 'none' : 'essential';
  let evidenceSpan: EvidenceSpan = 'single_sentence';

  if (isSingle) {
    const isGrammar = /will|would|have|has|had|was|were|is|are|been|who|which|that|because|although|if|when|so/i.test(
      `${options.A} ${options.B} ${options.C} ${options.D}`
    );
    if (isGrammar) {
      primarySkill = 'grammar_in_context';
      cognitiveDepth = 'D2_single_step_inference';
    } else {
      primarySkill = 'vocabulary_in_context';
      cognitiveDepth = 'D1_verbatim_retrieval';
    }
    languageDifficulty = question.questionNumber <= 5 ? 'A1_elementary' : 'A2_basic';
    evidenceSpan = 'single_sentence';
  } else {
    if (passage?.genre === 'cloze_passage') {
      primarySkill = 'grammar_in_context';
      cognitiveDepth = 'D2_single_step_inference';
      evidenceSpan = 'cross_sentence_local';
    } else if (/main idea|mainly about|title|best title|topic/i.test(stem)) {
      primarySkill = 'main_idea';
      cognitiveDepth = 'D3_multi_step_synthesis';
      evidenceSpan = 'multi_paragraph_global';
    } else if (/why|reason|how.*feel|what does.*mean|infer|learn from/i.test(stem)) {
      primarySkill = 'local_inference';
      cognitiveDepth = 'D3_multi_step_synthesis';
      evidenceSpan = 'cross_sentence_local';
    } else if (/purpose|author.*write|writer.*tell/i.test(stem)) {
      primarySkill = 'purpose_speaker_intent';
      cognitiveDepth = 'D4_evaluative_pragmatic';
      evidenceSpan = 'multi_paragraph_global';
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
    ? ['syntactic_parsing', 'lexical_semantic_matching']
    : ['cross_sentence_coreference', 'hypothesis_elimination', 'evidence_synthesis'];

  const distractorStrategies: PedagogicalAnalysis['distractorStrategies'] = [
    {
      option: 'A',
      strategy: 'literal_keyword_matching',
      explanation: 'Surface keyword matching without context resolution',
    },
    {
      option: 'B',
      strategy: 'partial_truth',
      explanation: 'Mentions text details but violates stem condition',
    },
    {
      option: 'C',
      strategy: 'unsupported_world_knowledge',
      explanation: 'Relying on common sense rather than text evidence',
    },
    {
      option: 'D',
      strategy: 'wrong_referent',
      explanation: 'Confusing agent with recipient or wrong timeline',
    },
  ];

  const readingDemand: DemandLevel = isSingle ? 'low' : question.questionNumber > 30 ? 'high' : 'medium';
  const grammarDemand: DemandLevel = primarySkill === 'grammar_in_context' ? 'high' : 'medium';
  const vocabularyDemand: DemandLevel = languageDifficulty === 'B1_intermediate' ? 'high' : 'medium';
  const inferenceDemand: DemandLevel = cognitiveDepth === 'D4_evaluative_pragmatic' || cognitiveDepth === 'D3_multi_step_synthesis' ? 'high' : 'medium';

  return {
    primarySkill,
    secondarySkills: isSingle ? [] : ['discourse_relationship'],
    languageDifficulty,
    cognitiveDepth,
    evidenceSpan,
    contextNecessity,
    reasoningOperations,
    questionMechanism: isSingle
      ? 'Targeted lexical/grammatical gap evaluation in an isolated communicative sentence'
      : 'Discourse-grounded reading comprehension with multi-sentence clue resolution',
    distractorStrategies,
    requiredKnowledge: isSingle
      ? ['Junior high basic 1200 vocabulary', 'Fundamental syntactic agreement']
      : ['Paragraph coherence tracking', 'Contextual inference', 'Key detail extraction'],
    readingDemand,
    grammarDemand,
    vocabularyDemand,
    inferenceDemand,
    whyTheQuestionWorks: `Discriminates students who comprehend ${primarySkill} against surface word matchers.`,
    possibleStudentFailureModes: [
      'Scanning for identical keywords in the passage',
      'Ignoring negative polarity or qualifying constraints in the stem',
    ],
    reusableDesignPrinciple: `Pair unambiguous textual evidence with distractors exploiting common optical scan heuristics.`,
    shallowRecall: {
      isShallowRecall: isSingle && primarySkill === 'vocabulary_in_context',
      recallType: isSingle && primarySkill === 'vocabulary_in_context' ? 'intentional_retrieval_drill' : 'none',
      explanation: isSingle && primarySkill === 'vocabulary_in_context'
        ? 'Single-sentence targeted lexical recall'
        : 'Contextually bound reading evaluation',
    },
  };
}
