import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { inspectPdf } from './inspect-pdf.js'

const REPO_ROOT = resolve(import.meta.dirname, '../../..')
const STUDENT_SAMPLE_PATH = resolve(REPO_ROOT, 'apps/web/public/samples/sample-student.pdf')
const PARENT_SAMPLE_PATH = resolve(REPO_ROOT, 'apps/web/public/samples/sample-parent-answer.pdf')

describe('Public Samples Regression Lock', () => {
  it('locks the public Student PDF to the real Week 3 spatial-audio production artifact', async () => {
    const studentBuffer = await readFile(STUDENT_SAMPLE_PATH)
    const inspection = await inspectPdf(studentBuffer, 'sample-student')

    const normalizedText = inspection.text.replace(/\s+/g, ' ')
    const compactText = inspection.text.replace(/\s+/gu, '')
    expect(inspection.pageCount).toBe(10)
    expect(normalizedText).toContain('How Does a Game Place Sound Around You?')
    expect(normalizedText).toContain('Spatial audio')
    expect(normalizedText).toContain('distance')
    expect(normalizedText).toContain('direction')
    expect(normalizedText).toContain('obstruction')
    expect(compactText).toContain('預計94分鐘')
    expect(compactText).toContain('第3週')

    // Ensure superseded public samples never leak back into the current download.
    expect(normalizedText).not.toContain('The Signal Door Test')
    expect(normalizedText).not.toContain('The Rooftop Garden Challenge')
    expect(normalizedText).not.toContain('Two Places, One Question')
  })

  it('locks the public Parent Answer PDF to the matching Week 3 production artifact', async () => {
    const parentBuffer = await readFile(PARENT_SAMPLE_PATH)
    const inspection = await inspectPdf(parentBuffer, 'sample-parent-answer')

    const compactText = inspection.text.replace(/\s+/gu, '')
    expect(inspection.pageCount).toBe(4)
    expect(inspection.text).toContain('How Does a Game Place Sound Around You?')
    expect(inspection.text).toContain('Apple Developer Documentation')
    expect(inspection.text).toContain('Roblox Creator Hub')
    expect(inspection.text).toContain('Meta Horizon OS Developers')
    expect(compactText).toContain('預計94分鐘')
    expect(compactText).toContain('預計總時間:94分鐘')
    expect(compactText).toContain('10個核心字')
    expect(compactText).toContain('三關係organizer')
    expect(compactText).toContain('三題分日作業')

    expect(inspection.text).not.toContain('The Signal Door Test')
    expect(inspection.text).not.toContain('The Rooftop Garden Challenge')
    expect(inspection.text).not.toContain('Two Places, One Question')
  })
})
