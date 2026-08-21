import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { inspectPdf } from './inspect-pdf.js'

const REPO_ROOT = resolve(import.meta.dirname, '../../..')
const STUDENT_SAMPLE_PATH = resolve(REPO_ROOT, 'apps/web/public/samples/sample-student.pdf')
const PARENT_SAMPLE_PATH = resolve(REPO_ROOT, 'apps/web/public/samples/sample-parent-answer.pdf')

describe('Public Samples Regression Lock', () => {
  it('locks the public Student PDF to the production The Signal Door Test artifact', async () => {
    const studentBuffer = await readFile(STUDENT_SAMPLE_PATH)
    const inspection = await inspectPdf(studentBuffer, 'sample-student')

    const normalizedText = inspection.text.replace(/\s+/g, ' ')
    const compactText = inspection.text.replace(/\s+/gu, '')
    expect(inspection.pageCount).toBe(11)
    expect(normalizedText).toContain('The Signal Door Test')
    expect(normalizedText).toContain('block-building game')
    expect(normalizedText).toContain('am / is / are')
    expect(compactText).toContain('預計66分鐘')
    expect(compactText).not.toContain('78分鐘')
    
    // Ensure legacy / synthetic rooftop garden material never leaks into public samples
    expect(normalizedText).not.toContain('The Rooftop Garden Challenge')
    expect(normalizedText).not.toContain('Two Places, One Question')
    expect(normalizedText).not.toContain('rooftop garden project')
  })

  it('locks the public Parent Answer PDF to the matching production artifact', async () => {
    const parentBuffer = await readFile(PARENT_SAMPLE_PATH)
    const inspection = await inspectPdf(parentBuffer, 'sample-parent-answer')

    expect(inspection.pageCount).toBe(4)
    expect(inspection.text).toContain('The Signal Door Test')
    expect(inspection.text).toContain('家')
    const compactText = inspection.text.replace(/\s+/gu, '')
    expect(compactText).toContain('預計66分鐘')
    expect(compactText).toContain('預計總時間:66分鐘')
    expect(compactText).toContain('完成閱讀、10個核心字、三組教學、16題跨階段練習與隔天作業即可')
    expect(compactText).not.toContain('78分鐘')

    // Ensure legacy rooftop garden material never leaks into parent answer sample
    expect(inspection.text).not.toContain('The Rooftop Garden Challenge')
    expect(inspection.text).not.toContain('Two Places, One Question')
  })
})
