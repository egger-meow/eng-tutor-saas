import { syntheticWeekOne } from '@paper-english/generator'
import { rm, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { artifactFilename } from './render-html.js'
import { renderLessonPdfPair } from './render-pair.js'

async function main(): Promise<void> {
  const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
  const outputDir = resolve(repositoryRoot, 'output/pdf')
  const targets = [artifactFilename(syntheticWeekOne, 'student'), artifactFilename(syntheticWeekOne, 'parent-answer')]
  await Promise.all(targets.map((filename) => rm(resolve(outputDir, filename), { force: true })))
  const pair = await renderLessonPdfPair(syntheticWeekOne, outputDir)
  for (const [kind, path] of [['student', pair.studentPath], ['parent-answer', pair.parentAnswerPath]] as const) {
    const details = await stat(path)
    console.log(JSON.stringify({ kind, path, bytes: details.size }))
  }
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
  process.exitCode = 1
})
