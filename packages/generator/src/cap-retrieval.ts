import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import capRoutingIndexJson from '../curriculum/cap-precedent-routing-index.json' with { type: 'json' }
import type { CapDesignAnchor, CapRetrievalPreferences } from './cap-precedent-audit.js'
import type { DeliveryMemoryProjection } from './curriculum-maps/delivery-memory.js'

export interface CapRoutingCard {
  ref: string
  genre: string
  primarySkill: string
  secondarySkills: string[]
  cognitiveDepth: string
  languageDifficulty: string
  evidenceMode: string
  evidenceSpan: string
  shard: string
}

export interface CapRoutingIndex {
  version: string
  authorityStatus: 'authoritative'
  capKnowledgeVersion: string
  capCorpusHash: string
  capBundleVersion: string
  plannerVersion: string
  qualityFloorVersion: string
  cards: CapRoutingCard[]
}

export interface CapCandidateSummary {
  ref: string
  genre: string
  primarySkill: string
  secondarySkills: string[]
  cognitiveDepth: string
  languageDifficulty: string
  evidenceMode: string
  evidenceSpan: string
  shard: string
  pedagogicalScore: number
}

export interface CapRetrievalIntent {
  learningObjective?: string
  primarySkill: string
  secondarySkills?: string[]
  genre?: string
  targetLanguageDifficulty?: string
  targetCognitiveDepth?: string
  evidenceMode?: string
  evidenceSpan?: string
  keywords?: string[]
}

export interface CapRetrievalOptions {
  limit?: number
  preferences?: CapRetrievalPreferences & {
    recentDeliveryMemory?: DeliveryMemoryProjection[]
  }
  routingIndex?: CapRoutingIndex
}

export interface CapRetrievalResult {
  candidates: CapCandidateSummary[]
  corpusHash: string
  authorityStatus: 'authoritative'
  totalCandidatesAvailable: number
  shardsCovered: string[]
  noPrecedentReason?: string | null
}

const defaultIndex = capRoutingIndexJson as unknown as CapRoutingIndex

