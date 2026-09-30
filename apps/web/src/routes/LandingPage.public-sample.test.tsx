import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LandingPage } from './LandingPage'
import { SamplePage } from './SamplePage'
import { getDemoResults } from '../content/public-demo'

describe('Public interactive sample', () => {
  it('labels synthetic content and links into an anonymous interactive experience', () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain('公開合成範例')
    expect(html).toContain('href="/sample"')
    expect(html).toContain('/samples/demo-student.pdf')
    expect(html).not.toContain('真實第 3 週範例')
  })
  it('does not render sample answer keys before submission and explains isolation', () => {
    const html = renderToStaticMarkup(<SamplePage />)
    expect(html).toContain('不會送到伺服器')
    expect(html).toContain('不是為你的孩子生成')
    expect(html).not.toContain('B. To study how sunlight changes plant growth.')
    expect(html).not.toContain('參考答案：')
    expect(html).toContain('提交整份範例')
    expect(html).toContain('/samples/demo-student.pdf')
  })
  it('distinguishes correct, incorrect, open and unanswered without grading open responses', () => {
    const results = getDemoResults({ R1: 'B', R2: 'Same water.', R4: 'C', G1: ' ' })
    expect(results.find((item) => item.questionId === 'R1')?.status).toBe('correct')
    expect(results.find((item) => item.questionId === 'R2')?.status).toBe('open_review')
    expect(results.find((item) => item.questionId === 'R4')?.status).toBe('incorrect')
    expect(results.find((item) => item.questionId === 'G1')?.status).toBe('unanswered')
  })
})
