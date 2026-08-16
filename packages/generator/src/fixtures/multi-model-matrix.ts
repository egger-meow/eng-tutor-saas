export interface ModelTierConfig {
  tierName: 'Strong' | 'Medium' | 'Cheap'
  modelNames: string[]
  inputPricePerMillion: number
  outputPricePerMillion: number
  typicalPromptTokens: number
  typicalOutputTokens: number
}

export const MODEL_TIERS: Record<string, ModelTierConfig> = {
  strong: {
    tierName: 'Strong',
    modelNames: ['gpt-4o', 'claude-3-5-sonnet-20241022'],
    inputPricePerMillion: 2.50,
    outputPricePerMillion: 10.00,
    typicalPromptTokens: 3200,
    typicalOutputTokens: 3800,
  },
  medium: {
    tierName: 'Medium',
    modelNames: ['gpt-4o-mini', 'claude-3-5-haiku-20241022'],
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.60,
    typicalPromptTokens: 3200,
    typicalOutputTokens: 3800,
  },
  cheap: {
    tierName: 'Cheap',
    modelNames: ['gemini-1.5-flash', 'llama-3.1-70b-instruct'],
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.30,
    typicalPromptTokens: 3200,
    typicalOutputTokens: 3800,
  },
}

export interface AblationVariant {
  id: string
  name: string
  description: string
  hasNormalization: boolean
  hasMicroFewShot: boolean
  hasLocalQAProtocol: boolean
  hasSimpleEvidenceRecipe: boolean
}

export const ABLATION_VARIANTS: AblationVariant[] = [
  {
    id: 'v1-baseline',
    name: '2.1.0 Baseline',
    description: 'Frozen Prompt 2.1.0 with raw wordCount arithmetic checks',
    hasNormalization: false,
    hasMicroFewShot: false,
    hasLocalQAProtocol: false,
    hasSimpleEvidenceRecipe: false,
  },
  {
    id: 'v2-normalize-only',
    name: '+ Normalization Only',
    description: 'Server auto-derives wordCount = countWords(paragraphs)',
    hasNormalization: true,
    hasMicroFewShot: false,
    hasLocalQAProtocol: false,
    hasSimpleEvidenceRecipe: false,
  },
  {
    id: 'v3-few-shot',
    name: '+ Micro Contrastive Few-Shot',
    description: 'Adds BAD->GOOD examples for Trigger-Pattern-Trap-Try and CAP distractor reasoning',
    hasNormalization: true,
    hasMicroFewShot: true,
    hasLocalQAProtocol: false,
    hasSimpleEvidenceRecipe: false,
  },
  {
    id: 'v4-local-qa',
    name: '+ Local Q&A Protocol',
    description: 'Questions and answers authored locally in working memory before projection',
    hasNormalization: true,
    hasMicroFewShot: true,
    hasLocalQAProtocol: true,
    hasSimpleEvidenceRecipe: false,
  },
  {
    id: 'v5-full-wave3',
    name: 'Full Wave 3 (Prompt 2.2.0)',
    description: 'Full 4-pillar system with normalization, few-shot, local Q&A, and simple target evidence recipes',
    hasNormalization: true,
    hasMicroFewShot: true,
    hasLocalQAProtocol: true,
    hasSimpleEvidenceRecipe: true,
  },
]
