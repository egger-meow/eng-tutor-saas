import { readFile, writeFile } from 'node:fs/promises'

async function edit(path, transform) {
  const before = await readFile(path, 'utf8')
  const after = transform(before)
  if (after === before) throw new Error(`No change applied to ${path}`)
  await writeFile(path, after)
}

function replaceItBlock(content, title, newBlock) {
  const startMarker = `    it('${title}', async () => {`
  const start = content.indexOf(startMarker)
  if (start < 0) throw new Error(`Missing async nested test block: ${title}`)
  const closeMarker = '\n    })'
  const close = content.indexOf(closeMarker, start + startMarker.length)
  if (close < 0) throw new Error(`Cannot find close of async nested test block: ${title}`)
  const end = close + closeMarker.length
  return content.slice(0, start) + newBlock + content.slice(end)
}

function replaceTopLevelItBlock(content, title, newBlock) {
  const startMarker = `  it('${title}', async () => {`
  const start = content.indexOf(startMarker)
  if (start < 0) throw new Error(`Missing async test block: ${title}`)
  const closeMarker = '\n  })'
  const close = content.indexOf(closeMarker, start + startMarker.length)
  if (close < 0) throw new Error(`Cannot find close of async test block: ${title}`)
  const end = close + closeMarker.length
  return content.slice(0, start) + newBlock + content.slice(end)
}

await edit('packages/generator/src/model-quality-profile.test.ts', (content) => {
  content = replaceItBlock(content, 'repairs an underfilled workload surgically while preserving grounding and unaffected content', `    it('does not force surgical repair merely because workload telemetry is underfilled', async () => {
      const canonical = buildSampleCanonicalPackage()
      const original = structuredClone(canonical)

      const result = await applyModelQualityProfile(canonical, {
        modelName: 'gemini-3.7-flash',
        targetMinutes: 100,
      })

      expect(result.success).toBe(true)
      expect(result.curriculumPackage!.studentLesson.reading).toEqual(original.studentLesson.reading)
      expect(result.curriculumPackage!.studentLesson.practice).toEqual(original.studentLesson.practice)
      expect(result.curriculumPackage!.answers).toEqual(original.answers)
    })`)

  content = replaceItBlock(content, 'rejects workload repair that deletes an existing required curriculum stage', `    it('still rejects a surgical hook that deletes existing curriculum structure', async () => {
      const canonical = buildSampleCanonicalPackage()
      const result = await applyModelQualityProfile(canonical, {
        modelName: 'gemini-3.7-flash',
        surgicalRepairHook: (pkg) => {
          pkg.studentLesson.practice = pkg.studentLesson.practice.filter((section) => section.stage !== 'retrieval')
          return pkg
        },
      })

      expect(result.success).toBe(false)
      expect(result.issues?.[0]?.message).toMatch(/corrupted question identifiers|deleted a required curriculum stage/u)
    })`)

  content = replaceItBlock(content, 'trims only low-value redundant work from an overfilled package and preserves required stages', `    it('does not force trimming merely because workload telemetry is overfilled', async () => {
      const canonical = buildSampleCanonicalPackage()
      const originalReading = structuredClone(canonical.studentLesson.reading)
      const section = canonical.studentLesson.practice[1]!
      for (let index = 0; index < 8; index += 1) {
        const questionId = \`budget-redundant-\${index}\`
        section.questions.push({
          id: questionId,
          targetIds: ['reading-inference'],
          itemType: 'short-response',
          prompt: 'Repeat the same evidence sentence.',
          writingLines: 2,
          difficulty: 'on-level',
        })
        canonical.answers.push({
          questionId,
          answer: 'The same evidence sentence.',
          acceptedAnswers: [],
          explanationZh: '這是重複練習。',
          likelyMisconceptionZh: null,
          followUpZh: null,
        })
      }
      const originalQuestions = structuredClone(canonical.studentLesson.practice)

      const result = await applyModelQualityProfile(canonical, {
        modelName: 'gemini-3.7-flash',
        targetMinutes: 70,
      })

      expect(result.success).toBe(true)
      expect(result.curriculumPackage!.studentLesson.reading).toEqual(originalReading)
      expect(result.curriculumPackage!.studentLesson.practice).toEqual(originalQuestions)
    })`)
  return content
})

await edit('packages/worker/src/pipeline.test.ts', (content) => replaceTopLevelItBlock(
  content,
  'rejects an underfilled package against profile.weekly_minutes before rendering',
`  it('does not block rendering solely because profile.weekly_minutes heuristic is underfilled', async () => {
    const state = setup()
    const render = vi.fn(async () => pdfs)
    const budgetContext: GenerationContext = {
      ...curriculumContext,
      profile: { weekly_minutes: 300 },
    }

    await expect(completeCurriculumJob({
      client: state.client,
      workerId: 'worker-1',
      context: budgetContext,
      curriculumPackage: curriculumSample,
      render,
      inspect,
    })).resolves.toBe('material-1')
    expect(render).toHaveBeenCalledTimes(1)
    expect(state.uploads).toEqual(['kobe/kobe-week-2-v2/student.pdf', 'kobe/kobe-week-2-v2/parent-answer.pdf'])
  })`,
))

console.log('Aligned workload repair and worker tests with warning-only workload telemetry.')
