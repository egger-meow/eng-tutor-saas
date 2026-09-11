import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CANONICAL_ITEMS,
  CANONICAL_PASSAGES,
  validateAssessmentBank,
} from '../src/bank/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function sqlEscape(str: string): string {
  return str.replace(/'/g, "''")
}

function generateSeedSql(): string {
  const valResult = validateAssessmentBank(CANONICAL_ITEMS, CANONICAL_PASSAGES)
  if (!valResult.isValid) {
    throw new Error(`Bank validation failed:\n${valResult.errors.join('\n')}`)
  }

  const lines: string[] = []
  lines.push('-- Forward-only migration: Seed Canonical Direct Assessment Question Bank')
  lines.push('-- Generated from packages/assessment/src/bank')
  lines.push(`-- Total Passages: ${CANONICAL_PASSAGES.length}`)
  lines.push(`-- Total Items: ${CANONICAL_ITEMS.length}`)
  lines.push('')
  lines.push('-- 1. Insert or update canonical reading passages')

  for (const p of CANONICAL_PASSAGES) {
    const id = `'${sqlEscape(p.id)}'`
    const title = `'${sqlEscape(p.title)}'`
    const content = `'${sqlEscape(p.content)}'`
    const wordCount = p.wordCount
    const gradeBand = `'${sqlEscape(p.gradeBand)}'`
    const status = `'${sqlEscape(p.status)}'`

    lines.push(`insert into public.assessment_passages (`)
    lines.push(`  id, title, content, word_count, grade_band, status`)
    lines.push(`) values (`)
    lines.push(`  ${id}, ${title}, ${content}, ${wordCount}, ${gradeBand}, ${status}`)
    lines.push(`) on conflict (id) do update set`)
    lines.push(`  title = excluded.title,`)
    lines.push(`  content = excluded.content,`)
    lines.push(`  word_count = excluded.word_count,`)
    lines.push(`  grade_band = excluded.grade_band,`)
    lines.push(`  status = excluded.status,`)
    lines.push(`  updated_at = now();`)
    lines.push('')
  }

  lines.push('-- 2. Insert or update canonical assessment items')
  for (const item of CANONICAL_ITEMS) {
    const id = `'${sqlEscape(item.id)}'`
    const domain = `'${sqlEscape(item.domain)}'`
    const skill = `'${sqlEscape(item.skill)}'`
    const difficulty = item.difficulty
    const gradeBand = `'${sqlEscape(item.gradeBand)}'`
    const responseType = `'${sqlEscape(item.responseType)}'`
    const passageId = item.passageId ? `'${sqlEscape(item.passageId)}'` : 'null'
    const prompt = `'${sqlEscape(item.prompt)}'`
    const choices = item.choices ? `'${sqlEscape(JSON.stringify(item.choices))}'::jsonb` : 'null'
    const correctChoice = item.correctChoice ? `'${sqlEscape(item.correctChoice)}'` : 'null'
    const acceptedAnswers = item.acceptedAnswers
      ? `'${sqlEscape(JSON.stringify(item.acceptedAnswers))}'::jsonb`
      : 'null'
    const analysisTags =
      item.analysisTags && item.analysisTags.length > 0
        ? `array[${item.analysisTags.map((t) => `'${sqlEscape(t)}'`).join(', ')}]::text[]`
        : `'{}'::text[]`
    const status = `'${sqlEscape(item.status)}'`
    const version = item.version ?? 1

    lines.push(`insert into public.assessment_items (`)
    lines.push(
      `  id, domain, skill, difficulty, grade_band, response_type, passage_id, prompt, choices, correct_choice, accepted_answers, analysis_tags, status, version`
    )
    lines.push(`) values (`)
    lines.push(
      `  ${id}, ${domain}, ${skill}, ${difficulty}, ${gradeBand}, ${responseType}, ${passageId}, ${prompt}, ${choices}, ${correctChoice}, ${acceptedAnswers}, ${analysisTags}, ${status}, ${version}`
    )
    lines.push(`) on conflict (id) do update set`)
    lines.push(`  domain = excluded.domain,`)
    lines.push(`  skill = excluded.skill,`)
    lines.push(`  difficulty = excluded.difficulty,`)
    lines.push(`  grade_band = excluded.grade_band,`)
    lines.push(`  response_type = excluded.response_type,`)
    lines.push(`  passage_id = excluded.passage_id,`)
    lines.push(`  prompt = excluded.prompt,`)
    lines.push(`  choices = excluded.choices,`)
    lines.push(`  correct_choice = excluded.correct_choice,`)
    lines.push(`  accepted_answers = excluded.accepted_answers,`)
    lines.push(`  analysis_tags = excluded.analysis_tags,`)
    lines.push(`  status = excluded.status,`)
    lines.push(`  version = excluded.version,`)
    lines.push(`  updated_at = now();`)
    lines.push('')
  }

  return lines.join('\n')
}

const targetPath = path.resolve(
  __dirname,
  '../../../supabase/migrations/20260911190000_seed_canonical_assessment_bank.sql'
)
const sql = generateSeedSql()
fs.writeFileSync(targetPath, sql, 'utf-8')
console.log(`Successfully generated seed migration at: ${targetPath}`)
console.log(`Total Passages: ${CANONICAL_PASSAGES.length}`)
console.log(`Total Items: ${CANONICAL_ITEMS.length}`)
