import { readFile } from 'node:fs/promises'
import type { GenerationContext } from './pipeline.js'

const promptRoot = new URL('../../generator/prompts/2.0.0/', import.meta.url)
const promptFiles = ['01-plan.md', '02-author.md', '03-critic.md', '04-repair.md']

export async function buildCurriculumPromptBundle(context: GenerationContext): Promise<string> {
  const prompts = await Promise.all(promptFiles.map(async (file) => ({ file, content: await readFile(new URL(file, promptRoot), 'utf8') })))
  return [
    '# 紙屬英文 Curriculum Package 2.0.0 · ChatGPT Work bundle',
    '',
    '這是一個 production generation context。只產出符合 `CurriculumPackageSchema` 的 JSON；不要輸出 Markdown、PDF、解釋文字或另一位孩子的資料。',
    '流程固定為：plan → author → deterministic validation → independent critic → targeted repair → deterministic validation。',
    '完成後把 JSON 存成檔案，使用 `pnpm worker complete-v2 --worker chatgpt-work-daily --job <job-id> --package <file>`；不要使用 legacy `complete`。',
    '',
    '## Current context',
    '```json',
    JSON.stringify(context, null, 2),
    '```',
    '',
    '## Versioned prompts',
    ...prompts.flatMap(({ file, content }) => [`\n### ${file}\n`, content]),
    '',
    '## Final handoff requirements',
    '- The package must contain real evidence from this context, not generic placeholders.',
    '- Any packet-quality feedback must change presentation/rubric decisions, not be written as a child weakness.',
    '- Do not claim mastery from exposure; tracking contains hypotheses to verify.',
    '- If the package cannot pass validation or independent critique, do not call complete-v2; return the failure with the exact path and reason.',
  ].join('\n')
}