function computeHash(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * Computes pedagogical relevance score between retrieval intent and a routing card.
 * Pedagogical fit is ranked ahead of generic topic similarity.
 */
export function scoreRoutingCard(
  intent: CapRetrievalIntent,
  card: CapRoutingCard,
  preferences?: CapRetrievalPreferences & { recentDeliveryMemory?: DeliveryMemoryProjection[] },
): number {
  let score = 0

  // 1. Primary pedagogical skill match (weight 6)
  if (card.primarySkill === intent.primarySkill) {
    score += 6
  }

  // 2. Cognitive depth match (weight 3)
  if (intent.targetCognitiveDepth && card.cognitiveDepth === intent.targetCognitiveDepth) {
    score += 3
  }

  // 3. Evidence span match (weight 2)
  if (intent.evidenceSpan && card.evidenceSpan === intent.evidenceSpan) {
    score += 2
  }

  // 4. Genre match (weight 2)
  if (intent.genre && card.genre === intent.genre) {
    score += 2
  }

  // 5. Language difficulty level match (weight 1)
  if (intent.targetLanguageDifficulty && card.languageDifficulty === intent.targetLanguageDifficulty) {
    score += 1
  }

  // 6. Evidence mode match (weight 1)
  if (intent.evidenceMode && card.evidenceMode === intent.evidenceMode) {
    score += 1
  }

  // 7. Secondary skills overlap (weight 1 each)
  if (Array.isArray(intent.secondarySkills) && intent.secondarySkills.length > 0) {
    const desiredSecondary = new Set(intent.secondarySkills)
    for (const skill of card.secondarySkills) {
      if (desiredSecondary.has(skill)) {
        score += 1
      }
    }
  }

  // 8. Keyword matches against ref / genre / skills (weight 0.5 each)
  if (Array.isArray(intent.keywords) && intent.keywords.length > 0) {
    const textBlob = `${card.ref} ${card.genre} ${card.primarySkill} ${card.secondarySkills.join(' ')}`.toLowerCase()
    for (const kw of intent.keywords) {
      if (textBlob.includes(kw.toLowerCase())) {
        score += 0.5
      }
    }
  }

  // Diversity Penalties:
  // Penalize recently used precedent references (-1.5)
  if (preferences?.recentPrecedentRefs && preferences.recentPrecedentRefs.includes(card.ref)) {
    score -= 1.5
  }

  // Penalize recent delivery memory overlap if genre matches recent repetition
  if (preferences?.recentDeliveryMemory && preferences.recentDeliveryMemory.length > 0) {
    const recentGenres = preferences.recentDeliveryMemory.map((m) => m.readingGenre.toLowerCase())
    if (recentGenres.slice(-2).includes(card.genre.toLowerCase())) {
      score -= 0.5
    }
  }

  return score
}

/**
 * Stage 1: Filters and ranks the 195 canonical cards into small candidate summaries.
 */
export function filterAndRankCapPrecedents(
  intent: CapRetrievalIntent,
  options: CapRetrievalOptions = {},
): CapRetrievalResult {
  const index = options.routingIndex ?? defaultIndex
  const limit = Math.max(1, Math.min(10, options.limit ?? 5))
  const preferences = options.preferences

  if (!intent || !intent.primarySkill || typeof intent.primarySkill !== 'string' || intent.primarySkill.trim() === '') {
    return {
      candidates: [],
      corpusHash: index.capCorpusHash ?? '',
      authorityStatus: 'authoritative',
      totalCandidatesAvailable: 0,
      shardsCovered: [],
      noPrecedentReason: 'missing_primary_skill',
    }
  }

  if (index.authorityStatus !== 'authoritative') {
    return {
      candidates: [],
      corpusHash: index.capCorpusHash ?? '',
      authorityStatus: 'authoritative',
      totalCandidatesAvailable: 0,
      shardsCovered: [],
      noPrecedentReason: 'routing_index_not_authoritative',
    }
  }

  const scoredCards = index.cards
    .map((card) => ({
      card,
      score: scoreRoutingCard(intent, card, preferences),
    }))
    // Hard quality floor: at least primary skill or core dimension match (score >= 6)
    .filter((entry) => entry.score >= 6)
    .sort((a, b) => b.score - a.score || a.card.ref.localeCompare(b.card.ref))

  // Fallback if strict threshold produced fewer candidates: include best matches >= 3
  let chosen = scoredCards
  if (chosen.length < limit) {
    const fallbacks = index.cards
      .map((card) => ({
        card,
        score: scoreRoutingCard(intent, card, preferences),
      }))
      .filter((entry) => entry.score >= 3 && !chosen.some((c) => c.card.ref === entry.card.ref))
      .sort((a, b) => b.score - a.score || a.card.ref.localeCompare(b.card.ref))
    chosen = [...chosen, ...fallbacks]
  }

  const top = chosen.slice(0, limit)
  const shardsSet = new Set<string>()

  const candidates: CapCandidateSummary[] = top.map((entry) => {
    shardsSet.add(entry.card.shard)
    return {
      ref: entry.card.ref,
      genre: entry.card.genre,
      primarySkill: entry.card.primarySkill,
      secondarySkills: entry.card.secondarySkills,
      cognitiveDepth: entry.card.cognitiveDepth,
      languageDifficulty: entry.card.languageDifficulty,
      evidenceMode: entry.card.evidenceMode,
      evidenceSpan: entry.card.evidenceSpan,
      shard: entry.card.shard,
      pedagogicalScore: entry.score,
    }
  })

  return {
    candidates,
    corpusHash: index.capCorpusHash,
    authorityStatus: index.authorityStatus,
    totalCandidatesAvailable: chosen.length,
    shardsCovered: Array.from(shardsSet),
    noPrecedentReason: candidates.length === 0 ? 'no_matching_authoritative_precedent_for_intent' : null,
  }
}

export interface ItemPrecedentRetrievalResult {
  itemIndex: number
  intent: CapRetrievalIntent
  precedentRefs: string[]
  noPrecedentReason: string | null
  pedagogicalScore?: number
}

export interface MultiItemPrecedentRetrievalResult {
  itemResults: ItemPrecedentRetrievalResult[]
  uniqueCandidateRefs: string[]
  expandedCards: CapDesignAnchor[]
}

/**
 * Executes deliberate precedent retrieval across planned assessment item intents:
 * 1. Retrieves 1–5 candidate precedents per item intent.
 * 2. Leaves explicit noPrecedentReason if no precedent matches the pedagogical intent.
 * 3. Deduplicates unique precedent refs across items.
 * 4. Expands unique precedent cards from disk shards in a single pass.
 */
export async function retrievePrecedentsForAssessmentPlans(
  intents: CapRetrievalIntent[],
  options: CapRetrievalOptions & { repoRoot?: string } = {},
): Promise<MultiItemPrecedentRetrievalResult> {
  const itemResults: ItemPrecedentRetrievalResult[] = []
  const uniqueRefsSet = new Set<string>()

  for (let idx = 0; idx < intents.length; idx += 1) {
    const intent = intents[idx]!
    const res = filterAndRankCapPrecedents(intent, options)
    const refs = res.candidates.map((c) => c.ref)
    for (const r of refs) {
      uniqueRefsSet.add(r)
    }
    itemResults.push({
      itemIndex: idx,
      intent,
      precedentRefs: refs,
      noPrecedentReason: res.noPrecedentReason ?? (refs.length === 0 ? 'no_precedents_found' : null),
      pedagogicalScore: res.candidates[0]?.pedagogicalScore,
    })
  }

  const uniqueCandidateRefs = Array.from(uniqueRefsSet)
  const expandedCards = uniqueCandidateRefs.length > 0
    ? await expandCapPrecedents(uniqueCandidateRefs, { repoRoot: options.repoRoot })
    : []

  return {
    itemResults,
    uniqueCandidateRefs,
    expandedCards,
  }
}

/**
 * Batches candidate retrieval across multiple lesson intents (e.g. reading, guided, independent questions).
 */
export function batchRetrieveCapCandidates(
  intents: CapRetrievalIntent[],
  options: CapRetrievalOptions = {},
): Map<number, CapRetrievalResult> {
  const results = new Map<number, CapRetrievalResult>()
  for (let index = 0; index < intents.length; index += 1) {
    const intent = intents[index]
    if (intent) {
      results.set(index, filterAndRankCapPrecedents(intent, options))
    }
  }
  return results
}

/**
 * Stage 2: Deduplicated shard expansion.
 * Expands full CapDesignAnchor cards from disk shards, reading each shard file only once.
 * Fails closed with explicit errors if any requested ref is unknown or missing in shards.
 */
export async function expandCapPrecedents(
  refs: string[],
  options: {
    routingIndex?: CapRoutingIndex
    repoRoot?: string
    shardReader?: (shardPath: string) => Promise<string>
  } = {},
): Promise<CapDesignAnchor[]> {
  if (!refs || refs.length === 0) return []

  const index = options.routingIndex ?? defaultIndex
  const repoRoot = options.repoRoot ?? process.cwd()

  // Map each ref to its card entry in routing index
  const cardMap = new Map<string, CapRoutingCard>()
  for (const card of index.cards) {
    cardMap.set(card.ref, card)
  }

  // 1. Fail closed on any unknown references in the routing index
  const unknownRefs: string[] = []
  for (const ref of refs) {
    if (!cardMap.has(ref)) {
      unknownRefs.push(ref)
    }
  }
  if (unknownRefs.length > 0) {
    throw new Error(
      `UNKNOWN_CAP_PRECEDENT_REFS: The following requested precedent references are unknown in routing index: ${unknownRefs.join(', ')}`,
    )
  }

  // Group unique refs by shard path
  const shardToRefs = new Map<string, Set<string>>()
  for (const ref of refs) {
    const card = cardMap.get(ref)!
    let set = shardToRefs.get(card.shard)
    if (!set) {
      set = new Set<string>()
      shardToRefs.set(card.shard, set)
    }
    set.add(ref)
  }

  const reader = options.shardReader ?? (async (shardPath: string) => {
    const fullPath = resolve(repoRoot, shardPath)
    return readFile(fullPath, 'utf8')
  })

  // Load each shard once in parallel - fail closed on read or parse failure
  const expandedCardsMap = new Map<string, CapDesignAnchor>()

  await Promise.all(
    Array.from(shardToRefs.entries()).map(async ([shardPath, targetRefs]) => {
      let content: string
      try {
        content = await reader(shardPath)
      } catch (err) {
        throw new Error(
          `FAILED_TO_READ_CAP_SHARD: Failed to read shard '${shardPath}': ${err instanceof Error ? err.message : String(err)}`,
        )
      }

      let parsed: any
      try {
        parsed = JSON.parse(content)
      } catch (err) {
        throw new Error(
          `INVALID_CAP_SHARD_JSON: Shard '${shardPath}' contains invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
        )
      }

      if (parsed?.authorityStatus !== 'authoritative' || !Array.isArray(parsed.cards)) {
        throw new Error(
          `UNAUTHORITATIVE_CAP_SHARD: Shard '${shardPath}' authorityStatus is not 'authoritative' or missing cards array`,
        )
      }

      for (const rawCard of parsed.cards) {
        if (rawCard?.ref && targetRefs.has(rawCard.ref)) {
          expandedCardsMap.set(rawCard.ref, rawCard as CapDesignAnchor)
        }
      }
    }),
  )

  // 2. Fail closed if any requested card was not found in the loaded shards
  const missingCards = refs.filter((ref) => !expandedCardsMap.has(ref))
  if (missingCards.length > 0) {
    throw new Error(
      `MISSING_CAP_PRECEDENT_CARDS: The following requested precedent references were not found in shards: ${missingCards.join(', ')}`,
    )
  }

  // Return full cards in the exact requested order
  const results: CapDesignAnchor[] = []
  for (const ref of refs) {
    const card = expandedCardsMap.get(ref)
    if (card) {
      results.push(card)
    }
  }

  return results
}

/**
 * Injects selectively retrieved, authoritative CAP precedent cards into the authoring bundle,
 * replacing the full 195-card routing index table to achieve prompt context compaction.
 */
export function prepareSelectiveAuthoringBundle(
  bundle: string,
  expandedPrecedents: CapDesignAnchor[],
): string {
  const marker = '## 2B. Compact CAP Precedent Routing Index'
  const nextSection = '## 3. Model Quality Profile Resolution'
  const startIndex = bundle.indexOf(marker)
  const endIndex = bundle.indexOf(nextSection)

  if (startIndex === -1 || endIndex === -1) {
    return bundle
  }

  const boundedSection = [
    '## 2B. Retrieved Authoritative CAP Precedent Cards (Selective)',
    'The following bounded authoritative CAP precedent cards have been selectively retrieved for this claimed lesson context from verified shards.',
    'Anchor, blend, or calibrate against these relevant design principles without structural imitation.',
    '```json',
    JSON.stringify(expandedPrecedents, null, 2),
    '```',
    '',
    '',
  ].join('\n')

  return bundle.slice(0, startIndex) + boundedSection + bundle.slice(endIndex)
}

