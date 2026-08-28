import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { rotateHoldoutManifest } from '../../scripts/history-exams/src/benchmark/rotate-holdouts.ts'

const roots: string[] = []
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })))
describe('rolling holdout rotation', () => {
  it('preserves four active holdouts per year and drops the retired year', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-holdout-')); roots.push(root)
    const benchmark = path.join(root, 'benchmark'); fs.mkdirSync(benchmark)
    const source = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'history_exams/benchmark/holdout-manifest.json'), 'utf8'))
    source.holdoutQuestions.push(...source.holdoutQuestions.filter((q: any) => q.examId === '111').map((q: any) => ({ ...q, examId: '110' })))
    fs.writeFileSync(path.join(benchmark, 'holdout-manifest.json'), JSON.stringify(source))
    const result = rotateHoldoutManifest(path.join(process.cwd(), 'history_exams/analyzed'), benchmark, ['111', '112', '113', '114', '115'])
    expect(result.holdoutQuestions).toHaveLength(20)
    expect(result.holdoutQuestions.some((q) => q.examId === '110')).toBe(false)
    for (const id of ['111', '112', '113', '114', '115']) expect(result.holdoutQuestions.filter((q) => q.examId === id)).toHaveLength(4)
  })
})
