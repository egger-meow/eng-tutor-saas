import { readFile } from 'node:fs/promises'
import type { GenerationContext } from './pipeline.js'

const basePromptRoot = new URL('../../generator/prompts/2.4.0/', import.meta.url)
const groundingPromptRoot = new URL('../../generator/prompts/2.5.0/', import.meta.url)
const promptFiles = ['01-plan.md', '02-author.md', '03-critic.md', '04-repair.md']

export async function buildCurriculumPromptBundle(context: GenerationContext): Promise<string> {
  const prompts = await Promise.all(promptFiles.map(async (file) => ({
    file,
    content: `${await readFile(new URL(file, basePromptRoot), 'utf8')}\n\n---\n\n${await readFile(new URL(file, groundingPromptRoot), 'utf8')}`,
  })))
  return [
    '# 紙屬英文 Curriculum Package 2.3.0 · Prompt 2.5.0 · Production Authoring bundle',
    '',
    '這是一個 production generation context。只產出符合 `CurriculumPackageSchema` (2.3.0) 的 JSON；不要輸出 Markdown、PDF、解釋文字或另一位孩子的資料。',
    '流程固定為：plan → author → deterministic validation → independent critic → targeted repair → deterministic validation。',
    '完成後把 JSON 存成檔案，使用 `pnpm worker complete-v2 --worker chatgpt-work-daily --job <job-id> --package <file>`；不要使用 legacy `complete`。',
    '',
    '## Current context',
    '```json',
    JSON.stringify(context, null, 2),
    '```',
    '',
    '## Versioned prompts (2.4.0 baseline + 2.5.0 grounding overlay)',
    ...prompts.flatMap(({ file, content }) => [`\n### ${file}\n`, content]),
    '',
    '## Final handoff requirements',
    '- The package must contain real evidence from this context, not generic placeholders.',
    '- IP & Copyright: All reading passages, examples, questions, and explanations MUST be original. Never reproduce verbatim or closely paraphrase proprietary textbook passages, workbook problems, or copyrighted third-party materials.',
    '- Privacy: Never send child identifiers, nickname, school, level, feedback, mistakes, history, or profile text in web queries. Queries contain generalized public topic terms only. Learner-facing prose may use only the nickname already authorized by the private context.',
    '- Trademarks: Use child interests (e.g. Minecraft, coding, sports) purely as situational context; never imply official partnership or trademark licensing.',
    '- Any packet-quality feedback must change presentation/rubric decisions, not be written as a child weakness.',
    '- Do not claim mastery from exposure; tracking contains hypotheses to verify. Hard invariant: Exposure is not evidence of mastery.',
    '- If the package cannot pass validation or independent critique, do not call complete-v2; return the failure with the exact path and reason.',
  ].join('\n')
}
