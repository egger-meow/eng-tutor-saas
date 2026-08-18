import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { inspectPdf } from './inspect-pdf.js'

const REPO_ROOT = resolve(import.meta.dirname, '../../..')
const STUDENT_SAMPLE_PATH = resolve(REPO_ROOT, 'apps/web/public/samples/sample-week-1-student.pdf')
const PARENT_SAMPLE_PATH = resolve(REPO_ROOT, 'apps/web/public/samples/sample-week-1-parent-answer.pdf')

describe('Public Samples Regression Lock', () => {
  it('locks public Student PDF strictly to The Redstone Door Test (Minecraft)', async () => {
    const studentBuffer = await readFile(STUDENT_SAMPLE_PATH)
    const inspection = await inspectPdf(studentBuffer)

    const normalizedText = inspection.text.replace(/\s+/g, ' ')
    expect(inspection.pageCount).toBeGreaterThanOrEqual(2)
    expect(normalizedText).toContain('The Redstone Door Test')
    expect(normalizedText.replace(/\s+/g, '')).toContain('紅石自動門')
    
    // Ensure legacy / synthetic rooftop garden material never leaks into public samples
    expect(normalizedText).not.toContain('The Rooftop Garden Challenge')
    expect(normalizedText).not.toContain('Two Places, One Question')
    expect(normalizedText).not.toContain('rooftop garden project')
  })

  it('locks public Parent Answer PDF strictly to The Redstone Door Test', async () => {
    const parentBuffer = await readFile(PARENT_SAMPLE_PATH)
    const inspection = await inspectPdf(parentBuffer)

    expect(inspection.pageCount).toBeGreaterThanOrEqual(1)
    expect(inspection.text).toContain('The Redstone Door Test')
    expect(inspection.text).toContain('家')

    // Ensure legacy rooftop garden material never leaks into parent answer sample
    expect(inspection.text).not.toContain('The Rooftop Garden Challenge')
    expect(inspection.text).not.toContain('Two Places, One Question')
  })
})
